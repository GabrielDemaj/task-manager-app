import type { TaskFilter } from '@/types/task';

/** AsyncStorage key for the persisted Zustand store. */
export const STORAGE_KEY = 'task-manager/tasks';

/** Persist schema version — bump to trigger migrations if the shape changes. */
export const STORE_VERSION = 2;

export const FILTER_OPTIONS: { label: string; value: TaskFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Completed', value: 'completed' },
];

/** Debounce applied to the search input before filtering runs. */
export const SEARCH_DEBOUNCE_MS = 250;

export const TASK_TITLE_MAX = 100;
export const TASK_DESCRIPTION_MAX = 500;
