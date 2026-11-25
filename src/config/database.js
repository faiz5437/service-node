import pg from 'pg';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

// NUMERIC dan BIGINT (COUNT) dikembalikan sebagai number, bukan string
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => (value === null ? null : Number(value)));
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => (value === null ? null : Number(value)));
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export const pool = new pg.Pool(config.db);

pool.on('error', (error) => logger.error('Koneksi database idle error', { error: error.message }));

export const db = {
  query: (text, params) => pool.query(text, params),

  async one(text, params) {
    const { rows } = await pool.query(text, params);
    return rows[0] ?? null;
  },

  async many(text, params) {
    const { rows } = await pool.query(text, params);
    return rows;
  },

  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
