# Task Manager

A production-quality **Task Manager** built with **React Native + Expo SDK 54**. Create, edit,
delete, complete, search, and filter tasks — all persisted locally on device.

Built to demonstrate modern React Native architecture: Expo-first APIs, Zustand state with
selective subscriptions, FlashList rendering, Reanimated v4 motion, and a fully typed,
validated form flow.

---

## Features

- **CRUD tasks** — create, edit, delete, and toggle completed.
- **Search** by title (debounced).
- **Filter** by All / Completed (segmented control).
- **Local persistence** via Zustand `persist` + AsyncStorage — survives app restarts.
- **Swipe-to-delete** rows with a confirming haptic and `FadeOutLeft` exit.
- **Keyboard-aware form** — fields stay visible above the keyboard while editing.
- **System light/dark theme** that follows the device color scheme.
- **Hydration / empty / no-results states** with clear feedback.
- **Subtle motion** — `FadeInDown` list entry, `withSpring` completion pop, `withTiming` FAB press.

---

## Tech Stack

| Concern      | Choice                                                                             |
| ------------ | ---------------------------------------------------------------------------------- |
| Framework    | Expo SDK 54 (`expo ~54`), React Native 0.81, React 19                              |
| Language     | TypeScript (strict, zero `any`)                                                    |
| State        | Zustand v5 + `persist` middleware                                                  |
| Storage      | `@react-native-async-storage/async-storage`                                        |
| Navigation   | React Navigation v7 (`@react-navigation/native-stack`) — **no Expo Router**        |
| Lists        | `@shopify/flash-list` **v2**                                                       |
| Animation    | React Native Reanimated v4 (+ `react-native-worklets`)                             |
| Gestures     | `react-native-gesture-handler` (`ReanimatedSwipeable`)                             |
| Forms        | React Hook Form + Zod (`@hookform/resolvers`)                                      |
| Keyboard     | `react-native-keyboard-controller` (`KeyboardProvider`, `KeyboardAwareScrollView`) |
| Icons        | `@expo/vector-icons` (Ionicons)                                                    |
| Expo modules | `expo-haptics`, `expo-status-bar`, `expo-crypto`, `expo-splash-screen`, `react-native-safe-area-context` |
| Testing      | Vitest                                                                              |

---

## Architecture

Layered and modular under `src/`, each layer with a single responsibility:

```
src/
├── App.tsx              # Providers: GestureHandlerRoot → KeyboardProvider → SafeArea → NavigationContainer (themed)
├── types/               # Task, TaskStatus, TaskFilter, navigation param types
├── constants/           # storage key, filter options, limits, debounce
├── theme/               # light/dark palettes + spacing/radius/typography tokens
├── services/            # AsyncStorage adapter for the store
├── store/               # Zustand store (persist) + atomic selector hooks
├── hooks/               # useDebounce, useFilteredTasks (useMemo), useAppTheme
├── utils/               # createId (expo-crypto randomUUID), formatDate
├── navigation/          # native-stack: Home, TaskForm
├── components/          # TaskCard, SearchBar, StatusFilter, EmptyState, FloatingActionButton, Header
└── screens/             # HomeScreen (list), TaskFormScreen (create/edit)
```

The app entry is `index.ts` (root) → `registerRootComponent(App)`.

**Data flow:** `store` (single source of truth) → `hooks` (derive/debounce/memoize) → `screens`
(orchestrate) → `components` (presentational, `React.memo`). No business logic in JSX; no
duplicated logic across screens.

### State management

A single Zustand store holds `tasks` plus `addTask` / `updateTask` / `deleteTask` /
`toggleTaskStatus`. The `persist` middleware serializes the list to AsyncStorage; an
`onRehydrateStorage` callback flips a `_hasHydrated` flag that gates the loading UI. Components
never subscribe to the whole store — they use **atomic selector hooks** (`useTasks`,
`useAddTask`, …) so a change to one slice doesn't re-render unrelated consumers.

### Navigation

A typed native-stack with two routes: `Home` and `TaskForm` (`{ taskId?: string }` — absent =
create, present = edit). `NavigationContainer` is themed from the active app theme, so headers
follow light/dark automatically. Global `ReactNavigation.RootParamList` augmentation gives
type-safe `navigate()` everywhere.

### Performance

- `useMemo` for the derived/filtered/searched list (`useFilteredTasks`).
- `useCallback` for `renderItem`, `keyExtractor`, list handlers, and navigation callbacks.
- `React.memo` on `TaskCard`, `SearchBar`, `StatusFilter` (+ EmptyState/FAB).
- **Debounced** search input so filtering doesn't run on every keystroke.
- **FlashList v2** with a memoized `renderItem` and a stable `keyExtractor` (see note below).
- React Compiler is enabled (`app.json` → `experiments.reactCompiler`) as an extra safety net on
  top of the manual memoization.

> **FlashList v2 note.** This app uses FlashList **v2** (shipped with SDK 54), which removed the
> `estimatedItemSize` prop — sizing is now automatic. v2 instead emphasises memoizing the props
> passed to the list, which this code does. (The older `estimatedItemSize` API is v1 only.)

### Expo-first choices

Per the brief, Expo modules are preferred over bare RN equivalents: `expo-haptics` for tactile
feedback, `expo-status-bar` for the status bar, `expo-crypto` (`randomUUID`) for task ids,
`react-native-safe-area-context` for safe layout, and `npx expo install` for every native dep so
versions match the SDK.

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- The **Expo Go** app on a physical device, or an Android emulator / iOS simulator

### Install

```bash
npm install
```

### Run

```bash
npm start          # Expo dev server + QR code
# or target a platform directly:
npm run android
npm run ios
npm run web
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS), or press `a` / `i` / `w` in the
terminal.

> This project relies on Reanimated v4 + FlashList v2, both of which require the **New
> Architecture** — already enabled via `newArchEnabled: true` in `app.json`.

### Quality checks

```bash
npm run lint                          # ESLint (eslint-config-expo)
npx tsc --noEmit                      # TypeScript, strict
npm test                              # Vitest unit tests
npx expo export --platform android    # full JS bundle smoke test
```

### Tests

Unit tests run on **Vitest** (`npm test`, or `npm run test:watch` for watch mode). Coverage targets
the pure logic that doesn't need a native runtime — the Zustand store reducers
(`src/store/taskStore.test.ts`) and the date formatter (`src/utils/date.test.ts`).

---

## Project Scripts

| Script            | Action                    |
| ----------------- | ------------------------- |
| `npm start`       | Start the Expo dev server |
| `npm run android` | Open on Android           |
| `npm run ios`     | Open on iOS               |
| `npm run web`     | Open in the browser       |
| `npm run lint`    | Lint the project          |
| `npm test`        | Run unit tests (Vitest)   |
| `npm run test:watch` | Run tests in watch mode |
