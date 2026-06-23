import { useMemo } from 'react';

import type { Task, TaskFilter } from '@/types/task';

/**
 * Derives the visible task list from the raw store list, the (debounced) search
 * query and the active status filter. Memoized so the heavy filter only re-runs
 * when one of its inputs actually changes.
 */
export function useFilteredTasks(tasks: Task[], query: string, filter: TaskFilter): Task[] {
  return useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesStatus = filter === 'all' || task.completed;
      if (!matchesStatus) return false;
      if (!normalized) return true;
      return task.title.toLowerCase().includes(normalized);
    });
  }, [tasks, query, filter]);
}
