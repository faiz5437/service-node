/**
 * Klausa ORDER BY dari parameter `sort` (mis. `nama` atau `-nama`).
 * Hanya key yang terdaftar di `allowed` yang dipakai, jadi kolom SQL tidak bisa disisipkan dari luar.
 * `fallback` ditambahkan di belakang sebagai urutan berikutnya agar hasil stabil antar halaman.
 *
 * @param {string|undefined} sort
 * @param {Record<string, string>} allowed key sort => ekspresi SQL
 * @param {string} fallback
 */
export function toOrderBy(sort, allowed, fallback) {
  if (!sort) return fallback;

  const key = sort.replace(/^-/, '');
  const column = Object.hasOwn(allowed, key) ? allowed[key] : null;
  if (!column) return fallback;

  return `${column} ${sort.startsWith('-') ? 'DESC' : 'ASC'} NULLS LAST, ${fallback}`;
}
