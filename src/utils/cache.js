/**
 * Cache in-memory sederhana dengan TTL, untuk query dashboard yang berat.
 */
export class TtlCache {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  async remember(key, producer) {
    const hit = this.store.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value;

    const value = await producer();
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    return value;
  }

  clear() {
    this.store.clear();
  }
}
