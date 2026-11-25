import { z } from 'zod';

const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
const awalBulan = () => `${today().slice(0, 8)}01`;

export const periodeSchema = z
  .object({
    dari: tanggal.default(awalBulan),
    sampai: tanggal.default(today),
    poli_id: z.string().uuid('poli_id harus UUID').optional(),
  })
  .refine((v) => v.sampai >= v.dari, { message: 'Tanggal akhir periode tidak boleh sebelum tanggal awal', path: ['sampai'] })
  .refine((v) => (new Date(v.sampai) - new Date(v.dari)) / 86400000 <= 366, { message: 'Periode maksimal 1 tahun', path: ['sampai'] });

export const RINCIAN_JENIS = ['kunjungan', 'tindakan', 'obat', 'pembayaran'];

export const rincianSchema = periodeSchema.and(
  z.object({
    jenis: z.enum(RINCIAN_JENIS, { errorMap: () => ({ message: `jenis harus salah satu dari: ${RINCIAN_JENIS.join(', ')}` }) }),
    status: z.string().max(20).optional(),
    sort: z.string().max(40).optional(),
    page: z.coerce.number().int().min(1).default(1),
    per_page: z.coerce.number().int().min(1).max(100).default(20),
  })
);
