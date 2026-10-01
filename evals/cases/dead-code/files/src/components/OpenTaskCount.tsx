'use client';

import { useTasks } from '@/hooks/useTasks';
import { formatCount } from '@/lib/format';
import type { Task } from '@/types';

function groupByAssignee(tasks: Task[]): Map<string, Task[]> {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = task.assigneeId ?? 'unassigned';
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  return groups;
}

export function OpenTaskCount() {
  const { data: tasks = [] } = useTasks();
  const open = tasks.filter((t) => !t.done).length;
  return <p>{formatCount(open, 'open task')}</p>;
}
