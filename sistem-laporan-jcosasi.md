# Sistem Laporan JCOSASI — Panduan untuk Modifikasi

Dokumen ini menjelaskan arsitektur fungsi cetak/laporan PDF di proyek JCOSASI
agar dapat direplikasi atau dimodifikasi oleh sesi Claude lain.

---

## Gambaran Besar

Sistem laporan **tidak menggunakan library PDF eksternal**.
Caranya murni JavaScript:
1. Bangun string HTML lengkap (termasuk semua CSS di dalam `<style>`)
2. Buka tab baru: `window.open('', '_blank')`
3. Tulis HTML ke tab itu: `win.document.write(html)`
4. Tampilkan overlay panduan → user klik → `window.print()`
5. Browser lakukan cetak / simpan ke PDF

---

## Lokasi File

Semua fungsi laporan ada di satu file: **`rekap-script.js`**
Dipanggil dari dua halaman:
- `rekap.html` — halaman dashboard/rekap
- `proker.html` — halaman detail per program kerja

---

## Tiga Fungsi Laporan

### 1. `printLaporanSesi(idx)` — Laporan Satu Sesi
**Baris:** ~1029 di `rekap-script.js`
**Dipanggil dari:** Tombol 🖨️ kecil di tiap baris sesi dokumentasi
**Isi laporan:** Kop surat, info kegiatan, keterangan, materi, kendala,
daftar hadir, rincian biaya, grid foto, area tanda tangan

**Cara ambil data:**
```js
function printLaporanSesi(idx) {
  const sesiList = window._rekapSesiList; // array global, diisi saat render
  const sesi = sesiList[idx];
  const d = sesi.rows ? sesi.rows[0] : sesi; // objek data mentah dari Sheets
  const proker = getProkerByNum(sesi.proker_id); // info proker dari content.js
  const org = CONTENT?.org || {};               // info organisasi dari content.js
}
```

**Field dari Google Sheets yang dipakai (objek `d`):**
| Field | Keterangan |
|---|---|
| `d.tanggal_sesi` | Tanggal kegiatan |
| `d.waktu_mulai` | Jam mulai |
| `d.waktu_selesai` | Jam selesai |
| `d.keterangan` | Keterangan kegiatan |
| `d.materi` | Materi / progress |
| `d.kendala` | Kendala & evaluasi |
| `d.hadir_peserta` | Nama peserta dipisah koma |
| `d.hadir_panitia` | Nama panitia dipisah koma |
| `d.hadir_narasumber` | Nama narasumber dipisah koma |
| `d.kelas_peserta` | Kelas peserta dipisah koma (urutan sama dengan hadir_peserta) |
| `d.kelas_panitia` | Kelas panitia dipisah koma |
| `d.kelas_narasumber` | Kelas narasumber dipisah koma |
| `d.foto_url` | URL foto dipisah koma (Google Drive atau langsung) |
| `d.item_biaya` | Item biaya dipisah koma |
| `d.estimasi_biaya_item` | Estimasi per item dipisah koma |
| `d.biaya_aktual` | Biaya aktual per item dipisah koma |

---

### 2. `printLaporanProker(proker, sheetsData)` — Laporan Satu Proker
**Baris:** ~831 di `rekap-script.js`
**Dipanggil dari:** Tombol 🖨️ di halaman detail proker (`proker.html`)
**Isi laporan:** Kop surat, info proker, semua sesi dokumentasi,
total biaya, kalender aktivitas

**Cara ambil data:**
```js
function printLaporanProker(proker, sheetsData) {
  const det    = sheetsData?.detail || {};   // detail proker (tujuan, lokasi, dst)
  const dok    = sheetsData?.dok    || [];   // array semua sesi dokumentasi proker ini
  const act    = sheetsData?.activity || []; // array aktivitas/jadwal
  const jadwal = sheetsData?.jadwal   || []; // jadwal yang dijadwalkan
  const org    = CONTENT?.org || {};
}
```

---

### 3. `printLaporanRekap()` — Laporan Semua Proker
**Baris:** ~549 di `rekap-script.js`
**Dipanggil dari:** Tombol di hero section `rekap.html`
**Isi laporan:** Ringkasan semua proker, total sesi, total biaya keseluruhan

