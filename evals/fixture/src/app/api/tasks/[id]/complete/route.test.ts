import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({ db: { query: vi.fn() } }));
import { db } from '@/lib/db';
import { POST } from './route';

const ctx = { params: Promise.resolve({ id: 't1' }) };
const request = (cookie?: string) =>
  new NextRequest('http://localhost/api/tasks/t1/complete', {
    method: 'POST',
    headers: cookie ? { cookie } : {},
  });
const sessionUser = { id: 'u1', email: 'a@example.com' };
const taskRow = { id: 't1', title: 'Write report', done: true, due_date: null, assignee_id: null };

describe('POST /api/tasks/:id/complete', () => {
  beforeEach(() => vi.mocked(db.query).mockReset());

  it('rejects a request without a session', async () => {
    const res = await POST(request(), ctx);
    expect(res.status).toBe(401);
  });

  it('completes a task the user owns', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([sessionUser]).mockResolvedValueOnce([taskRow]);
    const res = await POST(request('session=abc'), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ task: taskRow });
  });

  it('returns 404 for a task the user does not own', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([sessionUser]).mockResolvedValueOnce([]);
    const res = await POST(request('session=abc'), ctx);
    expect(res.status).toBe(404);
  });
});
