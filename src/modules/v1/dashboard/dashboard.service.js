import { config } from '../../../config/index.js';
import { db } from '../../../config/database.js';
import { toOrderBy } from '../../../helpers/sort.js';
import { TtlCache } from '../../../utils/cache.js';

const cache = new TtlCache(config.dashboardCacheTtlMs);
let lastRefreshedAt = null;

// Filter periode & poli yang dipakai berulang. $1 = dari, $2 = sampai, $3 = poli_id (boleh null)
const PERIODE = `k.tanggal_kunjungan BETWEEN $1 AND $2 AND ($3::uuid IS NULL OR k.poli_id = $3::uuid)`;
const params = ({ dari, sampai, poli_id: poliId }) => [dari, sampai, poliId ?? null];
const cacheKey = (name, filter) => `${name}:${filter.dari}:${filter.sampai}:${filter.poli_id ?? '-'}`;

export const dashboardService = {
  ringkasan(filter) {
    return cache.remember(cacheKey('ringkasan', filter), async () => {
      const p = params(filter);

      const [kunjungan, tindakan, keuangan, statusBayar, komponen, metode, obat] = await Promise.all([
        db.one(
          `SELECT COUNT(*) FILTER (WHERE k.status <> 'batal')            AS total,
                  COUNT(*) FILTER (WHERE k.status = 'selesai')           AS selesai,
                  COUNT(*) FILTER (WHERE k.status IN ('menunggu','dipanggil','diperiksa')) AS dalam_proses,
                  COUNT(*) FILTER (WHERE k.status = 'batal')             AS batal,
                  COUNT(DISTINCT k.pasien_id) FILTER (WHERE k.status <> 'batal') AS pasien_unik
             FROM kunjungan k WHERE ${PERIODE}`,
          p
        ),
        db.one(
          `SELECT COUNT(*) AS jumlah, COALESCE(SUM(kt.qty * kt.tarif), 0) AS nilai
             FROM kunjungan_tindakan kt JOIN kunjungan k ON k.id = kt.kunjungan_id
            WHERE kt.status = 'aktif' AND ${PERIODE}`,
          p
        ),
        db.one(
          `SELECT COALESCE(SUM(t.total_tagihan), 0) AS total_tagihan,
                  COALESCE(SUM(t.total_dibayar), 0) AS total_dibayar,
                  COALESCE(SUM(t.total_tagihan - t.total_dibayar), 0) AS piutang
             FROM tagihan t JOIN kunjungan k ON k.id = t.kunjungan_id
            WHERE k.status <> 'batal' AND ${PERIODE}`,
          p
        ),
        db.many(
          `SELECT t.status, COUNT(*) AS jumlah, COALESCE(SUM(t.total_tagihan - t.total_dibayar), 0) AS sisa
             FROM tagihan t JOIN kunjungan k ON k.id = t.kunjungan_id
            WHERE k.status <> 'batal' AND t.total_tagihan > 0 AND ${PERIODE}
            GROUP BY t.status`,
          p
        ),
        db.many(
          `SELECT ti.sumber_tipe AS komponen, COALESCE(SUM(ti.subtotal), 0) AS nilai
             FROM tagihan_item ti
             JOIN tagihan t ON t.id = ti.tagihan_id
             JOIN kunjungan k ON k.id = t.kunjungan_id
            WHERE ti.status = 'aktif' AND ${PERIODE}
            GROUP BY ti.sumber_tipe`,
          p
        ),
        db.many(
          `SELECT b.metode, COUNT(*) AS jumlah, COALESCE(SUM(b.jumlah), 0) AS nilai
             FROM pembayaran b
             JOIN tagihan t ON t.id = b.tagihan_id
             JOIN kunjungan k ON k.id = t.kunjungan_id
            WHERE b.status = 'berhasil' AND ${PERIODE}
            GROUP BY b.metode ORDER BY nilai DESC`,
          p
        ),
        db.one(
          `SELECT COALESCE(SUM(ri.jumlah), 0) AS item_keluar, COUNT(DISTINCT r.id) AS resep_diserahkan
             FROM resep r
             JOIN resep_item ri ON ri.resep_id = r.id
             JOIN kunjungan k ON k.id = r.kunjungan_id
            WHERE r.status = 'diserahkan' AND ${PERIODE}`,
          p
        ),
      ]);

      const status = Object.fromEntries(['belum_bayar', 'sebagian', 'lunas'].map((s) => [s, { jumlah: 0, sisa: 0 }]));
      statusBayar.forEach((row) => {
        status[row.status] = { jumlah: row.jumlah, sisa: row.sisa };
      });

      return {
        periode: { dari: filter.dari, sampai: filter.sampai },
        kunjungan,
        tindakan,
        pendapatan: { ...keuangan, komponen, metode },
        status_pembayaran: status,
        obat,
      };
    });
  },

  kunjunganPerPoli(filter) {
    return cache.remember(cacheKey('poli', filter), () =>
      db.many(
        `SELECT p.id AS poli_id, p.nama AS poli,
                COUNT(k.id) FILTER (WHERE k.status <> 'batal') AS kunjungan,
                COALESCE(SUM(t.total_dibayar) FILTER (WHERE k.status <> 'batal'), 0) AS pendapatan
           FROM poli p
           LEFT JOIN kunjungan k ON k.poli_id = p.id AND ${PERIODE}
           LEFT JOIN tagihan t ON t.kunjungan_id = k.id
          WHERE p.is_active
          GROUP BY p.id, p.nama
          ORDER BY kunjungan DESC`,
        params(filter)
      )
    );
  },

  /**
   * Tren harian dibaca dari materialized view mv_rekap_harian agar tidak menghitung ulang seluruh transaksi.
   */
  tren(filter) {
    return cache.remember(cacheKey('tren', filter), async () => {
      const rows = await db.many(
        `SELECT to_char(d::date, 'YYYY-MM-DD') AS tanggal,
                COALESCE(SUM(m.jml_kunjungan), 0) AS kunjungan,
                COALESCE(SUM(m.total_tagihan), 0) AS total_tagihan,
                COALESCE(SUM(m.pendapatan), 0) AS pendapatan
           FROM generate_series($1::date, $2::date, interval '1 day') d
           LEFT JOIN mv_rekap_harian m ON m.tanggal = d::date AND ($3::uuid IS NULL OR m.poli_id = $3::uuid)
          GROUP BY d
          ORDER BY d`,
        params(filter)
      );
      return { data: rows, diperbarui_pada: lastRefreshedAt };
    });
  },

  tindakanTerbanyak(filter) {
    return cache.remember(cacheKey('tindakan', filter), () =>
      db.many(
        `SELECT tn.kode, tn.nama, tn.kategori, SUM(kt.qty) AS jumlah, SUM(kt.qty * kt.tarif) AS nilai
           FROM kunjungan_tindakan kt
           JOIN tindakan tn ON tn.id = kt.tindakan_id
           JOIN kunjungan k ON k.id = kt.kunjungan_id
          WHERE kt.status = 'aktif' AND ${PERIODE}
          GROUP BY tn.id, tn.kode, tn.nama, tn.kategori
          ORDER BY jumlah DESC, nilai DESC
          LIMIT 10`,
        params(filter)
      )
    );
  },

  penggunaanObat(filter) {
    return cache.remember(cacheKey('obat', filter), () =>
      db.many(
        `SELECT o.kode, o.nama, o.satuan, SUM(ri.jumlah) AS jumlah, SUM(ri.jumlah * ri.harga_satuan) AS nilai,
                o.stok AS stok_saat_ini, o.stok <= o.stok_minimum AS stok_menipis
           FROM resep_item ri
           JOIN resep r ON r.id = ri.resep_id
           JOIN obat o ON o.id = ri.obat_id
           JOIN kunjungan k ON k.id = r.kunjungan_id
          WHERE r.status = 'diserahkan' AND ${PERIODE}
          GROUP BY o.id, o.kode, o.nama, o.satuan, o.stok, o.stok_minimum
          ORDER BY jumlah DESC
          LIMIT 15`,
        params(filter)
      )
    );
  },

  async rincian(filter) {
    const query = RINCIAN_QUERY[filter.jenis];
    const p = [...params(filter), filter.status ?? null];
    const offset = (filter.page - 1) * filter.per_page;

    const [rows, total] = await Promise.all([
      db.many(`${query.select} ${query.from} ORDER BY ${toOrderBy(filter.sort, query.sort, query.order)} LIMIT $5 OFFSET $6`, [...p, filter.per_page, offset]),
      db.one(`SELECT COUNT(*) AS total ${query.from}`, p),
    ]);

    return { rows, total: total.total };
  },

  async refreshRekap() {
    await db.query('SELECT refresh_rekap_harian()');
    lastRefreshedAt = new Date().toISOString();
    cache.clear();
  },

  clearCache() {
    cache.clear();
  },
};

