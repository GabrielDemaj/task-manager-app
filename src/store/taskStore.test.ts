import { beforeEach, describe, expect, it, vi } from "vitest";

// createId() -> Crypto.randomUUID(); hand out deterministic, unique ids.
let idCounter = 0;
vi.mock("expo-crypto", () => ({
  randomUUID: () => `id-${++idCounter}`,
}));

// Stub the native AsyncStorage so the persist middleware has somewhere to write.
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve()),
  },
}));

import { useTaskStore } from "@/store/taskStore";

const { getState, setState } = useTaskStore;

beforeEach(() => {
  idCounter = 0;
  setState({ tasks: [] });
});

describe("taskStore", () => {
  describe("addTask", () => {
    it("creates a task with a generated id, completed=false and timestamps", () => {
      getState().addTask({ title: "Buy milk" });

      const [task] = getState().tasks;
      expect(task.id).toBe("id-1");
      expect(task.title).toBe("Buy milk");
      expect(task.completed).toBe(false);
      expect(task.createdAt).toBe(task.updatedAt);
      expect(() => new Date(task.createdAt).toISOString()).not.toThrow();
    });

    it("trims the title and an optional description", () => {
      getState().addTask({ title: "  spaced  ", description: "  note  " });

      const [task] = getState().tasks;
      expect(task.title).toBe("spaced");
      expect(task.description).toBe("note");
    });

    it("treats a blank/whitespace description as undefined", () => {
      getState().addTask({ title: "x", description: "   " });

      expect(getState().tasks[0].description).toBeUndefined();
    });

    it("prepends new tasks so the newest is first", () => {
      getState().addTask({ title: "first" });
      getState().addTask({ title: "second" });

      expect(getState().tasks.map((t) => t.title)).toEqual(["second", "first"]);
    });
  });

  describe("updateTask", () => {
    it("updates the title and description of the matching task only", () => {
      getState().addTask({ title: "keep" });
      getState().addTask({ title: "edit me" });
      const target = getState().tasks.find((t) => t.title === "edit me")!;

      getState().updateTask(target.id, { title: "  edited  ", description: " d " });

      const updated = getState().tasks.find((t) => t.id === target.id)!;
      expect(updated.title).toBe("edited");
      expect(updated.description).toBe("d");
      expect(getState().tasks.some((t) => t.title === "keep")).toBe(true);
    });

    it("leaves fields untouched when not provided", () => {
      getState().addTask({ title: "orig", description: "desc" });
      const { id } = getState().tasks[0];

      getState().updateTask(id, { title: "new title" });

      const task = getState().tasks[0];
      expect(task.title).toBe("new title");
      expect(task.description).toBe("desc");
    });

    it("is a no-op for an unknown id", () => {
      getState().addTask({ title: "a" });
      const before = getState().tasks;

      getState().updateTask("missing", { title: "z" });

      expect(getState().tasks).toEqual(before);
    });
  });

  describe("deleteTask", () => {
    it("removes only the task with the matching id", () => {
      getState().addTask({ title: "a" });
      getState().addTask({ title: "b" });
      const toDelete = getState().tasks.find((t) => t.title === "a")!;

      getState().deleteTask(toDelete.id);

      expect(getState().tasks.map((t) => t.title)).toEqual(["b"]);
    });
  });

  describe("toggleTaskComplete", () => {
    it("flips the completed flag", () => {
      getState().addTask({ title: "a" });
      const { id } = getState().tasks[0];

      getState().toggleTaskComplete(id);
      expect(getState().tasks[0].completed).toBe(true);

      getState().toggleTaskComplete(id);
      expect(getState().tasks[0].completed).toBe(false);
    });
  });
});
