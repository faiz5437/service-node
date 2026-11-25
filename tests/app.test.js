import './helpers.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { tokenFor } from './helpers.js';

const { createApp } = await import('../src/app.js');
const app = createApp();

test('endpoint tidak dikenal mengembalikan 404 dengan format standar', async () => {
  const res = await request(app).get('/api/v1/tidak-ada');
  assert.equal(res.status, 404);
  assert.equal(res.body.meta.success, false);
  assert.equal(res.body.meta.code, 404);
});

test('dashboard tanpa token ditolak 401', async () => {
  const res = await request(app).get('/api/v1/dashboard/ringkasan');
  assert.equal(res.status, 401);
});

test('token kedaluwarsa ditolak 401', async () => {
  const res = await request(app).get('/api/v1/dashboard/ringkasan').set('Authorization', `Bearer ${tokenFor(['lihatDashboard'], { expiresIn: -10 })}`);
  assert.equal(res.status, 401);
  assert.equal(res.body.meta.message, 'Token akses sudah kedaluwarsa');
});

test('user tanpa permission lihatDashboard ditolak 403', async () => {
  const res = await request(app).get('/api/v1/dashboard/ringkasan').set('Authorization', `Bearer ${tokenFor(['prosesResep'])}`);
  assert.equal(res.status, 403);
});

test('validasi periode mengembalikan 422 dengan detail error', async () => {
  const res = await request(app)
    .get('/api/v1/dashboard/ringkasan?dari=2026-11-10&sampai=2026-11-01')
    .set('Authorization', `Bearer ${tokenFor(['lihatDashboard'])}`);
  assert.equal(res.status, 422);
  assert.ok(res.body.errors.sampai);
});

test('endpoint eksternal lab wajib X-API-Key', async () => {
  const res = await request(app).post('/api/v1/lab/external/results').send({});
  assert.equal(res.status, 401);
});

test('payload hasil lab divalidasi', async () => {
  const res = await request(app).post('/api/v1/lab/external/results').set('X-API-Key', 'test-inbound-key').send({ no_order: '', hasil: [] });
  assert.equal(res.status, 422);
  assert.ok(res.body.errors.no_order);
  assert.ok(res.body.errors.hasil);
});

test('JSON rusak dibalas 400', async () => {
  const res = await request(app).post('/api/v1/lab/external/results').set('X-API-Key', 'test-inbound-key').set('Content-Type', 'application/json').send('{rusak');
  assert.equal(res.status, 400);
});
