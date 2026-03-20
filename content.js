/**
 * ============================================================
 *  JCOSASI LANDING PAGE — content.js
 *  File pusat semua konten teks landing page.
 *  Edit file ini untuk mengubah teks tanpa perlu buka index.html
 * ============================================================
 */

const CONTENT = {

  /* ── META ─────────────────────────────────────────── */
  meta: {
    title:       "JCOSASI — Program Kerja 2026–2027",
    description: "Program Kerja JCOSASI (Japanese Community of Satu Bekasi) Periode 2026–2027 — Ekstrakurikuler Bahasa Jepang SMKN 1 Cikarang Barat",
  },

  /* ── IDENTITAS ORGANISASI ─────────────────────────── */
  org: {
    nama_singkat:  "JCOSASI",
    nama_lengkap:  "Japanese Community of Satu Bekasi",
    sekolah:       "SMKN 1 Cikarang Barat",
    alamat:        "Cikarang Barat, Bekasi, Jawa Barat",
    berdiri:       "21 Agustus 2013",
    tahun_berdiri: "2013",
    angkatan_aktif: "Angkatan 12",
    periode:       "2026–2027",
    jumlah_anggota: "30+",
    jumlah_proker:  "15",
    bidang_mb:     "6",
  },

  /* ── LOGO ─────────────────────────────────────────── */
  logo: {
    /**
     * Untuk menggunakan logo asli:
     *   1. Upload file logo (PNG/SVG) ke folder yang sama dengan index.html
     *   2. Ubah path di bawah, contoh: "./logo-jcosasi.png"
     *   3. Ubah use_image menjadi: true
     */
    use_image:  true,
    path:       "./logo-jcosasi.png",   // ganti dengan nama file logo kamu
    alt:        "Logo JCOSASI",
    width_nav:  "40px",
    width_hero: "120px",
  },

/* ── KONTAK & SOSMED ──────────────────────────────── */
kontak: {
  email:     "jcosasi@email.com",             // ← ganti email resmi
  whatsapp:  "https://wa.me/6285760003526",   // ← ganti nomor WA (format internasional)
  instagram: "https://instagram.com/jcosasi", // ← ganti link Instagram
  tiktok:    "https://tiktok.com/@jcosasi",   // ← ganti link TikTok
  youtube:   "https://youtube.com/@jcosasi",  // ← ganti link YouTube

  /**
   * Untuk menyembunyikan sosmed yang belum ada, ubah show menjadi false
   */
  show_instagram: true,
  show_tiktok:    true,
  show_youtube:   true,
  show_whatsapp:  true
},

  /* ── NAVBAR ───────────────────────────────────────── */
  nav: {
    logo_text: "J-COSASI",
    logo_sub:  "2026–2027",
    links: [
      { label: "Tentang",        href: "#tentang"  },
      { label: "Visi Misi",      href: "#visi-misi"},
      { label: "Program Kerja",  href: "#proker"   },
      { label: "Timeline",       href: "#timeline" },
      { label: "Pengurus",       href: "#pengurus" },
      { label: "Kontak",         href: "#kontak"   },
      { label: "📊 Dashboard",   href: "proker.html?page=rekap" },
      { label: "📣 Pengumuman",  href: "pengumuman.html" }
    ],
  },

  /* ── HERO SECTION ─────────────────────────────────── */
  hero: {
    badge:      "Program Kerja · Periode 2026–2027",
    jp_accent:  "学び、成長し、共に輝く",
    headline:   "Tumbuh Bersama",
    subtitle:   "J-COSASI",
    desc:       "Japanese Community of Satu Bekasi — Ekstrakurikuler bahasa Jepang SMKN 1 Cikarang Barat. Ini adalah ruang belajar, berproses, dan bertumbuh untuk seluruh anggota.",
    highlights: [
      "Berdiri sejak 2013",
      "30+ Anggota Aktif",
      "14 Program Kerja",
      "Target JLPT N4",
    ],
    cta_text:   "Lihat Program Kerja",
    cta_href:   "#proker",
  },

  /* ── TENTANG ──────────────────────────────────────── */
  tentang: {
    label:   "私たちについて — Tentang Kami",
    heading: "Japanese Community<br/><em>of Satu Bekasi</em>",
    para1:   "JCOSASI berdiri sejak <strong>21 Agustus 2013</strong> di SMKN 1 Cikarang Barat. Selama lebih dari satu dekade, kami menjadi ruang belajar dan berkembang bagi siswa yang punya ketertarikan terhadap bahasa, budaya, dan dunia Jepang.",
    para2:   "Tidak hanya belajar bahasa secara formal bersama sensei, anggota juga diajak mengembangkan kreativitas, bekerja dalam tim, dan membangun pengalaman organisasi yang nyata untuk masa depan.",
    stats: [
      { num: "12+", label: "Tahun Berdiri"     },
      { num: "30+", label: "Anggota Aktif"     },
      { num: "6",   label: "Bidang Minat Bakat"},
    ],
    card: {
      badge:  "Angkatan 12",
      year:   "2026–2027",
      tags:   ["学習", "創造", "成長", "絆"],
      motto:  "\"Belajar, Berkarya, Bertumbuh\"",
    },
  },

  /* ── VISI & MISI ──────────────────────────────────── */
  visiMisi: {
    label:        "ビジョン — Arah Gerak",
    heading:      "Visi &amp; Misi",
    visi: {
      judul: "Visi",
      teks:  "Mewujudkan JCOSASI sebagai ekstrakurikuler sekaligus organisasi bahasa Jepang yang <strong>aktif, berkelanjutan, dan beridentitas kuat</strong> — sebagai ruang belajar, berproses, serta bertumbuh bagi seluruh anggotanya.",
    },
    misi_label: "ミッション — Misi",
    misi: [
      "Menanamkan dasar kemampuan bahasa Jepang secara <strong>bertahap, konsisten, dan aplikatif</strong> kepada seluruh anggota.",
      "Membangun sistem regenerasi organisasi yang terarah demi menjamin <strong>keberlangsungan JCOSASI</strong>.",
      "Mengembangkan kegiatan organisasi yang <strong>edukatif, kreatif</strong>, dan relevan dengan minat anggota.",
      "Memperkuat identitas JCOSASI sebagai eskul bahasa Jepang yang <strong>aktif, solid, dan bernilai</strong>.",
      "Menciptakan lingkungan organisasi yang <strong>suportif, inklusif</strong>, dan menjunjung kebersamaan.",
    ],
  },

  /* ── PROGRAM KERJA ────────────────────────────────── */
  proker: {
    label:   "年間活動 — Program Kerja",
    heading: "14 Program Kerja<br/><em>Periode 2026–2027</em>",
    desc:    "Dijalankan oleh Pengurus JCOSASI Angkatan 12 untuk seluruh anggota aktif.",
    items: [
      {
        num:   "01", icon: "📚", cat: "rutin akademik",
        tag:   "Rutin",         tag_class: "tag-rutin",
        judul: "Pembelajaran Bahasa Jepang",
        desc:  "Belajar bahasa Jepang bukan hanya soal hafalan — di JCOSASI, belajar dilakukan secara terstruktur dan menyenangkan bersama <em>sensei</em> setiap hari Jumat. Mulai dari aksara, kosakata, hingga tata bahasa, semua dipelajari secara bertahap menggunakan buku <strong>Minna no Nihongo</strong>.",
        detail: [
          { label: "🕐 Waktu",   val: "Setiap Jumat" },
          { label: "👥 Sasaran", val: "Kelas 10 &amp; 11" },
          { label: "🎯 Target",  val: "Kemampuan setara JLPT N4" },
          { label: "⏱️ Durasi",  val: "± 2–3 jam per pertemuan" },
        ],
        // chips dihapus — materi sudah tercakup di Proker 02
      },
      {
        num:   "02", icon: "🏫", cat: "rutin akademik",
        tag:   "Akademik",     tag_class: "tag-akademik",
        judul: "Bidang Akademik Bahasa Jepang",
        desc:  "Tiga program akademik terstruktur untuk memastikan setiap anggota memiliki fondasi bahasa Jepang yang kuat sebelum naik ke materi berikutnya.",
        detail: [
          { label: "🕐 Waktu",   val: "Setiap minggu" },
          { label: "👥 Sasaran", val: "Kelas 10 &amp; 11" },
        ],
        akademik: [
          { judul: "Nihongo Start Class", desc: "Hiragana, Katakana, dan percakapan dasar untuk anggota baru" },
          { judul: "Kotoba Mingguan",     desc: "Kosakata tematik setiap minggu yang langsung bisa dipakai sehari-hari" },
          { judul: "Kaiwa Time",          desc: "Sesi latihan percakapan bersama pengurus dan sensei" },
        ],
      },
      {
        num:   "03", icon: "🎨", cat: "rutin",
        tag:   "Rutin",         tag_class: "tag-rutin",
        judul: "Proyek Minat &amp; Bakat",
        desc:  "Selain bahasa, anggota bebas memilih satu atau lebih bidang minat bakat sesuai passion mereka. Setiap bidang punya proyek karya yang bisa ditampilkan di berbagai acara.",
        detail: [
          { label: "🕐 Waktu",   val: "Setiap Kamis" },
          { label: "👥 Sasaran", val: "Seluruh anggota" },
        ],
        mb: [
          "🎵 Music Cover", "💃 Dance Cover", "👘 Cosplay",
          "🖌️ Fan Art", "📖 Fan Fiction", "🏯 Budaya Jepang",
        ],
      },
      {
        num:   "04", icon: "🤝", cat: "rutin organisasi",
        tag:   "Organisasi",    tag_class: "tag-organisasi",
        judul: "Bidang Organisasi &amp; Kekompakan",
        desc:  "Ruang untuk anggota saling berbagi, mengevaluasi, dan memperkuat kekompakan tim. Kegiatan ini membangun fondasi organisasi yang sehat.",
        detail: [
          { label: "🕐 Waktu",   val: "Setiap bulan" },
          { label: "👥 Sasaran", val: "Kelas 10, 11 &amp; 12" },
        ],
        org: [
          { judul: "Evaluasi Bulanan",  desc: "meninjau perkembangan organisasi &amp; pembelajaran" },
          { judul: "Sharing Session",   desc: "diskusi ringan &amp; berbagi pengalaman antaranggota" },
          { judul: "Nonton &amp; Diskusi", desc: "menonton konten Jepang, dilanjut diskusi" },
        ],
      },
      {
        num:   "05", icon: "🎓", cat: "event organisasi",
        tag:   "Event",         tag_class: "tag-event",
        judul: "DIKLAT",
        desc:  "Pembekalan materi dan pemahaman organisasi kepada Angkatan 13 sebagai persiapan sebelum menjalankan tugas kepengurusan.",
        detail: [
          { label: "📅 Estimasi", val: "25 Juli 2026" },
          { label: "👥 Sasaran",  val: "Angkatan 13" },
          { label: "📌 Tujuan",   val: "Kaderisasi &amp; regenerasi" },
        ],
      },
      {
        num:   "06", icon: "📢", cat: "event",
        tag:   "Event",         tag_class: "tag-event",
        judul: "DEMOS Ekskul",
        desc:  "Perkenalan JCOSASI kepada peserta didik baru SMKN 1 Cikarang Barat. Menampilkan program, aktivitas, dan atmosfer komunitas agar siswa baru tertarik bergabung.",
        detail: [
          { label: "📅 Estimasi", val: "Menyesuaikan MPLS" },
          { label: "👥 Sasaran",  val: "Peserta MPLS (Siswa Baru)" },
          { label: "📌 Tujuan",   val: "Rekrutmen anggota baru" },
        ],
      },
      {
        num:   "07", icon: "🎉", cat: "event",
        tag:   "Event",         tag_class: "tag-event",
        judul: "JCOSASI Tanjoubi &amp; Workshop",
        desc:  "Perayaan hari jadi JCOSASI yang disertai workshop budaya Jepang. Momen kebersamaan, lomba bertema Jepang, dan mempererat hubungan antar anggota serta alumni.",
        detail: [
          { label: "📅 Estimasi", val: "22 Agustus 2026" },
          { label: "👥 Sasaran",  val: "Seluruh anggota &amp; alumni" },
          { label: "📌 Agenda",   val: "Workshop, lomba, kebersamaan" },
        ],
      },
      {
        num:   "08", icon: "🏅", cat: "event organisasi",
        tag:   "Event",         tag_class: "tag-event",
        judul: "Pelantikan Anggota",
        desc:  "Pengangkatan calon anggota menjadi anggota resmi JCOSASI Angkatan 14. Bagian penting dari proses regenerasi organisasi yang berkesinambungan.",
        detail: [
          { label: "📅 Estimasi", val: "19 September 2026" },
          { label: "👥 Sasaran",  val: "Calon anggota (Angkatan 14)" },
          { label: "📌 Output",   val: "Anggota resmi JCOSASI" },
        ],
      },
      {
        num:   "09", icon: "🤜", cat: "event",
        tag:   "Event",         tag_class: "tag-event",
        judul: "Kolaborasi Class Meeting",
        desc:  "Berkolaborasi dengan OSIS dalam penyelenggaraan perlombaan bertema budaya Jepang, seperti lomba cosplay. Memperkenalkan budaya Jepang ke seluruh warga sekolah.",
        detail: [
          { label: "📅 Estimasi",  val: "Menyesuaikan" },
          { label: "👥 Sasaran",   val: "Siswa/i SMKN 1 Cikarang Barat" },
          { label: "🤝 Kolaborasi",val: "Bersama OSIS" },
        ],
      },
      {
        num:   "10", icon: "🔁", cat: "event organisasi",
        tag:   "Organisasi",    tag_class: "tag-organisasi",
        judul: "Serah Terima Jabatan",
        desc:  "Penyerahan jabatan dari Angkatan 12 kepada Angkatan 13 sebagai bentuk keberlanjutan organisasi. Penutup resmi periode kepengurusan 2026–2027.",
        detail: [
          { label: "📅 Estimasi", val: "9 Januari 2027" },
          { label: "👥 Sasaran",  val: "Seluruh anggota JCOSASI" },
          { label: "📌 Makna",    val: "Regenerasi kepemimpinan" },
        ],
      },
      {
        num:   "11", icon: "🏆", cat: "lainlain",
        tag:   "Lain-lain",    tag_class: "tag-lainlain",
        judul: "Mengikuti Lomba",
        desc:  "JCOSASI bukan hanya tempat belajar — kami juga tampil dan bersaing. Setiap tahun, anggota JCOSASI aktif mengikuti berbagai kompetisi bertema bahasa dan budaya Jepang, mulai dari lomba pidato (<em>speech contest</em>), penulisan, cosplay, dance cover, hingga kuis kebudayaan Jepang. Ini adalah ruang untuk membuktikan bahwa belajar di JCOSASI punya hasil nyata.",
        detail: [
          { label: "📅 Waktu",    val: "Menyesuaikan jadwal lomba" },
          { label: "👥 Sasaran",  val: "Anggota terpilih / sukarela" },
          { label: "🏅 Kategori", val: "Bahasa &amp; Budaya Jepang" },
          { label: "🎯 Tujuan",   val: "Mengasah kemampuan &amp; prestasi" },
        ],
        chips: ["Speech Contest", "Dance Cover", "Cosplay", "Quiz Budaya Jepang"],
      },
      {
        num:   "12", icon: "📱", cat: "rutin lainlain",
        tag:   "Rutin",        tag_class: "tag-rutin",
        judul: "Konten Kreatif &amp; Sosial Media",
        desc:  "Karya anggota layak untuk dilihat dunia. Setiap proyek yang dihasilkan dari bidang minat &amp; bakat — mulai dari cover lagu, dance, cosplay, fan art, hingga konten budaya Jepang — akan dikemas dan dipublikasikan ke media sosial JCOSASI. Ini bukan sekadar pamer karya, tapi cara kami memperkenalkan JCOSASI ke khalayak luas dan membangun jejak digital yang positif.",
        detail: [
          { label: "📅 Waktu",     val: "Mengikuti selesainya proyek MB" },
          { label: "👥 Sasaran",   val: "Seluruh anggota minat bakat" },
          { label: "📲 Platform",  val: "Instagram &amp; TikTok" },
          { label: "🎬 Konten",    val: "Output proyek minat &amp; bakat" },
        ],
        chips: ["Instagram Reels", "TikTok", "Feed &amp; Story", "Behind The Scene"],
      },
      {
        num:   "13", icon: "💪", cat: "rutin lainlain",
        tag:   "Rutin",        tag_class: "tag-rutin",
        judul: "筋トレ — Kintore Bersama",
        desc:  "Di Jepang, etos kerja yang tinggi diimbangi dengan tubuh yang kuat. Maka dari itu, JCOSASI menghadirkan <strong>Kintore (筋トレ / 筋肉トレーニング)</strong> — sesi latihan kekuatan bersama setiap bulan sekali di hari Minggu. Bukan sekadar olahraga biasa, ini adalah bentuk persiapan nyata agar anggota memiliki fisik yang prima untuk menghadapi tantangan magang, bekerja, atau kehidupan di Jepang.",
        detail: [
          { label: "📅 Waktu",    val: "Sebulan sekali, hari Minggu" },
          { label: "👥 Sasaran",  val: "Seluruh anggota JCOSASI" },
          { label: "🏋️ Aktivitas",val: "Latihan kekuatan &amp; kebugaran" },
          { label: "🎯 Tujuan",   val: "Fisik prima untuk magang/kerja Jepang" },
        ],
        chips: ["体力づくり (Tairyoku)", "気合い (Kiai)", "一緒に (Issho ni)"],
      },
      {
        num:   "14", icon: "🫂", cat: "rutin lainlain",
        tag:   "Rutin",        tag_class: "tag-rutin",
        judul: "Sharing Bersama Alumni",
        desc:  "Ada yang lebih berharga dari teori — yaitu pengalaman nyata. Dalam sesi ini, alumni JCOSASI hadir berbagi cerita tentang perjalanan mereka setelah lulus: lanjut kuliah, bekerja, atau meraih impian ke Jepang. Anggota mendapat gambaran nyata tentang dunia setelah sekolah, sekaligus memperkuat tali silaturahmi antargenerasi JCOSASI. Karena di sini, alumni bukan hanya kenangan — mereka adalah bagian dari perjalanan bersama.",
        detail: [
          { label: "📅 Waktu",     val: "Menyesuaikan ketersediaan alumni" },
          { label: "👥 Sasaran",   val: "Seluruh anggota aktif &amp; alumni" },
          { label: "🗣️ Topik",     val: "Kuliah, kerja, magang ke Jepang" },
          { label: "🤝 Format",    val: "Offline / Online (menyesuaikan)" },
        ],
        chips: ["Alumni Talk", "Tanya Jawab", "Networking", "Silaturahmi"],
      },
    ],
  },

  /* ── TIMELINE ─────────────────────────────────────── */
  timeline: {
    label:   "タイムライン — Alur Kegiatan",
    heading: "Timeline Kegiatan<br/><em>2026–2027</em>",
    items: [
      {
        bulan:  "Juli 2026",
        judul:  "DIKLAT Angkatan 13",
        desc:   "Pembekalan materi &amp; organisasi kepada calon pengurus Angkatan 13.",
        tanggal:"Est. 25 Juli 2026",
        soft:   false,
      },
      {
        bulan:  "Agustus 2026",
        judul:  "DEMOS Ekskul &amp; JCOSASI Tanjoubi",
        desc:   "Perkenalan ke siswa baru (MPLS) + Perayaan HUT JCOSASI dengan workshop dan lomba.",
        tanggal:"Est. 22 Agustus 2026",
        soft:   false,
      },
      {
        bulan:  "September 2026",
        judul:  "Pelantikan Anggota Baru",
        desc:   "Pengangkatan calon anggota menjadi anggota resmi JCOSASI Angkatan 14.",
        tanggal:"Est. 19 September 2026",
        soft:   false,
      },
      {
        bulan:  "Sepanjang Tahun",
        judul:  "Program Rutin &amp; Minat Bakat",
        desc:   "Pembelajaran bahasa Jepang, minat &amp; bakat, sharing session, evaluasi bulanan, dan kolaborasi class meeting berjalan sepanjang tahun.",
        tanggal:"Setiap Kamis &amp; Jumat",
        soft:   true,
      },
      {
        bulan:  "Januari 2027",
        judul:  "Serah Terima Jabatan",
        desc:   "Pergantian kepemimpinan dari Angkatan 12 ke Angkatan 13. Penutup resmi periode kepengurusan.",
        tanggal:"Est. 9 Januari 2027",
        soft:   false,
      },
    ],
  },

  /* ── GOOGLE SHEETS API ────────────────────────────── */
  /**
   * url → deployment READ-ONLY (gas_readonly.js)
   *        Dipakai oleh: index.html, proker.html, rekap.html
   *        Hanya bisa membaca data — tidak bisa write sama sekali.
   *
   * Setelah deploy gas_readonly.js sebagai Web App:
   * 1. Salin URL deployment-nya (bentuk: https://script.google.com/macros/s/.../exec)
   * 2. Tempel di bawah menggantikan "PASTE_URL_READONLY_DI_SINI"
   *
   * JANGAN isi URL gas_v7.js (write) di sini — file ini bisa dilihat publik!
   * URL write + token hanya boleh ada di app.js (editor internal).
   */
  api: {
    url: "https://script.google.com/macros/s/AKfycbzwOgklEWZn6ts5--DnFpM9eqoWsUtlQ_Nux-LhmkVQ1viH0NGAG2vXcO3sLqjLVl5E/exec",
  },

  /* ── PENGURUS ─────────────────────────────────────── */
  /**
   * Data pengurus sekarang diambil OTOMATIS dari Google Sheets.
   * Bagian ini hanya dipakai sebagai FALLBACK jika Sheets tidak bisa diakses.
   *
   * Label dan heading masih dikontrol dari sini.
   * Untuk mengubah nama/kelas pengurus → edit langsung di Google Sheets.
   */
  pengurus: {
    label:   "役員紹介 — Tim Pengurus",
    heading: "Struktur Pengurus<br/><em>Angkatan 12</em>",
    desc:    "Periode kepengurusan 2026–2027 dijalankan oleh pengurus JCOSASI Angkatan 12.",
    catatan: "Untuk informasi lengkap struktur kepengurusan, lihat dokumen resmi Program Kerja JCOSASI Angkatan 12.",

    /* Fallback — dipakai jika Google Sheets gagal dimuat */
    struktur: {
      ketua:      { jabatan: "Ketua Umum",    nama: "–", kelas: "–", photo: "", icon: "👑", desc: "Memimpin dan mengkoordinasi seluruh program kerja organisasi" },
      wakil:      { jabatan: "Wakil Ketua",   nama: "–", kelas: "–", photo: "", icon: "🌟", desc: "Mendampingi ketua dan mengoordinasikan bidang-bidang" },
      sekretaris: { jabatan: "Sekretaris",    nama: "–", kelas: "–", photo: "", icon: "📝", desc: "Mengelola administrasi dan dokumentasi organisasi" },
      bendahara:  { jabatan: "Bendahara",     nama: "–", kelas: "–", photo: "", icon: "💰", desc: "Mengatur keuangan dan anggaran kegiatan" },
    },
    bidang: [
      { jabatan: "Bidang Akademik",    nama: "–", kelas: "–", photo: "", icon: "📚", desc: "Mengelola program pembelajaran bahasa Jepang" },
      { jabatan: "Bidang Minat Bakat", nama: "–", kelas: "–", photo: "", icon: "🎨", desc: "Mengembangkan 6 divisi minat & bakat anggota" },
      { jabatan: "Bidang Organisasi",  nama: "–", kelas: "–", photo: "", icon: "🤝", desc: "Menjaga kekompakan dan dinamika internal" },
      { jabatan: "Bidang Humas",       nama: "–", kelas: "–", photo: "", icon: "📣", desc: "Mengelola komunikasi dan kegiatan eksternal" },
    ],
  },

  /* ── KONTAK SECTION ───────────────────────────────── */
  kontakSection: {
    label:    "コンタクト — Hubungi Kami",
    heading:  "Tetap Terhubung<br/>dengan <em>JCOSASI</em>",
    desc:     "Punya pertanyaan tentang program kerja, kegiatan, atau ingin tahu lebih lanjut tentang JCOSASI? Jangan ragu untuk menghubungi kami!",
    card: {
      badge:  "Kepengurusan",
      year:   "2026–2027",
      stats: [
        { num: "14",  label: "Program Kerja" },
        { num: "6",   label: "Bidang MB"     },
        { num: "30+", label: "Anggota"       },
      ],
      jp_quote:    "共に学び、共に輝こう",
      id_quote:    "Belajar, Berkarya, Bertumbuh",
    },
  },

  /* ── FOOTER ───────────────────────────────────────── */
  footer: {
    copy:       "© 2026 JCOSASI Angkatan 12 · Periode 2026–2027",
    jp_closing: "ありがとうございます 🌸",
  },

  /* ── PROKER DETAIL ──────────────────────────────────
   * Konten detail proker (tujuan, waktu, lokasi, panitia, RAB, dll)
   * sepenuhnya diambil dari Google Sheets — sheet: proker_detail
   * Tidak ada data statis di sini sejak v3.
   * ─────────────────────────────────────────────────── */

};

// ── Ekspor untuk digunakan oleh script.js
// (Tidak perlu diubah)
if (typeof module !== "undefined") module.exports = CONTENT;
