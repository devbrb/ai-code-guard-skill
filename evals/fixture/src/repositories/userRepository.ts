import { db } from '@/lib/db';

export type UserRow = { id: string; email: string; name: string };

export const userRepository = {
  async findById(id: string) {
    const rows = await db.query<UserRow>('SELECT id, email, name FROM users WHERE id = $1', [id]);
    return rows[0] ?? null;
  },

  findByIds(ids: string[]) {
    return db.query<UserRow>('SELECT id, email, name FROM users WHERE id = ANY($1)', [ids]);
  },
};
