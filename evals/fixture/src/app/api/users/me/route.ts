import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { userRepository } from '@/repositories/userRepository';

export const GET = withAuth(async (_req, user) => {
  const me = await userRepository.findById(user.id);
  if (!me) {
    logger.warn('session refers to a missing user', { userId: user.id });
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ user: me });
});
