import { NextRequest, NextResponse } from 'next/server';
import { taskRepository } from '@/repositories/taskRepository';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const removed = await taskRepository.remove(id);
  if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