**Cara ambil data:**
```js
function printLaporanRekap() {
  // Ambil dari sessionStorage (cache hasil fetch Sheets)
  const cacheKey = 'jcosasi_v1_' + btoa(api).slice(0,20).replace(/[^a-z0-9]/gi,'');
  const raw = sessionStorage.getItem(cacheKey);
  const allData = JSON.parse(raw).data; // seluruh data dari semua sheet
}
```

---

## Struktur HTML Laporan (Template)

Setiap fungsi membangun string HTML dengan pola yang sama:

```
<!DOCTYPE html>
<html>
<head>
  <style>
    /* SEMUA CSS INLINE DI SINI — tidak ada file eksternal */
    /* Reset, typography, kop, tabel, badge, foto, ttd, print media query */
    /* + CSS untuk overlay panduan cetak */
  </style>
</head>
<body>
  <!-- 1. KOP SURAT -->
  <div class="kop">
    logo | nama organisasi + sekolah + periode | tanggal cetak
  </div>

  <!-- 2. JUDUL & SUB-JUDUL -->
  <div class="lap-title">LAPORAN KEGIATAN</div>
  <div class="lap-sub">Nama Proker · Sesi ke-N</div>
  <hr/>

  <!-- 3. INFO GRID (2 kolom) -->
  <div class="info-grid">
    Program Kerja | Nomor Sesi
    Tanggal       | Waktu
    Jumlah Hadir  | Lokasi (opsional)
    Total Biaya   | (opsional)
  </div>

  <!-- 4. TEXT BOX (muncul jika ada data) -->
  <div class="text-box">Keterangan Kegiatan</div>
  <div class="text-box">Materi & Progress</div>
  <div class="text-box" style="merah">Kendala & Evaluasi</div>

  <!-- 5. TABEL DAFTAR HADIR -->
  <h3>✅ Daftar Hadir</h3>
  <table>
    <thead>No | Nama | Kelas | Peran | Tanda Tangan</thead>
    <tbody>... per orang ...</tbody>
  </table>

  <!-- 6. TABEL BIAYA -->
  <h3>💰 Rincian Biaya</h3>
  <table>
    <thead>Item | Estimasi | Aktual</thead>
    <tbody>... per item ...</tbody>
    <tfoot>Total</tfoot>
  </table>

  <!-- 7. GRID FOTO (adaptif 1–5 foto) -->
  <h3>📷 Foto Kegiatan</h3>
  <div class="foto-section">
    <div class="foto-row">
      <div class="foto-cell"><img/></div>
      ...
    </div>
  </div>

  <!-- 8. AREA TANDA TANGAN (3 kolom) -->
  <div class="ttd-area">
    Ketua Pelaksana | Sekretaris | Pembina
  </div>

  <!-- 9. TOMBOL CETAK (hilang saat print) -->
  <button class="print-btn" onclick="showPrintGuide(...)">🖨️ Cetak</button>

  <!-- 10. SCRIPT INLINE: showPrintGuide() + doActualPrint() -->
  <script>
    function showPrintGuide(fileName) { /* tampilkan overlay panduan */ }
    function doActualPrint() { window.print(); }
  </script>
</body>
</html>
```

---

## Helper Functions yang Dipakai di Dalam Laporan

Fungsi-fungsi ini dipanggil **sebelum** HTML string dibangun,
semua didefinisikan di bagian atas `rekap-script.js`:

| Fungsi | Kegunaan |
|---|---|
| `parseDokRow(d)` | Memecah field biaya & foto yang comma-separated menjadi array |
| `rupiahNum(str)` | Konversi string angka → number (hapus titik/koma) |
| `rupiah(num)` | Format number → "Rp 1.000.000" |
| `formatTglPanjang(str)` | "2026-03-15" → "Sabtu, 15 Maret 2026" |
| `hitungDurasi(mulai, selesai)` | "08:00", "10:30" → "2 jam 30 menit" |
| `convertGDriveUrl(url)` | Konversi URL Google Drive ke URL embed yang bisa ditampilkan di `<img>` |
| `getProkerByNum(id)` | Ambil objek proker dari `CONTENT` berdasarkan nomor |

