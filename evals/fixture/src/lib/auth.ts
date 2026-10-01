import { NextRequest, NextResponse } from 'next/server';
import { db } from './db';
import { logger } from './logger';

export type SessionUser = { id: string; email: string };
type Handler<C> = (req: NextRequest, user: SessionUser, ctx: C) => Promise<Response>;

async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get('session')?.value;
  if (!token) return null;
  const rows = await db.query<SessionUser>(
    'SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1 AND s.expires_at > now()',
    [token],
  );
  return rows[0] ?? null;
}

export function withAuth<C = unknown>(handler: Handler<C>) {
  return async (req: NextRequest, ctx: C) => {
    const user = await getSessionUser(req);
    if (!user) {
      logger.warn('rejected unauthenticated request', { path: req.nextUrl.pathname });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(req, user, ctx);
  };
}
