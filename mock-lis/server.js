/**
 * Simulasi Laboratory Information System (LIS) eksternal untuk demo integrasi.
 *  - Menerima order dari outbox worker: POST /orders
 *  - Beberapa detik kemudian mengirim hasil ke service Node: POST /api/v1/lab/external/results
 *
 * Variabel lingkungan:
 *  MOCK_LIS_PORT=4000  MOCK_LIS_DELAY_MS=5000  MOCK_LIS_FAIL_RATE=0 (0-1, untuk simulasi gangguan)
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';

const port = Number(process.env.MOCK_LIS_PORT ?? 4000);
const delayMs = Number(process.env.MOCK_LIS_DELAY_MS ?? 5000);
const failRate = Number(process.env.MOCK_LIS_FAIL_RATE ?? 0);
const apiKey = process.env.LIS_API_KEY ?? 'dev-lis-key';
const nodeUrl = `http://127.0.0.1:${process.env.PORT ?? 3000}/api/v1/lab/external/results`;
const inboundKey = process.env.LIS_INBOUND_API_KEY ?? 'dev-lis-inbound-key';

const received = new Map();
const app = express();
app.use(express.json());

app.post('/orders', (req, res) => {
  if (req.get('X-API-Key') !== apiKey) return res.status(401).json({ message: 'API key salah' });
  if (Math.random() < failRate) return res.status(503).json({ message: 'LIS sedang sibuk' });

  const key = req.get('Idempotency-Key');
  if (received.has(key)) return res.status(200).json({ message: 'Order sudah diterima', no_order: req.body.no_order });

  received.set(key, req.body.no_order);
  console.log(`[LIS] Order diterima ${req.body.no_order} (${req.body.pemeriksaan.map((p) => p.kode).join(', ')})`);

  const hasil = req.body.pemeriksaan.map((p) => ({
    kode: p.kode,
    nilai: String(Math.round(50 + Math.random() * 150)),
    flag: 'normal',
    external_result_id: `LIS-${req.body.no_order}-${p.kode}-${crypto.randomUUID().slice(0, 8)}`,
  }));

  setTimeout(() => kirimHasil(req.body.no_order, hasil), delayMs);
  return res.status(202).json({ message: 'Order diterima', no_order: req.body.no_order });
});

async function kirimHasil(noOrder, hasil, percobaan = 1) {
  try {
    const response = await fetch(nodeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': inboundKey },
      body: JSON.stringify({ no_order: noOrder, hasil }),
    });
    const body = await response.json();
    console.log(`[LIS] Kirim hasil ${noOrder}: ${response.status} ${body?.meta?.message}`);
    if (response.status >= 500 && percobaan < 5) setTimeout(() => kirimHasil(noOrder, hasil, percobaan + 1), 10000);
  } catch (error) {
    console.log(`[LIS] Gagal kirim hasil ${noOrder}: ${error.message}`);
    if (percobaan < 5) setTimeout(() => kirimHasil(noOrder, hasil, percobaan + 1), 10000);
  }
}

app.listen(port, () => console.log(`[LIS] Mock LIS berjalan di port ${port}`));
