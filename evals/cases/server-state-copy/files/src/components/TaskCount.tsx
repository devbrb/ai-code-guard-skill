'use client';

import { useEffect, useState } from 'react';
import { formatCount } from '@/lib/format';
import { taskService } from '@/services/taskService';
import type { Task } from '@/types';

export function TaskCount() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    taskService.list(1).then(setTasks);
  }, []);

  const open = tasks.filter((t) => !t.done).length;
  return <p>{formatCount(open, 'open task')}</p>;
}