// $4 = filter status opsional untuk tiap jenis rincian
const RINCIAN_QUERY = {
  kunjungan: {
    select: `SELECT k.id, k.no_kunjungan, to_char(k.tanggal_kunjungan, 'YYYY-MM-DD') AS tanggal, k.status,
                    ps.no_rm, ps.nama AS pasien, p.nama AS poli, d.nama AS dokter,
                    t.total_tagihan, t.total_dibayar, t.status AS status_pembayaran`,
    from: `FROM kunjungan k
           JOIN pasien ps ON ps.id = k.pasien_id
           JOIN poli p ON p.id = k.poli_id
           JOIN tenaga_medis d ON d.id = k.dokter_id
           LEFT JOIN tagihan t ON t.kunjungan_id = k.id
          WHERE ${PERIODE} AND ($4::text IS NULL OR k.status = $4 OR t.status = $4)`,
    order: 'k.tanggal_kunjungan DESC, k.no_antrean ASC',
    sort: { tanggal: 'k.tanggal_kunjungan', pasien: 'ps.nama', poli: 'p.nama', status: 'k.status', total_tagihan: 't.total_tagihan', status_pembayaran: 't.status' },
  },
  tindakan: {
    select: `SELECT kt.id, to_char(k.tanggal_kunjungan, 'YYYY-MM-DD') AS tanggal, ps.no_rm, ps.nama AS pasien,
                    tn.kode, tn.nama AS tindakan, kt.qty, kt.tarif, kt.qty * kt.tarif AS subtotal, d.nama AS dokter`,
    from: `FROM kunjungan_tindakan kt
           JOIN kunjungan k ON k.id = kt.kunjungan_id
           JOIN pasien ps ON ps.id = k.pasien_id
           JOIN tindakan tn ON tn.id = kt.tindakan_id
           JOIN tenaga_medis d ON d.id = kt.dokter_id
          WHERE kt.status = 'aktif' AND ${PERIODE} AND ($4::text IS NULL OR tn.kode = $4)`,
    order: 'k.tanggal_kunjungan DESC, kt.created_at DESC',
    sort: { tanggal: 'k.tanggal_kunjungan', pasien: 'ps.nama', tindakan: 'tn.nama', dokter: 'd.nama', subtotal: 'kt.qty * kt.tarif' },
  },
  obat: {
    select: `SELECT ri.id, r.no_resep, to_char(r.diserahkan_at, 'YYYY-MM-DD HH24:MI') AS diserahkan_at, ps.no_rm, ps.nama AS pasien,
                    o.kode, o.nama AS obat, ri.jumlah, o.satuan, ri.harga_satuan, ri.jumlah * ri.harga_satuan AS subtotal`,
    from: `FROM resep_item ri
           JOIN resep r ON r.id = ri.resep_id
           JOIN obat o ON o.id = ri.obat_id
           JOIN kunjungan k ON k.id = r.kunjungan_id
           JOIN pasien ps ON ps.id = k.pasien_id
          WHERE r.status = 'diserahkan' AND ${PERIODE} AND ($4::text IS NULL OR o.kode = $4)`,
    order: 'r.diserahkan_at DESC',
    sort: { diserahkan_at: 'r.diserahkan_at', no_resep: 'r.no_resep', pasien: 'ps.nama', obat: 'o.nama', jumlah: 'ri.jumlah', subtotal: 'ri.jumlah * ri.harga_satuan' },
  },
  pembayaran: {
    select: `SELECT b.id, b.no_kwitansi, to_char(b.created_at, 'YYYY-MM-DD HH24:MI') AS waktu, ps.no_rm, ps.nama AS pasien,
                    t.no_invoice, b.metode, b.jumlah, b.status`,
    from: `FROM pembayaran b
           JOIN tagihan t ON t.id = b.tagihan_id
           JOIN kunjungan k ON k.id = t.kunjungan_id
           JOIN pasien ps ON ps.id = k.pasien_id
          WHERE ${PERIODE} AND ($4::text IS NULL OR b.metode = $4 OR b.status = $4)`,
    order: 'b.created_at DESC',
    sort: { waktu: 'b.created_at', no_kwitansi: 'b.no_kwitansi', pasien: 'ps.nama', metode: 'b.metode', jumlah: 'b.jumlah', status: 'b.status' },
  },
};
