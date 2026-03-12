# JCOSASI Landing Page — Program Kerja 2026–2027

Website landing page resmi JCOSASI (Japanese Community of Satu Bekasi), menampilkan Program Kerja Periode 2026–2027.

---

## 📁 Struktur File

```
jcosasi/
├── index.html    ← Halaman utama
├── style.css     ← Semua styling
├── script.js     ← Interaksi & animasi
└── README.md     ← Panduan ini
```

---

## 🚀 Cara Upload ke GitHub Pages

### Opsi A — Repository `username.github.io` (URL: `https://username.github.io`)

1. Buat repository baru di GitHub dengan nama **persis sama** dengan username kamu, contoh: `jcosasi.github.io`
2. Upload semua file (`index.html`, `style.css`, `script.js`) ke root repository
3. Pergi ke **Settings → Pages**
4. Source: pilih **Deploy from a branch** → branch `main` → folder `/ (root)`
5. Klik **Save**
6. Tunggu 1–2 menit, lalu buka `https://username.github.io`

### Opsi B — Repository biasa (URL: `https://username.github.io/jcosasi`)

1. Buat repository baru, misal bernama `jcosasi`
2. Upload semua file ke root repository
3. Pergi ke **Settings → Pages**
4. Source: pilih **Deploy from a branch** → branch `main` → folder `/ (root)`
5. Klik **Save**
6. Buka `https://username.github.io/jcosasi`

---

## ✏️ Cara Update Konten

### Ganti Info Kontak / Sosmed
Buka `index.html`, cari bagian `<!-- KONTAK -->` dan update:
- Email: cari `jcosasi@email.com`
- Instagram: ganti `href="#"` pada tombol Instagram dengan link Instagram kamu
- TikTok & YouTube: sama seperti di atas

### Tambah Nama Pengurus
Cari bagian `<!-- PENGURUS -->` di `index.html`.
Ganti kartu jabatan dengan nama pengurus sesungguhnya, contoh:
```html
<h4>Ketua Umum</h4>
<p>Nama Ketua di sini</p>
```

### Tambah Foto Galeri
Untuk menambahkan galeri foto kegiatan, tambahkan section baru sebelum `<!-- KONTAK -->`:
```html
<section id="galeri">
  <div class="container">
    <h2>Galeri Kegiatan</h2>
    <div class="galeri-grid">
      <img src="foto1.jpg" alt="Deskripsi foto" />
      <!-- tambah foto lainnya -->
    </div>
  </div>
</section>
```
Dan upload foto ke folder yang sama dengan `index.html`.

### Update Warna Tema
Buka `style.css`, bagian `:root` di awal file. Kamu bisa mengubah variabel warna utama:
```css
--purple-deep:  #3D1A5E;  /* Warna utama */
--red-jp:       #C0392B;  /* Aksen merah */
```

---

## 🌸 Fitur yang Ada

- ✅ Navbar responsif dengan scroll effect
- ✅ Mobile menu (hamburger)
- ✅ Hero section dengan animasi sakura
- ✅ Section Tentang, Visi Misi
- ✅ 10 Program Kerja dengan filter kategori
- ✅ Timeline interaktif 2026–2027
- ✅ Struktur Pengurus
- ✅ Section Kontak & Social Media
- ✅ Animasi scroll (fade in on scroll)
- ✅ Fully responsive (mobile, tablet, desktop)

---

## 📝 Yang Perlu Diperbarui

- [ ] Link Instagram, TikTok, YouTube JCOSASI
- [ ] Email resmi JCOSASI
- [ ] Nama-nama pengurus inti Angkatan 12
- [ ] Foto galeri kegiatan (opsional, bisa ditambah nanti)
- [ ] Username GitHub di link

---

Made with 💜 for JCOSASI — Japanese Community of Satu Bekasi
