import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { taskRepository } from '@/repositories/taskRepository';
import { userRepository } from '@/repositories/userRepository';

export const GET = withAuth(async (_req, user) => {
  const [nextTasks, me] = await Promise.all([
    taskRepository.listByUser(user.id, 5, 0),
    userRepository.findById(user.id),
  ]);
  return NextResponse.json({ name: me?.name ?? null, nextTasks });
});
