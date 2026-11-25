import { db } from '../../../config/database.js';
import { Messages } from '../../../constants/messages.js';
import { AppError } from '../../../errors/AppError.js';
import { toOrderBy } from '../../../helpers/sort.js';
import { yiiClient } from '../../../integrations/yiiClient.js';

const OUTBOX_SORT = {
  no_order: "payload->>'no_order'",
  created_at: 'created_at',
  attempts: 'attempts',
  next: 'COALESCE(sent_at, next_retry_at)',
  status: 'status',
};

export const labService = {
  daftarOrder({ status, limit }) {
    return db.many(
      `SELECT l.no_order, l.status, l.catatan_klinis, l.created_at,
              json_build_object('no_rm', ps.no_rm, 'nama', ps.nama, 'jenis_kelamin', ps.jenis_kelamin, 'tgl_lahir', ps.tgl_lahir) AS pasien,
              d.nama AS dokter,
              json_agg(json_build_object('kode', j.kode, 'nama', j.nama, 'satuan', j.satuan, 'status', li.status) ORDER BY j.kode) AS pemeriksaan
         FROM lab_order l
         JOIN kunjungan k ON k.id = l.kunjungan_id
         JOIN pasien ps ON ps.id = k.pasien_id
         JOIN tenaga_medis d ON d.id = l.dokter_id
         JOIN lab_order_item li ON li.lab_order_id = l.id
         JOIN jenis_pemeriksaan_lab j ON j.id = li.jenis_pemeriksaan_id
        WHERE l.status = $1
        GROUP BY l.id, ps.id, d.nama
        ORDER BY l.created_at
        LIMIT $2`,
      [status, limit]
    );
  },

  teruskanHasil(payload) {
    return yiiClient.kirimHasilLab(payload);
  },

  async statusIntegrasi() {
    const [ringkasan, gagalTerakhir] = await Promise.all([
      db.one(
        `SELECT COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                COUNT(*) FILTER (WHERE status = 'sent')    AS sent,
                COUNT(*) FILTER (WHERE status = 'failed')  AS failed,
                MIN(created_at) FILTER (WHERE status = 'pending') AS pending_tertua,
                MAX(sent_at) AS terakhir_terkirim
           FROM outbox`
      ),
      db.many(
        `SELECT id, event_type, payload->>'no_order' AS no_order, attempts, last_error, next_retry_at, created_at
           FROM outbox WHERE status IN ('pending', 'failed') AND attempts > 0
          ORDER BY created_at DESC LIMIT 5`
      ),
    ]);

    return { ...ringkasan, bermasalah: gagalTerakhir };
  },

  async daftarOutbox({ status, sort, page, per_page: perPage }) {
    const orderBy = toOrderBy(sort, OUTBOX_SORT, 'created_at DESC');

    const [rows, total] = await Promise.all([
      db.many(
        `SELECT id, event_type, aggregate_id, payload->>'no_order' AS no_order, status, attempts, last_error, next_retry_at, created_at, sent_at
           FROM outbox WHERE ($1::text IS NULL OR status = $1)
          ORDER BY ${orderBy} LIMIT $2 OFFSET $3`,
        [status ?? null, perPage, (page - 1) * perPage]
      ),
      db.one(`SELECT COUNT(*) AS total FROM outbox WHERE ($1::text IS NULL OR status = $1)`, [status ?? null]),
    ]);

    return { rows, total: total.total };
  },

  async ulangiOutbox(id) {
    const updated = await db.one(
      `UPDATE outbox SET status = 'pending', attempts = 0, next_retry_at = NOW(), last_error = NULL
        WHERE id = $1 AND status IN ('failed', 'pending')
        RETURNING id, status, next_retry_at`,
      [id]
    );

    if (updated) return updated;

    const exists = await db.one('SELECT status FROM outbox WHERE id = $1', [id]);
    throw exists ? AppError.conflict(Messages.OUTBOX_TIDAK_DAPAT_DIULANG) : AppError.notFound();
  },
};
