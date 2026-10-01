'use client';

import { useCompleteTask, useTasks } from '@/hooks/useTasks';
import { formatDate } from '@/lib/format';

export function TaskList() {
  const { data: tasks = [], isLoading } = useTasks();
  const completeTask = useCompleteTask();

  if (isLoading) return <p>Loading tasks…</p>;

  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          <input
            type="checkbox"
            checked={task.done}
            disabled={task.done}
            onChange={() => completeTask.mutate(task.id)}
            aria-label={`Complete ${task.title}`}
          />
          {task.title}
          {task.dueDate && <time> · due {formatDate(task.dueDate)}</time>}
        </li>
      ))}
    </ul>
  );
}
