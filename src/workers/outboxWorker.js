import { config } from '../config/index.js';
import { db } from '../config/database.js';
import { lisClient } from '../integrations/lisClient.js';
import { logger } from '../utils/logger.js';

const handlers = {
  'lab_order.created': (event) => lisClient.kirimOrder(event),
};

const backoffSeconds = (attempts) => Math.min(30 * 2 ** (attempts - 1), 3600);

/**
 * D5: transactional outbox.
 * Event diambil dengan FOR UPDATE SKIP LOCKED sehingga beberapa worker bisa berjalan paralel
 * tanpa memproses event yang sama. Event gagal dijadwalkan ulang dengan jeda yang makin panjang
 * (30 dtk, 1 mnt, 2 mnt, ... maks 1 jam) dan berstatus 'failed' setelah batas percobaan.
 */
export async function processOutboxBatch() {
  return db.transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, event_type, payload, attempts
         FROM outbox
        WHERE status = 'pending' AND next_retry_at <= NOW()
        ORDER BY created_at
        LIMIT $1
        FOR UPDATE SKIP LOCKED`,
      [config.outbox.batchSize]
    );

    for (const event of rows) {
      const handler = handlers[event.event_type];

      try {
        if (!handler) throw new Error(`Tidak ada handler untuk event ${event.event_type}`);
        await handler(event);

        await client.query(
          `UPDATE outbox SET status = 'sent', sent_at = NOW(), attempts = attempts + 1, last_error = NULL WHERE id = $1`,
          [event.id]
        );
        logger.info('Outbox terkirim', { id: event.id, event: event.event_type });
      } catch (error) {
        const attempts = event.attempts + 1;
        const failed = !handler || attempts >= config.outbox.maxAttempts;

        await client.query(
          `UPDATE outbox
              SET attempts = $2,
                  last_error = $3,
                  status = CASE WHEN $4::boolean THEN 'failed' ELSE 'pending' END,
                  next_retry_at = NOW() + make_interval(secs => $5)
            WHERE id = $1`,
          [event.id, attempts, String(error.message).slice(0, 500), failed, backoffSeconds(attempts)]
        );
        logger.warn('Outbox gagal dikirim', { id: event.id, attempts, failed, error: error.message });
      }
    }

    return rows.length;
  });
}

export function startOutboxWorker() {
  let running = false;

  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await processOutboxBatch();
    } catch (error) {
      logger.error('Outbox worker error', { error: error.message });
    } finally {
      running = false;
    }
  }, config.outbox.intervalMs);

  return () => clearInterval(timer);
}
