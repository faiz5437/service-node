import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HttpStatus } from '../src/constants/httpStatus.js';
import { ResponseHelper } from '../src/helpers/response.js';

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('success menghasilkan format meta + data', () => {
  const res = ResponseHelper.success(fakeRes(), { id: 1 }, 'OK');
  assert.equal(res.statusCode, HttpStatus.OK);
  assert.deepEqual(Object.keys(res.body.meta), ['code', 'success', 'message', 'timestamp']);
  assert.equal(res.body.meta.success, true);
  assert.deepEqual(res.body.data, { id: 1 });
});

test('paginated menyertakan blok pagination', () => {
  const res = ResponseHelper.paginated(fakeRes(), [1, 2], { page: 2, perPage: 2, total: 5 });
  assert.deepEqual(res.body.pagination, { page: 2, per_page: 2, total: 5, total_pages: 3 });
});

test('error menyertakan errors dan data null', () => {
  const res = ResponseHelper.error(fakeRes(), 'Gagal', HttpStatus.UNPROCESSABLE_ENTITY, { nama: ['wajib'] });
  assert.equal(res.statusCode, 422);
  assert.equal(res.body.meta.success, false);
  assert.equal(res.body.data, null);
  assert.deepEqual(res.body.errors, { nama: ['wajib'] });
});
