export type TaskFilter = 'all' | 'completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payload accepted when creating a task. */
export interface CreateTaskInput {
  title: string;
  description?: string;
}

/** Fields that can be edited on an existing task. */
export type UpdateTaskInput = Partial<Pick<Task, 'title' | 'description'>>;
