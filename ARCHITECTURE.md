# Architecture

This document describes how the Task Manager app is structured and why. It complements the
high-level summary in [README.md](README.md) with the layer responsibilities, data flow, and key
design decisions.

## Goals

- **Single source of truth** for task data, persisted across app restarts.
- **Strict separation of concerns** — each `src/` layer has one job and depends only downward.
- **Predictable re-renders** — components subscribe to the smallest slice of state they need.
- **Expo-first** — prefer Expo modules over bare React Native equivalents.

## Layered structure

```
src/
├── App.tsx          Provider tree + themed NavigationContainer
├── types/           Domain + navigation types (no runtime code)
├── constants/       Storage key, store version, filter options, limits, debounce
├── theme/           Light/dark palettes + spacing/radius/typography tokens
├── services/        AsyncStorage adapter (the only device-I/O owner)
├── store/           Zustand store (persist) + atomic selector hooks
├── hooks/           useDebounce, useFilteredTasks, useAppTheme
├── utils/           createId (expo-crypto), formatDate
├── navigation/      Native-stack navigator: Home, TaskForm
├── components/      Presentational, React.memo'd UI
└── screens/         HomeScreen (list), TaskFormScreen (create/edit)
```

**Entry point:** root `index.ts` → `registerRootComponent(App)`.

### Dependency direction

Layers depend strictly downward. UI never reaches around the store to touch storage; the store
never imports a screen.

```
screens ──▶ hooks ──▶ store ──▶ services ──▶ AsyncStorage
   │          │         │
   └──▶ components      └──▶ types / constants / utils
```

## Data flow

```
AsyncStorage ──hydrate──▶ store (tasks) ──selector──▶ hooks (derive) ──▶ screens ──▶ components
     ▲                       │
     └──── persist ──────────┘   (every mutation re-serializes the task list)
```

- **store** is the single source of truth — holds `tasks` and the mutators.
- **hooks** derive view state (debounced query, memoized filtered list) — no mutation.
- **screens** orchestrate: wire selectors + hooks together, own local UI state.
- **components** are presentational and `React.memo`'d — receive data + callbacks via props.

No business logic lives in JSX; no logic is duplicated across screens.

## State management (Zustand + persist)

Defined in [src/store/taskStore.ts](src/store/taskStore.ts). A single store holds:

- `tasks: Task[]`
- `_hasHydrated: boolean` — runtime-only flag gating the loading UI
- mutators: `addTask`, `updateTask`, `deleteTask`, `toggleTaskComplete`

Mutators are pure reducers over the previous state (`set((state) => …)`). New tasks are prepended;
`title`/`description` are trimmed at the store boundary so the UI never persists stray whitespace.

### Persistence

The `persist` middleware wraps the store:

- `storage` → `createJSONStorage(() => asyncStorageAdapter)` — JSON (de)serialization lives in the
  middleware; [src/services/storage.ts](src/services/storage.ts) stays the single owner of raw
  device I/O.
- `partialize` → only `tasks` is written; `_hasHydrated` is never persisted.
- `onRehydrateStorage` → flips `_hasHydrated` true once disk state is read back. The Home screen
  shows a spinner until then, avoiding an empty-state flash on cold start.
- `version` + `migrate` → schema is versioned (`STORE_VERSION = 2`). The migration maps legacy
  `status: 'completed'` tasks onto the current `completed: boolean` shape.

### Atomic selectors

Components never subscribe to the whole store. Each slice has its own hook
(`useTasks`, `useHasHydrated`, `useTaskById`, `useAddTask`, …), so a change to one slice does not
re-render unrelated consumers.

## Navigation

Typed native-stack ([src/navigation/AppNavigator.tsx](src/navigation/AppNavigator.tsx)) with two
routes:

| Route      | Purpose                                          | Params              |
| ---------- | ------------------------------------------------ | ------------------- |
| `Home`     | Task list                                        | —                   |
| `TaskForm` | Create (no `taskId`) or edit (`taskId` present)  | `{ taskId?: string; origin? }` |

`TaskForm` is presented as a `transparentModal` (no header, no gesture, no animation) so the form
overlays the list. `NavigationContainer` is themed from the active app theme so headers follow
light/dark automatically. The global `RootStackParamList` augmentation gives type-safe `navigate()`
everywhere.

## Provider tree

From [src/App.tsx](src/App.tsx), outermost → innermost:

```
GestureHandlerRootView      (gesture system root — required by swipeable rows)
└─ KeyboardProvider         (keyboard-controller; keyboard-aware form)
   └─ SafeAreaProvider      (notch / home-indicator insets)
      └─ NavigationContainer (themed light/dark)
         └─ AppNavigator
      + StatusBar           (sibling, style follows theme)
```

## Performance

- **`useMemo`** for the derived filtered/searched list
  ([src/hooks/useFilteredTasks.ts](src/hooks/useFilteredTasks.ts)) — recomputes only when `tasks`,
  `query`, or `filter` change.
- **`useDebounce`** on the search input (`SEARCH_DEBOUNCE_MS = 250`) so filtering doesn't run per
  keystroke.
- **`useCallback`** for `renderItem`, `keyExtractor`, and list/navigation handlers.
- **`React.memo`** on presentational components (`TaskCard`, `SearchBar`, `StatusFilter`, …).
- **FlashList v2** for the list. v2 (SDK 54) dropped `estimatedItemSize` — sizing is automatic — and
  instead rewards memoizing the props passed to the list, which this code does.
- **React Compiler** enabled (`app.json` → `experiments.reactCompiler`) as a safety net on top of
  the manual memoization.

## Theming

[src/theme/](src/theme/) holds light/dark palettes plus spacing/radius/typography tokens.
`useAppTheme` resolves the active theme from the device color scheme; both the app UI and the
`NavigationContainer` consume it, so the whole surface follows system light/dark with no manual
toggle.

## Domain model

From [src/types/task.ts](src/types/task.ts):

```ts
interface Task {
  id: string;          // expo-crypto randomUUID
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
}
```

`CreateTaskInput` = `{ title; description? }`; `UpdateTaskInput` = `Partial<Pick<Task, 'title' |
'description'>>`. Form input is validated with React Hook Form + Zod against the
`TASK_TITLE_MAX` / `TASK_DESCRIPTION_MAX` limits in [src/constants/](src/constants/index.ts) before
it reaches a mutator.

## Testing

Vitest covers the pure logic that needs no native runtime:

- store reducers — [src/store/taskStore.test.ts](src/store/taskStore.test.ts)
- date formatting — [src/utils/date.test.ts](src/utils/date.test.ts)

Native-dependent UI is verified manually (lint + `tsc --noEmit` + `expo export` smoke test); see
the README quality-checks section.

## Key decisions

| Decision                              | Why                                                                 |
| ------------------------------------- | ------------------------------------------------------------------- |
| Zustand over Context/Redux            | Minimal boilerplate, selector-level subscriptions, built-in persist |
| React Navigation, **not** Expo Router | Explicit typed stack; no file-system routing needed for 2 screens   |
| Storage behind a service adapter      | One owner of device I/O; store stays testable and serializer-agnostic |
| Versioned persist schema + migrate    | Safe to evolve the `Task` shape without dropping existing data       |
| Atomic selector hooks                 | Avoid whole-store subscriptions and unrelated re-renders            |
| Expo modules first                    | SDK-matched native deps via `expo install`; less version drift      |
```