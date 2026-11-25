import { z } from 'zod';

export const hasilSchema = z.object({
  no_order: z.string().min(1, 'no_order wajib diisi').max(30),
  hasil: z
    .array(
      z.object({
        kode: z.string().min(1, 'kode pemeriksaan wajib diisi').max(20),
        nilai: z.union([z.string(), z.number()]).transform(String).pipe(z.string().min(1, 'nilai wajib diisi').max(100)),
        flag: z.enum(['normal', 'tinggi', 'rendah', 'kritis']).optional(),
        catatan: z.string().max(500).optional(),
        external_result_id: z.string().min(1, 'external_result_id wajib diisi').max(100),
      })
    )
    .min(1, 'Minimal satu hasil pemeriksaan'),
});

export const orderListSchema = z.object({
  status: z.enum(['diminta', 'diproses', 'selesai']).default('diminta'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const outboxListSchema = z.object({
  status: z.enum(['pending', 'sent', 'failed']).optional(),
  sort: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().uuid('ID harus UUID'),
});
