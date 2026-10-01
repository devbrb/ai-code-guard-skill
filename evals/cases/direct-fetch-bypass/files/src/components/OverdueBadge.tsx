'use client';

import { useEffect, useState } from 'react';

export function OverdueBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch('/api/tasks?page=1')
      .then((res) => res.json())
      .then(({ tasks }) => {
        const now = Date.now();
        setCount(
          tasks.filter((t: any) => !t.done && t.due_date && new Date(t.due_date).getTime() < now).length,
        );
      });
  }, []);

  if (count === 0) return null;
  return <span className="badge">{count} overdue</span>;
}
