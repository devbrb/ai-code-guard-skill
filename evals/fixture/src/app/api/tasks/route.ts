import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { taskRepository } from '@/repositories/taskRepository';

const PAGE_SIZE = 50;

export const GET = withAuth(async (req, user) => {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1);
  const tasks = await taskRepository.listByUser(user.id, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  return NextResponse.json({ tasks });
});
