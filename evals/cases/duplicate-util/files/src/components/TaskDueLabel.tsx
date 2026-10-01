import type { Task } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDueDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function TaskDueLabel({ task }: { task: Task }) {
  if (!task.dueDate) return <span>No due date</span>;
  const overdue = !task.done && task.dueDate.getTime() < Date.now();
  return <time className={overdue ? 'overdue' : undefined}>Due {formatDueDate(task.dueDate)}</time>;
}
