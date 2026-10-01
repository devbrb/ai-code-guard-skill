import { Pool } from 'pg';
import { logger } from './logger';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = {
  async query<T>(text: string, params: unknown[] = []): Promise<T[]> {
    try {
      const result = await pool.query(text, params);
      return result.rows as T[];
    } catch (error) {
      logger.error('database query failed', { text, error: String(error) });
      throw error;
    }
  },
};
