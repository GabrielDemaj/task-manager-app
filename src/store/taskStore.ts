import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { STORAGE_KEY, STORE_VERSION } from "@/constants";
import { asyncStorageAdapter } from "@/services/storage";
import type { CreateTaskInput, Task, UpdateTaskInput } from "@/types/task";
import { createId } from "@/utils/id";

interface TaskState {
  tasks: Task[];
  /** False until persisted state has been read back from AsyncStorage. */
  _hasHydrated: boolean;
  addTask: (input: CreateTaskInput) => void;
  updateTask: (id: string, input: UpdateTaskInput) => void;
  deleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      _hasHydrated: false,

      addTask: ({ title, description }) =>
        set((state) => {
          const now = new Date().toISOString();
          const task: Task = {
            id: createId(),
            title: title.trim(),
            description: description?.trim() || undefined,
            completed: false,
            createdAt: now,
            updatedAt: now,
          };
          return { tasks: [task, ...state.tasks] };
        }),

      updateTask: (id, input) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  title:
                    input.title !== undefined ? input.title.trim() : task.title,
                  description:
                    input.description !== undefined
                      ? input.description.trim() || undefined
                      : task.description,
                  updatedAt: new Date().toISOString(),
                }
              : task,
          ),
        })),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        })),

      toggleTaskComplete: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  completed: !task.completed,
                  updatedAt: new Date().toISOString(),
                }
              : task,
          ),
        })),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => asyncStorageAdapter),
      // Only the task list is persisted; the hydration flag is runtime-only.
      partialize: (state) => ({ tasks: state.tasks }),
      // `completed` boolean. Map any legacy persisted tasks onto the new shape.
      migrate: (persisted, version) => {
        if (version < 2 && persisted && typeof persisted === "object") {
          const legacy = persisted as { tasks?: { status?: string }[] };
          return {
            tasks: (legacy.tasks ?? []).map(({ status, ...rest }) => ({
              ...rest,
              completed: status === "completed",
            })),
          } as { tasks: Task[] };
        }
        return persisted as { tasks: Task[] };
      },
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

/* -------------------------------------------------------------------------- */
/* Atomic selectors — subscribe to the smallest slice to avoid over-rendering */
/* -------------------------------------------------------------------------- */

export const useTasks = () => useTaskStore((state) => state.tasks);
export const useHasHydrated = () => useTaskStore((state) => state._hasHydrated);
export const useTaskById = (id?: string) =>
  useTaskStore((state) =>
    id ? state.tasks.find((task) => task.id === id) : undefined,
  );

export const useAddTask = () => useTaskStore((state) => state.addTask);
export const useUpdateTask = () => useTaskStore((state) => state.updateTask);
export const useDeleteTask = () => useTaskStore((state) => state.deleteTask);
export const useToggleTaskComplete = () =>
  useTaskStore((state) => state.toggleTaskComplete);
