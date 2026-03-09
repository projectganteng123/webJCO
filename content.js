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
    use_image:  false,
    path:       "./logo-jcosasi.png",   // ganti dengan nama file logo kamu
    alt:        "Logo JCOSASI",
    width_nav:  "40px",
    width_hero: "120px",
  },

  /* ── KONTAK & SOSMED ──────────────────────────────── */
  kontak: {
    email:     "jcosasi@email.com",         // ← ganti email resmi
    instagram: "https://instagram.com/jcosasi",  // ← ganti link Instagram
    tiktok:    "https://tiktok.com/@jcosasi",    // ← ganti link TikTok
    youtube:   "https://youtube.com/@jcosasi",   // ← ganti link YouTube
    /**
     * Untuk menyembunyikan sosmed yang belum ada, ubah show menjadi false
     */
    show_instagram: true,
    show_tiktok:    true,
    show_youtube:   true,
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
    ],
  },

  /* ── HERO SECTION ─────────────────────────────────── */
  hero: {
    badge:      "Program Kerja · Periode 2026–2027",
    jp_accent:  "学び、創り、",
    headline:   "Tumbuh Bersama",
    subtitle:   "JCOSASI",
    desc:       "Japanese Community of Satu Bekasi — Ekstrakurikuler bahasa Jepang SMKN 1 Cikarang Barat. Ini adalah ruang belajar, berproses, dan bertumbuh untuk seluruh anggota.",
    highlights: [
      "Berdiri sejak 2013",
      "30+ Anggota Aktif",
      "15 Program Kerja",
      "Target JLPT N4",
    ],
    cta_text:   "Lihat Program Kerja",
    cta_href:   "#proker",
  },

  /* ── TENTANG ──────────────────────────────────────── */
  tentang: {
    label:   "アバウト — Tentang Kami",
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
      tags:   ["学習", "創造", "成長", "組織"],
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
    label:   "プログラム — Program Kerja",
    heading: "15 Program Kerja<br/><em>Periode 2026–2027</em>",
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
        chips: ["Nihongo Start Class", "Kotoba Mingguan", "Kaiwa Time"],
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
   * Setelah deploy Google Apps Script sebagai Web App:
   * 1. Salin URL deployment (bentuk: https://script.google.com/macros/s/.../exec)
   * 2. Tempel di bawah menggantikan teks "PASTE_URL_APPS_SCRIPT_KAMU_DI_SINI"
   */
  api: {
    url: "https://script.google.com/macros/s/AKfycbzwOgklEWZn6ts5--DnFpM9eqoWsUtlQ_Nux-LhmkVQ1viH0NGAG2vXcO3sLqjLVl5E/exec",
    //
    // Contoh URL asli:
    // url: "https://script.google.com/macros/s/AKfycbXXXXXXXXXXX/exec",
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
    label:   "メンバー — Tim Pengurus",
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
        { num: "15",  label: "Program Kerja" },
        { num: "6",   label: "Bidang MB"     },
        { num: "30+", label: "Anggota"       },
      ],
      jp_quote:    "学び、創り、成長する",
      id_quote:    "Belajar, Berkarya, Bertumbuh",
    },
  },

  /* ── FOOTER ───────────────────────────────────────── */
  footer: {
    copy:       "© 2026 JCOSASI Angkatan 12 · Periode 2026–2027",
    jp_closing: "ありがとうございます 🌸",
  },

  /* ── PROKER DETAIL ────────────────────────────────────
   * Data detail untuk halaman masing-masing proker.
   * Key = nomor proker (string 2 digit: "01", "02", dst)
   *
   * Untuk konten dinamis (pemberitahuan, dokumentasi, activity):
   * → diambil dari Google Sheets (sheet: proker_notif, proker_docs, proker_activity)
   * → data di sini hanya untuk bagian DESKRIPSI (statis)
   * ─────────────────────────────────────────────────── */
  prokerDetail: {

    "01": {
      slug: "pembelajaran-bahasa-jepang",
      tujuan: "Membangun kemampuan bahasa Jepang anggota secara bertahap dan konsisten, mulai dari penguasaan aksara (hiragana, katakana), kosakata, tata bahasa, hingga percakapan dasar yang setara dengan standar JLPT N4.",
      waktu: "Setiap Jumat, selama periode kepengurusan 2026–2027",
      lokasi: "Ruang kelas SMKN 1 Cikarang Barat (menyesuaikan jadwal)",
      target_peserta: "Seluruh anggota aktif kelas 10 dan 11",
      estimasi_tanggal: "2026-08-01",
      is_rutin: true,
      rab: [
        { item: "Fotokopi materi belajar", biaya: "Rp 50.000 / bulan" },
        { item: "Alat tulis & papan tulis", biaya: "Rp 30.000 / semester" },
      ],
      panitia: [{ jabatan: "Penanggung Jawab", nama: "Bidang Akademik" }],
      pemateri: [{ nama: "Sensei / Guru Pembimbing", peran: "Pengajar utama bahasa Jepang" }],
    },

    "02": {
      slug: "bidang-akademik",
      tujuan: "Menyediakan tiga program akademik terstruktur — Nihongo Start Class, Kotoba Mingguan, dan Kaiwa Time — agar setiap anggota memiliki fondasi bahasa Jepang yang kuat dan terukur.",
      waktu: "Setiap minggu, terintegrasi dalam hari eskul",
      lokasi: "SMKN 1 Cikarang Barat",
      target_peserta: "Anggota kelas 10 dan 11",
      estimasi_tanggal: "2026-08-01",
      is_rutin: true,
      rab: [
        { item: "Materi Nihongo Start Class", biaya: "Rp 40.000 / semester" },
        { item: "Kartu Kotoba Mingguan", biaya: "Rp 20.000 / semester" },
      ],
      panitia: [{ jabatan: "Penanggung Jawab", nama: "Bidang Akademik" }],
      pemateri: [{ nama: "Pengurus Bidang Akademik", peran: "Fasilitator program" }],
    },

    "03": {
      slug: "proyek-minat-bakat",
      tujuan: "Memberikan ruang ekspresi kreatif bagi anggota melalui 6 bidang minat bakat — music cover, dance cover, cosplay, fan art, fan fiction, dan budaya Jepang — sehingga setiap anggota memiliki karya nyata yang bisa dibanggakan.",
      waktu: "Setiap Kamis, selama periode kepengurusan",
      lokasi: "SMKN 1 Cikarang Barat & lokasi menyesuaikan bidang",
      target_peserta: "Seluruh anggota aktif",
      estimasi_tanggal: "2026-08-01",
      is_rutin: true,
      rab: [
        { item: "Properti & kostum (Cosplay)", biaya: "Menyesuaikan proyek" },
        { item: "Peralatan rekam (Music/Dance)", biaya: "Menyesuaikan proyek" },
        { item: "Alat gambar (Fan Art)", biaya: "Rp 50.000 / semester" },
      ],
      panitia: [{ jabatan: "Penanggung Jawab", nama: "Bidang Minat Bakat" }],
      pemateri: [],
    },

    "04": {
      slug: "bidang-organisasi-kekompakan",
      tujuan: "Membangun organisasi yang sehat dari dalam — melalui evaluasi rutin, sharing session, dan kegiatan bonding — sehingga setiap anggota merasa terhubung, didengar, dan berperan dalam perjalanan JCOSASI.",
      waktu: "Setiap bulan (Kamis atau Jumat), jadwal menyesuaikan",
      lokasi: "SMKN 1 Cikarang Barat",
      target_peserta: "Seluruh anggota kelas 10, 11, dan 12",
      estimasi_tanggal: "2026-08-01",
      is_rutin: true,
      rab: [
        { item: "Konsumsi sharing session", biaya: "Rp 50.000 / sesi" },
      ],
      panitia: [{ jabatan: "Penanggung Jawab", nama: "Bidang Organisasi" }],
      pemateri: [],
    },

    "05": {
      slug: "diklat",
      tujuan: "Membekali calon pengurus Angkatan 13 dengan pemahaman mendalam tentang nilai, sistem, dan tanggung jawab organisasi JCOSASI — agar regenerasi kepemimpinan berjalan mulus dan berkelanjutan.",
      waktu: "Estimasi: 25 Juli 2026",
      lokasi: "SMKN 1 Cikarang Barat (ruang menyesuaikan)",
      target_peserta: "Seluruh anggota Angkatan 13 (calon pengurus)",
      estimasi_tanggal: "2026-07-25",
      is_rutin: false,
      rab: [
        { item: "Konsumsi peserta & panitia", biaya: "Menyesuaikan jumlah peserta" },
        { item: "Materi & modul DIKLAT",      biaya: "Rp 100.000" },
        { item: "Sertifikat peserta",         biaya: "Rp 50.000" },
      ],
      panitia: [
        { jabatan: "Ketua Pelaksana", nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Acara",       nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Konsumsi",    nama: "[ Diisi pengurus ]" },
      ],
      pemateri: [
        { nama: "Pengurus Angkatan 12", peran: "Pemateri materi organisasi" },
        { nama: "Alumni JCOSASI",       peran: "Pemateri pengalaman & motivasi" },
      ],
    },

    "06": {
      slug: "demos-ekskul",
      tujuan: "Memperkenalkan JCOSASI kepada siswa baru SMKN 1 Cikarang Barat secara menarik dan berkesan — agar mereka mengenal, tertarik, dan termotivasi untuk bergabung sebagai anggota baru.",
      waktu: "Menyesuaikan jadwal MPLS sekolah",
      lokasi: "Lingkungan SMKN 1 Cikarang Barat",
      target_peserta: "Seluruh peserta MPLS (siswa baru)",
      estimasi_tanggal: "2026-07-14",
      is_rutin: false,
      rab: [
        { item: "Properti display & banner", biaya: "Rp 150.000" },
        { item: "Kostum penampilan",         biaya: "Menyesuaikan" },
        { item: "Brosur / flyer digital",    biaya: "Rp 30.000" },
      ],
      panitia: [
        { jabatan: "Ketua Pelaksana", nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Penampilan",  nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Humas",       nama: "[ Diisi pengurus ]" },
      ],
      pemateri: [],
    },

    "07": {
      slug: "jcosasi-tanjoubi-workshop",
      tujuan: "Merayakan hari jadi JCOSASI sebagai momen kebersamaan, apresiasi karya anggota, dan penguatan identitas komunitas — sekaligus menyelenggarakan workshop budaya Jepang yang edukatif dan menyenangkan.",
      waktu: "Estimasi: 22 Agustus 2026",
      lokasi: "SMKN 1 Cikarang Barat (aula / ruang menyesuaikan)",
      target_peserta: "Seluruh anggota aktif dan alumni JCOSASI",
      estimasi_tanggal: "2026-08-22",
      is_rutin: false,
      rab: [
        { item: "Dekorasi &amp; properti acara", biaya: "Rp 200.000" },
        { item: "Konsumsi peserta",              biaya: "Menyesuaikan jumlah hadir" },
        { item: "Hadiah lomba",                  biaya: "Rp 150.000" },
        { item: "Bahan workshop",                biaya: "Rp 100.000" },
      ],
      panitia: [
        { jabatan: "Ketua Pelaksana", nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Acara",       nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Dekorasi",    nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Konsumsi",    nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Dokumentasi", nama: "[ Diisi pengurus ]" },
      ],
      pemateri: [
        { nama: "[ Narasumber Workshop ]", peran: "Pemateri workshop budaya Jepang" },
      ],
    },

    "08": {
      slug: "pelantikan-anggota",
      tujuan: "Meresmikan calon anggota sebagai anggota tetap JCOSASI Angkatan 14 melalui prosesi pelantikan yang bermakna — sebagai bentuk komitmen dan penerimaan resmi ke dalam keluarga besar JCOSASI.",
      waktu: "Estimasi: 19 September 2026",
      lokasi: "SMKN 1 Cikarang Barat",
      target_peserta: "Calon anggota (Angkatan 14) yang telah memenuhi syarat",
      estimasi_tanggal: "2026-09-19",
      is_rutin: false,
      rab: [
        { item: "Konsumsi pelantikan",  biaya: "Menyesuaikan jumlah peserta" },
        { item: "Sertifikat anggota",   biaya: "Rp 75.000" },
        { item: "Properti pelantikan",  biaya: "Rp 80.000" },
      ],
      panitia: [
        { jabatan: "Ketua Pelaksana",  nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Acara",        nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Konsumsi",     nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Dokumentasi",  nama: "[ Diisi pengurus ]" },
      ],
      pemateri: [],
    },

    "09": {
      slug: "kolaborasi-class-meeting",
      tujuan: "Memperkenalkan budaya Jepang kepada seluruh warga sekolah melalui perlombaan bertema Jepang dalam momen class meeting — sekaligus memperkuat eksistensi JCOSASI di lingkungan SMKN 1 Cikarang Barat.",
      waktu: "Menyesuaikan jadwal class meeting sekolah",
      lokasi: "SMKN 1 Cikarang Barat",
      target_peserta: "Siswa/i SMKN 1 Cikarang Barat",
      estimasi_tanggal: "2026-12-01",
      is_rutin: false,
      rab: [
        { item: "Hadiah lomba",          biaya: "Rp 200.000" },
        { item: "Properti & dekorasi",   biaya: "Rp 100.000" },
        { item: "Perlengkapan lomba",    biaya: "Rp 80.000" },
      ],
      panitia: [
        { jabatan: "Koordinator",     nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Lomba",       nama: "[ Diisi pengurus ]" },
        { jabatan: "Kolaborasi OSIS", nama: "[ Koordinator OSIS ]" },
      ],
      pemateri: [],
    },

    "10": {
      slug: "serah-terima-jabatan",
      tujuan: "Menutup periode kepengurusan Angkatan 12 secara resmi dan bermartabat — menyerahkan tongkat estafet kepada Angkatan 13 sebagai wujud keberlanjutan organisasi yang terstruktur dan bertanggung jawab.",
      waktu: "Estimasi: 9 Januari 2027",
      lokasi: "SMKN 1 Cikarang Barat",
      target_peserta: "Seluruh anggota aktif JCOSASI",
      estimasi_tanggal: "2027-01-09",
      is_rutin: false,
      rab: [
        { item: "Konsumsi acara",     biaya: "Menyesuaikan jumlah hadir" },
        { item: "Kenang-kenangan",    biaya: "Rp 100.000" },
        { item: "Properti seremoni",  biaya: "Rp 50.000" },
      ],
      panitia: [
        { jabatan: "Ketua Pelaksana", nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Acara",       nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Dokumentasi", nama: "[ Diisi pengurus ]" },
      ],
      pemateri: [],
    },

    "11": {
      slug: "mengikuti-lomba",
      tujuan: "Membuktikan kualitas anggota JCOSASI di panggung kompetisi — mengasah kemampuan, membangun mental juara, dan membawa nama JCOSASI harum di berbagai ajang lomba bahasa dan budaya Jepang.",
      waktu: "Menyesuaikan jadwal lomba (sepanjang tahun)",
      lokasi: "Menyesuaikan penyelenggara lomba",
      target_peserta: "Anggota terpilih / pendaftar sukarela",
      estimasi_tanggal: "2026-09-01",
      is_rutin: false,
      rab: [
        { item: "Biaya pendaftaran lomba", biaya: "Menyesuaikan lomba" },
        { item: "Transportasi",            biaya: "Menyesuaikan lokasi" },
        { item: "Kostum / properti",       biaya: "Menyesuaikan kategori lomba" },
      ],
      panitia: [{ jabatan: "Penanggung Jawab", nama: "Bidang Humas &amp; Akademik" }],
      pemateri: [],
    },

    "12": {
      slug: "konten-kreatif-sosial-media",
      tujuan: "Mengubah setiap karya minat bakat anggota menjadi konten digital yang menarik dan layak tayang — membangun kehadiran JCOSASI di media sosial, menjangkau audiens lebih luas, dan mendokumentasikan perjalanan kreatif anggota.",
      waktu: "Mengikuti selesainya proyek minat bakat",
      lokasi: "Online (Instagram & TikTok JCOSASI)",
      target_peserta: "Anggota bidang minat bakat",
      estimasi_tanggal: "2026-09-01",
      is_rutin: true,
      rab: [
        { item: "Editing software / tools",  biaya: "Gratis (mobile apps)" },
        { item: "Properti foto/video",       biaya: "Menyesuaikan konten" },
      ],
      panitia: [{ jabatan: "Penanggung Jawab", nama: "Bidang Humas &amp; Minat Bakat" }],
      pemateri: [],
    },

    "13": {
      slug: "kintore-bersama",
      tujuan: "Membangun fisik yang kuat dan prima sebagai investasi jangka panjang — karena anggota JCOSASI tidak hanya belajar bahasa Jepang, tapi juga mempersiapkan diri secara fisik untuk menghadapi tantangan magang, bekerja, atau kehidupan nyata di Jepang.",
      waktu: "Sebulan sekali, setiap hari Minggu",
      lokasi: "Lapangan / gym / area terbuka (menyesuaikan)",
      target_peserta: "Seluruh anggota aktif JCOSASI",
      estimasi_tanggal: "2026-08-01",
      is_rutin: true,
      rab: [
        { item: "Konsumsi / minuman energi", biaya: "Rp 30.000 / sesi" },
        { item: "Sewa lapangan (jika perlu)", biaya: "Menyesuaikan lokasi" },
      ],
      panitia: [{ jabatan: "Penanggung Jawab", nama: "Bidang Organisasi" }],
      pemateri: [],
    },

    "14": {
      slug: "sharing-alumni",
      tujuan: "Menjembatani pengalaman nyata alumni dengan semangat anggota aktif — agar setiap anggota mendapat gambaran konkret tentang jalur kuliah, karir, dan kehidupan di Jepang, sekaligus mempererat silaturahmi lintas angkatan.",
      waktu: "Menyesuaikan ketersediaan alumni (direncanakan 2x per tahun)",
      lokasi: "Offline di SMKN 1 Cikarang Barat / Online via Zoom atau Meet",
      target_peserta: "Seluruh anggota aktif dan alumni JCOSASI",
      estimasi_tanggal: "2026-10-01",
      is_rutin: false,
      rab: [
        { item: "Konsumsi (jika offline)", biaya: "Rp 50.000 / sesi" },
        { item: "Platform meeting online", biaya: "Gratis (Zoom/Meet)" },
      ],
      panitia: [
        { jabatan: "Koordinator",         nama: "[ Diisi pengurus ]" },
        { jabatan: "Sie Hubungan Alumni", nama: "Bidang Humas" },
      ],
      pemateri: [
        { nama: "Alumni JCOSASI (Angkatan 1–11)", peran: "Narasumber berbagi pengalaman" },
      ],
    },

    "15": {
      slug: "proker-15",
      tujuan: "[ Tujuan proker ke-15 ]",
      waktu: "[ Waktu kegiatan ]",
      lokasi: "[ Lokasi kegiatan ]",
      target_peserta: "[ Target peserta ]",
      estimasi_tanggal: "2026-08-01",
      is_rutin: false,
      rab: [],
      panitia: [],
      pemateri: [],
    },

  },

};

// ── Ekspor untuk digunakan oleh script.js
// (Tidak perlu diubah)
if (typeof module !== "undefined") module.exports = CONTENT;