---

## Layout Foto Adaptif

Foto di-layout berdasarkan jumlahnya (max 5):

| Jumlah | Layout |
|---|---|
| 1 | 1 baris, 1 foto full width, tinggi 180px |
| 2 | 1 baris, 2 foto sejajar, tinggi 150px |
| 3 | Baris 1: 1 foto full (155px), Baris 2: 2 foto (120px) |
| 4 | 2 baris × 2 foto (130px) |
| 5 | Baris 1: 1 full (150px), Baris 2–3: 2 foto (115px) |

Semua foto pakai `object-fit: contain` sehingga tidak terpotong.
Tinggi dikontrol via CSS variable `--fh` pada `.foto-cell`.

---

## Warna / Tema CSS Laporan

| Elemen | Nilai |
|---|---|
| Warna utama (border, heading, tombol) | `#3D1A5E` (ungu tua) |
| Warna aksen heading | `#2c0a4a` |
| Background info-grid | `#f8f5ff` |
| Border info-grid | `#d9c8f5` |
| Background badge peserta | `#DBEAFE` / teks `#1D4ED8` (biru) |
| Background badge panitia | `#D1FAE5` / teks `#065F46` (hijau) |
| Background badge narasumber | `#FEF3C7` / teks `#92400E` (kuning) |
| Row genap tabel | `#f8f5ff` |
| Row total tabel | `#ede0f8` |
| Kendala text-box | `#FFF5F5` border `#FECACA` |

---

## Cara Membuat Laporan Baru

Untuk membuat laporan serupa dengan data/format berbeda,
cukup ikuti pola berikut:

```js
function printLaporanXxx(data) {
  // 1. Siapkan semua variabel dari data
  const org = CONTENT?.org || {};
  const now = new Date();
  const tglCetak = now.toLocaleDateString('id-ID', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });

  // 2. Bangun string HTML
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Judul Laporan</title>
<style>
  /* Salin CSS dari printLaporanSesi — semua inline */
  /* Wajib ada: reset, body, .kop, h3, table, th, td, .print-btn, @media print */
  /* Tambah: .save-guide-overlay dan semua .save-guide-* */
</style>
</head>
<body>
  <!-- Salin struktur kop, info-grid, tabel, ttd-area, tombol cetak -->
  <!-- Sesuaikan data yang ditampilkan -->

  <button class="print-btn"
    onclick="showPrintGuide('Nama-File.pdf')">
    🖨️ Cetak / Simpan PDF
  </button>

  <script>
  /* Salin persis fungsi showPrintGuide dan doActualPrint dari printLaporanSesi */
  function showPrintGuide(fileName) { /* ... */ }
  function doActualPrint() {
    var el = document.getElementById('saveGuideOverlay');
    if (el) el.remove();
    setTimeout(function() { window.print(); }, 150);
  }
  </script>
</body>
</html>`;

  // 3. Buka tab baru dan tulis HTML
  const win = window.open('', '_blank');
  if (!win) { alert('Pop-up diblokir browser.'); return; }
  win.document.write(html);
  win.document.close();
}
```

---

## Catatan Penting

- **Semua CSS harus inline** di dalam `<style>` di dalam HTML string —
  karena tab baru tidak bisa mengakses file CSS eksternal dari origin yang berbeda.
- **Font:** Pakai font system (`'Segoe UI', Arial, sans-serif`) bukan Google Fonts,
  karena saat cetak koneksi internet mungkin tidak tersedia.
- **Gambar Drive:** Selalu lewat `convertGDriveUrl()` agar bisa tampil di `<img>`.
  Google Drive punya proteksi hotlink — URL perlu dikonversi ke format embed.
- **Pop-up:** `window.open` butuh izin pop-up dari browser.
  Kalau diblokir, tampilkan `alert()` sebagai fallback.
- **`@media print`:** Sembunyikan tombol cetak dan overlay panduan saat print.
- **Ukuran kertas:** `html, body { width: 210mm; min-height: 297mm; }` = A4.
  Padding body `18mm 18mm 16mm` = margin A4 standar.
