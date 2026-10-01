import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { taskRepository } from '@/repositories/taskRepository';

const EXPORT_LIMIT = 1000;

const cell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export const GET = withAuth(async (_req, user) => {
  console.log('exporting tasks for user', user.id);
  try {
    const tasks = await taskRepository.listByUser(user.id, EXPORT_LIMIT, 0);
    const lines = tasks.map((t) => [t.id, t.title, t.done, t.due_date].map(cell).join(','));
    const csv = ['id,title,done,due_date', ...lines].join('\n');
    console.log(`exported ${tasks.length} tasks`);
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv' } });
  } catch (err) {
    console.error('task export failed', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
});
