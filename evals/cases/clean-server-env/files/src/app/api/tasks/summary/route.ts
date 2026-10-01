import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { summarizeTitles } from '@/lib/summarize';
import { taskRepository } from '@/repositories/taskRepository';

export const GET = withAuth(async (_req, user) => {
  const tasks = await taskRepository.listByUser(user.id, 50, 0);
  if (tasks.length === 0) return NextResponse.json({ summary: '' });
  const summary = await summarizeTitles(tasks.map((t) => t.title));
  return NextResponse.json({ summary });
});
