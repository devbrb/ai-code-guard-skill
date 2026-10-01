import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { taskRepository } from '@/repositories/taskRepository';

export const GET = withAuth(async (_req, user) => {
  const tasks = await taskRepository.listOverdue(user.id, 50);
  return NextResponse.json({ tasks });
});
