import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toOrderBy } from '../src/helpers/sort.js';

const allowed = { nama: 'ps.nama', jumlah: 'b.jumlah' };

test('toOrderBy memakai kolom yang diizinkan dengan arah naik atau turun', () => {
  assert.equal(toOrderBy('nama', allowed, 'b.created_at DESC'), 'ps.nama ASC NULLS LAST, b.created_at DESC');
  assert.equal(toOrderBy('-jumlah', allowed, 'b.created_at DESC'), 'b.jumlah DESC NULLS LAST, b.created_at DESC');
});

test('toOrderBy mengabaikan key yang tidak terdaftar', () => {
  assert.equal(toOrderBy('id; DROP TABLE pasien', allowed, 'b.created_at DESC'), 'b.created_at DESC');
  assert.equal(toOrderBy('constructor', allowed, 'b.created_at DESC'), 'b.created_at DESC');
  assert.equal(toOrderBy(undefined, allowed, 'b.created_at DESC'), 'b.created_at DESC');
});
