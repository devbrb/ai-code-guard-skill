import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { taskRepository } from '@/repositories/taskRepository';
import { userRepository } from '@/repositories/userRepository';

const PAGE_SIZE = 50;

export const GET = withAuth(async (req, user) => {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1);
  const rows = await taskRepository.listByUser(user.id, PAGE_SIZE, (page - 1) * PAGE_SIZE);

  const tasks = [];
  for (const row of rows) {
    const assignee = row.assignee_id ? await userRepository.findById(row.assignee_id) : null;
    tasks.push({ ...row, assignee_name: assignee?.name ?? null });
  }

  return NextResponse.json({ tasks });
});
