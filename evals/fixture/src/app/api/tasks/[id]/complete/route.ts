import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { taskRepository } from '@/repositories/taskRepository';

type Ctx = { params: Promise<{ id: string }> };

export const POST = withAuth<Ctx>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  const task = await taskRepository.markComplete(id, user.id);
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ task });
});
