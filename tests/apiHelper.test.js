import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, test } from 'node:test';
import { APIHelper } from '../src/helpers/apiHelper.js';
import { ExternalServiceError } from '../src/errors/AppError.js';

let server;
let baseURL;
const hits = { flaky: 0, post: 0 };

before(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    res.setHeader('Content-Type', 'application/json');

    if (url.pathname === '/data') return res.end(JSON.stringify({ page: url.searchParams.get('page') }));
    if (url.pathname === '/flaky') {
      hits.flaky += 1;
      res.statusCode = hits.flaky < 3 ? 503 : 200;
      return res.end(JSON.stringify({ attempt: hits.flaky }));
    }
    if (url.pathname === '/post-fail') {
      hits.post += 1;
      res.statusCode = 503;
      return res.end('{}');
    }
    if (url.pathname === '/slow') return setTimeout(() => res.end('{}'), 300);
    if (url.pathname === '/bad') {
      res.statusCode = 422;
      return res.end(JSON.stringify({ meta: { message: 'Data tidak valid' }, errors: { a: ['x'] } }));
    }
    res.statusCode = 404;
    return res.end('{}');
  });

  await new Promise((resolve) => server.listen(0, resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('get dengan query params', async () => {
  const client = APIHelper.create({ baseURL });
  const { status, data } = await client.get('/data', { params: { page: 2, kosong: '' } });
  assert.equal(status, 200);
  assert.deepEqual(data, { page: '2' });
});

test('retry otomatis pada 503 untuk method GET', async () => {
  const client = APIHelper.create({ baseURL, retries: 2, retryDelay: 10 });
  const { data } = await client.get('/flaky');
  assert.equal(data.attempt, 3);
});

test('POST tanpa Idempotency-Key tidak di-retry', async () => {
  const client = APIHelper.create({ baseURL, retries: 3, retryDelay: 10 });
  await assert.rejects(client.post('/post-fail', {}), ExternalServiceError);
  assert.equal(hits.post, 1);
});

test('timeout menjadi ExternalServiceError 504', async () => {
  const client = APIHelper.create({ baseURL, timeout: 50, retries: 0 });
  await assert.rejects(client.get('/slow'), (error) => error instanceof ExternalServiceError && error.statusCode === 504);
});

test('error 4xx dari upstream diteruskan dengan pesan aslinya', async () => {
  const client = APIHelper.create({ baseURL, retries: 0 });
  await assert.rejects(client.get('/bad'), (error) => error.statusCode === 422 && error.message === 'Data tidak valid');
});
