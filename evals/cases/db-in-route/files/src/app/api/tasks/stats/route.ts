import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export const GET = withAuth(async (_req, user) => {
  const rows = await db.query<{ done: boolean; count: string }>(
    'SELECT done, count(*) AS count FROM tasks WHERE owner_id = $1 GROUP BY done',
    [user.id],
  );
  const done = Number(rows.find((r) => r.done)?.count ?? 0);
  const open = Number(rows.find((r) => !r.done)?.count ?? 0);
  return NextResponse.json({ done, open });
});
