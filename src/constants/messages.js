export const Messages = Object.freeze({
  SUCCESS: 'Berhasil',
  FETCHED: 'Data berhasil diambil',
  CREATED: 'Data berhasil disimpan',
  UPDATED: 'Data berhasil diperbarui',
  DELETED: 'Data berhasil dihapus',
  ACCEPTED: 'Permintaan diterima dan sedang diproses',

  BAD_REQUEST: 'Permintaan tidak valid',
  VALIDATION_FAILED: 'Data yang dikirim belum valid',
  NOT_FOUND: 'Data tidak ditemukan',
  ROUTE_NOT_FOUND: 'Endpoint tidak ditemukan',
  CONFLICT: 'Data bentrok dengan data yang sudah ada',
  TOO_MANY_REQUESTS: 'Terlalu banyak permintaan. Coba lagi beberapa saat lagi',
  SERVER_ERROR: 'Terjadi kesalahan pada server',
  PAYLOAD_INVALID_JSON: 'Format JSON tidak valid',

  UNAUTHORIZED: 'Sesi tidak valid atau sudah berakhir. Silakan login kembali',
  TOKEN_MISSING: 'Token akses tidak ditemukan',
  TOKEN_EXPIRED: 'Token akses sudah kedaluwarsa',
  FORBIDDEN: 'Anda tidak memiliki akses ke fitur ini',
  API_KEY_INVALID: 'API key tidak valid',

  UPSTREAM_TIMEOUT: 'Layanan tujuan tidak merespons tepat waktu',
  UPSTREAM_UNAVAILABLE: 'Layanan tujuan sedang tidak dapat diakses',
  UPSTREAM_ERROR: 'Layanan tujuan mengembalikan kesalahan',

  DASHBOARD_REFRESHED: 'Rekap dashboard berhasil diperbarui',
  PERIODE_INVALID: 'Tanggal akhir periode tidak boleh sebelum tanggal awal',
  LAB_HASIL_DITERIMA: 'Hasil pemeriksaan diterima',
  LAB_HASIL_TERTUNDA: 'Hasil belum dapat disimpan karena layanan utama sedang tidak tersedia. Silakan kirim ulang',
  OUTBOX_DIJADWALKAN: 'Pesan dijadwalkan untuk dikirim ulang',
  OUTBOX_TIDAK_DAPAT_DIULANG: 'Pesan yang sudah terkirim tidak dapat dikirim ulang',
});
