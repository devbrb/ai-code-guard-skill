'use client';

import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';

export function TaskSummary() {
  const { data: tasks = [] } = useTasks();
  const [summary, setSummary] = useState('');

  async function summarize() {
    const titles = tasks.map((t) => t.title).join(', ');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: `Summarise these tasks in one sentence: ${titles}` }],
      }),
    });
    const data = await res.json();
    setSummary(data.choices[0].message.content);
  }

  return (
    <section>
      <button onClick={summarize}>Summarise my tasks</button>
      {summary && <p>{summary}</p>}
    </section>
  );
}
