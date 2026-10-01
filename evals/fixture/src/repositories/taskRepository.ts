import { db } from '@/lib/db';

export type TaskRow = {
  id: string;
  title: string;
  done: boolean;
  due_date: string | null;
  assignee_id: string | null;
};

const COLUMNS = 'id, title, done, due_date, assignee_id';

export const taskRepository = {
  listByUser(userId: string, limit: number, offset: number) {
    return db.query<TaskRow>(
      `SELECT ${COLUMNS} FROM tasks WHERE owner_id = $1 ORDER BY due_date LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
  },

  async markComplete(id: string, userId: string) {
    const rows = await db.query<TaskRow>(
      `UPDATE tasks SET done = true WHERE id = $1 AND owner_id = $2 RETURNING ${COLUMNS}`,
      [id, userId],
    );
    return rows[0] ?? null;
  },
};
