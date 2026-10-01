import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({ db: { query: vi.fn() } }));
import { db } from '@/lib/db';
import { POST } from './route';

const request = (body: unknown, cookie: string | null = 'session=abc') =>
  new NextRequest('http://localhost/api/tasks/bulk-complete', {
    method: 'POST',
    headers: cookie ? { cookie } : {},
    body: JSON.stringify(body),
  });
const sessionUser = { id: 'u1', email: 'a@example.com' };
const signedIn = () => vi.mocked(db.query).mockResolvedValueOnce([sessionUser]);

describe('POST /api/tasks/bulk-complete', () => {
  beforeEach(() => vi.mocked(db.query).mockReset());

  it('rejects a request without a session', async () => {
    const res = await POST(request({ ids: ['t1'] }, null), undefined);
    expect(res.status).toBe(401);
  });

  it('rejects an empty list', async () => {
    signedIn();
    expect((await POST(request({ ids: [] }), undefined)).status).toBe(400);
  });

  it('rejects more than 500 ids', async () => {
    signedIn();
    const ids = Array.from({ length: 501 }, (_, i) => `t${i}`);
    expect((await POST(request({ ids }), undefined)).status).toBe(400);
  });

  it('completes one task', async () => {
    signedIn().mockResolvedValueOnce([{ id: 't1' }]);
    const res = await POST(request({ ids: ['t1'] }), undefined);
    expect(await res.json()).toEqual({ completed: 1 });
  });

  it('completes a full batch with a single query', async () => {
    const ids = Array.from({ length: 500 }, (_, i) => `t${i}`);
    signedIn().mockResolvedValueOnce(ids.map((id) => ({ id })));
    const res = await POST(request({ ids }), undefined);
    expect(await res.json()).toEqual({ completed: 500 });
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  it('counts only the tasks the user owns', async () => {
    signedIn().mockResolvedValueOnce([{ id: 't1' }]);
    const res = await POST(request({ ids: ['t1', 'someone-elses'] }), undefined);
    expect(await res.json()).toEqual({ completed: 1 });
  });
});
