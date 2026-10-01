import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { taskRepository } from '@/repositories/taskRepository';

const MAX_IDS = 500;

export const POST = withAuth(async (req, user) => {
  const body = await req.json().catch(() => null);
  const ids: unknown = body?.ids;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAX_IDS ||
    !ids.every((id) => typeof id === 'string')
  ) {
    return NextResponse.json({ error: `ids must be 1 to ${MAX_IDS} task ids` }, { status: 400 });
  }
  const deleted = await taskRepository.removeMany(ids, user.id);
  return NextResponse.json({ deleted });
});
