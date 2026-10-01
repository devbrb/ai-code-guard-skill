'use client';

import { useTasks } from '@/hooks/useTasks';
import { formatCount } from '@/lib/format';

export function TaskProgress() {
  const { data: tasks = [] } = useTasks();
  if (tasks.length === 0) return null;

  const done = tasks.filter((t) => t.done).length;
  return (
    <p>
      {done} of {formatCount(tasks.length, 'task')} done
      <progress value={done} max={tasks.length} />
    </p>
  );
}
