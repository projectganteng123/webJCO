/**
 * ============================================================
 *  JCOSASI Landing Page — script.js
 * ============================================================
 */
const $ = (id) => document.getElementById(id);
const set = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };
const setText = (id, text) => { const el = $(id); if (el) el.textContent = text; };

function buildNavLogo(logo, org) {
  if (logo.use_image && logo.path) {
    return `<img src="${logo.path}" alt="${logo.alt}" class="logo-img-nav" />
      <div class="nav-logo-text"><span class="logo-kanji">${org.nama_singkat}</span><span class="logo-sub">${org.periode}</span></div>`;
  }
  return `<div class="logo-placeholder logo-placeholder-nav" title="Logo belum tersedia — ubah di content.js">
      <span class="logo-placeholder-icon">🌸</span><span class="logo-placeholder-text">LOGO</span></div>
    <div class="nav-logo-text"><span class="logo-kanji">${org.nama_singkat}</span><span class="logo-sub">${org.periode}</span></div>`;
}

function buildHeroLogoDeco(logo, org) {
  if (logo.use_image && logo.path) {
    return `<img src="${logo.path}" alt="${logo.alt}" class="hlp-img" /><span class="hlp-hint">${org.nama_singkat}</span>`;
  }
  return `<div class="hlp-box" title="Ganti logo di content.js">
      <span class="hlp-icon">🌸</span><span class="hlp-label">LOGO<br/>${org.nama_singkat}</span></div>
    <span class="hlp-hint">Tambahkan logo di<br/>content.js → logo.path</span>`;
}

function buildVcLogo(logo) {
  if (logo.use_image && logo.path) return `<img src="${logo.path}" alt="${logo.alt}" class="vc-logo-img" />`;
  return `<div class="vc-logo-ph"><span>🌸</span><span>LOGO</span></div>`;
}

function buildOrgPhoto(photo, icon) {
  if (photo) return `<div class="org-photo"><img src="${photo}" alt="foto" /></div>`;
  return `<div class="org-photo"><div class="org-photo-ph"><span class="org-ph-icon">${icon}</span><span class="org-ph-text">Foto</span></div></div>`;
}

function buildOrgCard(data) {
  const namaClass  = data.nama.includes('[')  ? 'org-nama placeholder'  : 'org-nama';
  const kelasClass = data.kelas.includes('[') ? 'org-kelas placeholder' : 'org-kelas';
  return `${buildOrgPhoto(data.photo, data.icon)}
    <div class="org-jabatan">${data.jabatan}</div>
    <div class="${namaClass}">${data.nama}</div>
    <div class="${kelasClass}">${data.kelas}</div>
    <div class="org-desc">${data.desc}</div>`;
}

/* ── Shared cache helpers (dipakai juga oleh proker-script.js via key sama) ── */
function _jcosasiCacheKey(api) {
  try { return 'jcosasi_v1_' + btoa(api).slice(0, 20).replace(/[^a-z0-9]/gi,''); }
  catch(e) { return 'jcosasi_v1_default'; }
}
function _jcosasiJSONP(url) {
  return new Promise(function(resolve, reject) {
    var uid = '_jcb_pre_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    var sid = 'jsonp_' + uid;
    var t   = setTimeout(function() { cleanup(); reject(new Error('timeout')); }, 12000);
    window[uid] = function(data) { cleanup(); resolve(data); };
    function cleanup() {
      clearTimeout(t); delete window[uid];
      var el = document.getElementById(sid); if (el) el.remove();
    }
    var el = document.createElement('script');
    el.id  = sid; el.src = url + '&callback=' + uid;
    el.onerror = function() { cleanup(); reject(new Error('load failed')); };
    document.head.appendChild(el);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const C = CONTENT, O = C.org, L = C.logo, KT = C.kontak;

  document.title = C.meta.title;

  /* NAV */
  set('navLogoWrap', buildNavLogo(L, O));
  // Render nav — link eksternal (bukan #anchor) tidak ikut active-scroll logic
  set('navLinks', C.nav.links.map(l => {
    const isExt = !l.href.startsWith('#');
    return `<li><a href="${l.href}"${isExt?' class="nav-ext"':''} ${isExt?'':''} >${l.label}</a></li>`;
  }).join(''));
  set('mobileLinks', C.nav.links.map(l => {
    const isExt = !l.href.startsWith('#');
    return `<li><a href="${l.href}" class="mm-link${isExt?' mm-link-ext':''}">${l.label}</a></li>`;
  }).join(''));

  /* HERO */
  set('heroBadge', C.hero.badge);
  set('heroJp', C.hero.jp_accent);
  set('heroHeadline', C.hero.headline);
  set('heroSubtitle', C.hero.subtitle);
  set('heroDesc', C.hero.desc);
  set('heroHighlights', C.hero.highlights.map(h => `<div class="hl-item"><span class="hl-icon">✦</span> ${h}</div>`).join(''));
  const cta = $('heroCta');
  if (cta) { cta.href = C.hero.cta_href; cta.innerHTML = `${C.hero.cta_text} <span>→</span>`; }
  set('heroLogoDeco', buildHeroLogoDeco(L, O));

  /* TENTANG */
  set('tentangLabel', C.tentang.label);
  set('tentangHeading', C.tentang.heading);
  set('tentangPara1', C.tentang.para1);
  set('tentangPara2', C.tentang.para2);
  set('tentangStats', C.tentang.stats.map(s =>
    `<div class="stat"><span class="stat-num">${s.num}</span><span class="stat-label">${s.label}</span></div>`).join(''));
  set('vcBadge', C.tentang.card.badge);
  set('vcYear',  C.tentang.card.year);
  set('vcTags',  C.tentang.card.tags.map(t => `<span class="tag">${t}</span>`).join(''));
  set('vcMotto', C.tentang.card.motto);
  set('vcLogoBox', buildVcLogo(L));

  /* VISI MISI */
  set('vmLabel', C.visiMisi.label);
  set('vmHeading', C.visiMisi.heading);
  set('visiJudul', C.visiMisi.visi.judul);
  set('visiTeks', C.visiMisi.visi.teks);
  set('misiLabel', C.visiMisi.misi_label);
  set('misiList', C.visiMisi.misi.map((m, i) =>
    `<li><span class="misi-num">${String(i+1).padStart(2,'0')}</span><span>${m}</span></li>`).join(''));

  /* PROKER */
  set('prokerLabel', C.proker.label);
  set('prokerHeading', C.proker.heading);
  set('prokerDesc', C.proker.desc);
  set('prokerGrid', C.proker.items.map((p, i) => {
    const delay = i % 2 === 1 ? ' delay-1' : '';
    let extra = '';
    if (p.chips && Array.isArray(p.chips) && p.chips.length)
      extra = `<div class="pc-sub-programs">${p.chips.map(c=>`<span class="sub-p">${c}</span>`).join('')}</div>`;
    else if (p.akademik) extra = `<div class="akademik-list">${p.akademik.map(a=>`<div class="ak-item"><strong>${a.judul}</strong><p>${a.desc}</p></div>`).join('')}</div>`;
    else if (p.mb) extra = `<div class="mb-grid">${p.mb.map(m=>`<div class="mb-item">${m}</div>`).join('')}</div>`;
    else if (p.org) extra = `<div class="org-list">${p.org.map(o=>`<div class="org-item"><span class="org-dot"></span><strong>${o.judul}</strong> — ${o.desc}</div>`).join('')}</div>`;
    return `<div class="proker-card fade-up${delay}" data-cat="${p.cat}" data-judul="${p.judul.toLowerCase()}" data-num="${p.num}">
      <div class="pc-header">
        <span class="pc-num">${p.num}</span>
        <span class="pc-tag ${p.tag_class}">${p.tag}</span>
        <span class="pc-notif-badge" id="notif-badge-${p.num}" style="display:none" title="Ada jadwal kegiatan terdekat">🔔</span>
      </div>
      <div class="pc-icon">${p.icon}</div><h3>${p.judul}</h3><p>${p.desc}</p>
      <div class="pc-detail">${p.detail.map(d=>`<div class="pc-detail-item"><span class="pd-label">${d.label}</span><span>${d.val}</span></div>`).join('')}</div>
      ${extra}
      <a href="proker.html?id=${p.num}" class="pc-detail-btn">Lihat Detail <span>→</span></a>
      </div>`;
  }).join(''));

  /* TIMELINE */
  set('tlLabel', C.timeline.label);
  set('tlHeading', C.timeline.heading);
  const dirs = ['fade-left','fade-right','fade-left','fade-right','fade-left'];
  set('tlWrapper', C.timeline.items.map((t,i) =>
    `<div class="tl-item ${dirs[i]||'fade-up'}">
      <div class="${t.soft?'tl-dot tl-dot-soft':'tl-dot'}"></div>
      <div class="${t.soft?'tl-content tl-content-soft':'tl-content'}">
        <div class="tl-month">${t.bulan}</div><h4>${t.judul}</h4><p>${t.desc}</p>
        <span class="tl-date">${t.tanggal}</span></div></div>`).join(''));

  /* ── PENGURUS — label & heading dulu, data dari Sheets ── */
  const P = C.pengurus;
  set('pengurusLabel',   P.label);
  set('pengurusHeading', P.heading);
  set('pengurusDesc',    P.desc);
  // Sembunyikan catatan sementara, akan diisi setelah fetch
  set('pengurusNote', '');

  renderPengurusSkeleton();
  loadPengurusFromSheets();

  /* ── Preload cache Sheets di background ──
     1. Jika cache ada & fresh (<15 mnt) → pakai cache, lalu tetap fetch baru di background
        → Saat data baru tiba, ganti data lama secara silent (tanpa loading/refresh)
     2. Jika cache tidak ada / expired → fetch, simpan, terapkan badge
     Tidak ada lagi invalidate-on-reload — user tidak perlu refresh untuk update data ── */
  (async () => {
    const api = CONTENT && CONTENT.api && CONTENT.api.url;
    if (!api || api.includes('PASTE_URL')) return;

    const CACHE_TTL = 15 * 60 * 1000;
    const cacheKey  = _jcosasiCacheKey(api);

    // Cek cache
    let hasCacheFresh = false;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const entry = JSON.parse(raw);
        if (entry && entry.ts && Date.now() - entry.ts < CACHE_TTL) {
          hasCacheFresh = true;
          applyNotifBadges((entry.data && entry.data.jadArr) || []);
        }
      }
    } catch(e) {}

    // Selalu fetch di background — jika cache sudah ada, update silent setelah tiba
    const sheets = ['proker_detail','proker_notif','proker_notif_config',
                    'proker_activity','proker_jadwal','proker_dokumentasi'];
    try {
      const results = await Promise.allSettled(
        sheets.map(sh => _jcosasiJSONP(api + '?sheet=' + sh))
      );
      const safe = r => r.status === 'fulfilled' && r.value && r.value.status === 'ok' ? r.value.data : [];
      const [detArr,notArr,cfgArr,actArr,jadArr,dokArr] = results.map(safe);
      const allData = { detArr, notArr, cfgArr, actArr, jadArr, dokArr };
      if (Object.values(allData).some(a => a.length > 0)) {
        sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: allData }));
        // Terapkan badge dari data terbaru (silent — tidak ada reload)
        applyNotifBadges(allData.jadArr || []);
      }
    } catch(e) { /* fetch gagal — gunakan cache yang ada */ }
  })();

  /* KONTAK */
  const KS = C.kontakSection;
  set('kontakLabel', KS.label);
  set('kontakHeading', KS.heading);
  set('kontakDesc', KS.desc);
  setText('kontakSekolah', O.sekolah);
  setText('kontakAlamat', O.alamat);
  set('kontakEmail', `<a href="mailto:${KT.email}">${KT.email}</a> <em>(perbarui di content.js)</em>`);
  const smIcons = {
    whatsapp:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.8 11.8 0 0012.04 0C5.42 0 .02 5.4.02 12.04c0 2.12.55 4.18 1.6 6.02L0 24l6.13-1.6a11.97 11.97 0 005.91 1.5h.01c6.62 0 12.02-5.4 12.02-12.04 0-3.21-1.25-6.23-3.55-8.38zM12.05 21.8a9.8 9.8 0 01-5-1.37l-.36-.21-3.64.95.97-3.55-.24-.37a9.74 9.74 0 01-1.5-5.2c0-5.4 4.4-9.8 9.8-9.8 2.62 0 5.09 1.02 6.94 2.86a9.75 9.75 0 012.86 6.94c0 5.4-4.4 9.8-9.8 9.8zm5.38-7.34c-.29-.14-1.72-.85-1.99-.95-.27-.1-.47-.14-.67.14-.19.29-.76.95-.93 1.14-.17.19-.34.21-.63.07-.29-.14-1.23-.45-2.34-1.42-.86-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.43-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.67-1.62-.92-2.21-.24-.58-.48-.5-.67-.51l-.57-.01c-.19 0-.5.07-.76.36s-1 1-1 2.44 1.03 2.83 1.17 3.03c.14.19 2.03 3.11 4.92 4.36.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.56-.08 1.72-.7 1.96-1.38.24-.69.24-1.28.17-1.38-.07-.1-.26-.17-.55-.31z"/></svg>`,
    instagram:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
    tiktok:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/></svg>`,
    youtube:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>`
  };
  const smList = [
    {key:'whatsapp', label:'WhatsApp', show:KT.show_whatsapp, url:KT.whatsapp},
    {key:'instagram',label:'Instagram',show:KT.show_instagram,url:KT.instagram},
    {key:'tiktok',   label:'TikTok',   show:KT.show_tiktok,   url:KT.tiktok},
    {key:'youtube',  label:'YouTube',  show:KT.show_youtube,  url:KT.youtube},
  ];
  set('sosmedLinks', smList.filter(s=>s.show).map(s=>
    `<a href="${s.url}" class="sm-btn" target="_blank" rel="noopener">${smIcons[s.key]} ${s.label}</a>`).join(''));
  set('kcBadge', KS.card.badge);
  set('kcYear',  KS.card.year);
  set('kcBody',  KS.card.stats.map(s=>`<div class="kc-stat"><span>${s.num}</span><small>${s.label}</small></div>`).join(''));
  set('kcJpQuote', KS.card.jp_quote);
  set('kcIdQuote', KS.card.id_quote);

  /* FOOTER */
  set('footerFull',   O.nama_lengkap);
  set('footerSchool', `${O.sekolah} · Est. ${O.tahun_berdiri}`);
  set('footerCopy', C.footer.copy);
  set('footerJp',   C.footer.jp_closing);

  /* ── NAVBAR SCROLL ── */
  const navbar = $('navbar');
  window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY>60), {passive:true});

  /* ── HAMBURGER ── */
  const ham = $('hamburger'), mob = $('mobileMenu'), nav = $('navbar');
  // Toggle menu + animasi hamburger → X
  ham.addEventListener('click', () => {
    mob.classList.toggle('open');
    ham.classList.toggle('active');
  });
  // Tutup saat klik link
  document.querySelectorAll('.mm-link').forEach(l => l.addEventListener('click', () => {
    mob.classList.remove('open');
    ham.classList.remove('active');
  }));
  // Tutup saat klik di luar
  document.addEventListener('click', e => {
    if (!ham.contains(e.target) && !mob.contains(e.target)) {
      mob.classList.remove('open');
      ham.classList.remove('active');
    }
  });
  // Deteksi apakah navbar sedang di atas hero (bg gelap) → hamburger putih
  const heroSec = document.getElementById('hero');
  if (heroSec) {
    const heroObs = new IntersectionObserver(entries => {
      nav.classList.toggle('on-dark', entries[0].isIntersecting);
    }, { threshold: 0.1 });
    heroObs.observe(heroSec);
  }

  /* ── SCROLL ANIMATIONS ── */
  const obs = new IntersectionObserver(entries=>entries.forEach(e=>{
    if(e.isIntersecting) e.target.classList.add('visible');
  }), {threshold:0.1, rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.fade-up,.fade-left,.fade-right').forEach(el=>obs.observe(el));

  /* ── PROKER FILTER + SEARCH ── */
  let activeFilter = 'all';
  let searchQuery  = '';

  function applyProkerFilter() {
    const q = searchQuery.trim().toLowerCase();
    let anyVisible = false;
    document.querySelectorAll('.proker-card').forEach(card => {
      const catOk   = activeFilter === 'all' || (card.dataset.cat||'').includes(activeFilter);
      const judulOk = !q || (card.dataset.judul||'').includes(q) || (card.dataset.num||'').includes(q);
      const show    = catOk && judulOk;
      card.classList.toggle('hidden', !show);
      if (show) {
        anyVisible = true;
        card.classList.remove('visible');
        requestAnimationFrame(()=>requestAnimationFrame(()=>card.classList.add('visible')));
      }
    });
    const emptyEl = document.getElementById('prokerSearchEmpty');
    const qEl     = document.getElementById('prokerSearchQuery');
    if (emptyEl) emptyEl.style.display = (!anyVisible && q) ? 'block' : 'none';
    if (qEl && q) qEl.textContent = q;
  }

  document.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      applyProkerFilter();
    });
  });

  const searchInput = document.getElementById('prokerSearch');
  const searchClear = document.getElementById('prokerSearchClear');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      if (searchClear) searchClear.style.display = searchQuery ? 'flex' : 'none';
      applyProkerFilter();
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      searchClear.style.display = 'none';
      applyProkerFilter();
    });
  }

  /* ── Notif badge — dijalankan setelah preload cache selesai ──
     Ambil dari cache (tidak fetch ulang), badge hanya muncul
     jika jadwal terdekat <= 3 hari dari hari ini (lokal WIB) ── */
  function applyNotifBadges(jadwalArr) {
    if (!jadwalArr || !jadwalArr.length) return;
    const now         = new Date();
    const nowMs       = now.getTime();
    const THREE_DAYS  = 3 * 24 * 60 * 60 * 1000;
    const nearest     = {};

    jadwalArr.forEach(function(r) {
      // Validasi: tanggal harus format YYYY-MM-DD
      if (!r.tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(r.tanggal)) return;
      const pid = parseInt(r.proker_id, 10);
      if (isNaN(pid)) return;
      // Jam: HH:MM, fallback 07:00
      const jamStr = (r.jam || '').trim();
      const jm     = /^(\d{1,2}):(\d{2})$/.exec(jamStr);
      const hh     = jm ? jm[1].padStart(2,'0') : '07';
      const mm     = jm ? jm[2] : '00';
      // Parse sebagai lokal (bukan UTC) dengan gabung string langsung
      const parts  = r.tanggal.split('-');
      const dt     = new Date(+parts[0], +parts[1]-1, +parts[2], +hh, +mm, 0);
      if (isNaN(dt.getTime()) || dt.getTime() <= nowMs) return;
      const key = pid < 10 ? '0'+pid : ''+pid;
      if (!nearest[key] || dt < nearest[key]) nearest[key] = dt;
    });

    Object.keys(nearest).forEach(function(pid) {
      const dt   = nearest[pid];
      const diff = dt.getTime() - nowMs;
      // Hanya tampilkan badge jika kurang dari 3 hari
      if (diff > THREE_DAYS) return;
      const badge = document.getElementById('notif-badge-' + pid);
      if (!badge) return;
      const tgl = dt.toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long'});
      const jam = dt.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
      const msg = '🔔 Kegiatan: ' + tgl + ', pukul ' + jam;
      badge.style.display = 'flex';
      badge.title = msg;  // desktop hover
      // Mobile: tap menampilkan tooltip custom
      badge.dataset.notifMsg = msg;
      badge.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        // Hapus tooltip lain yang terbuka
        document.querySelectorAll('.notif-tooltip').forEach(el => el.remove());
        // Buat tooltip
        const tip = document.createElement('div');
        tip.className = 'notif-tooltip';
        tip.textContent = msg;
        badge.appendChild(tip);
        // Tutup otomatis setelah 3 detik atau klik di luar
        const close = () => tip.remove();
        setTimeout(close, 3500);
        document.addEventListener('click', close, { once: true });
      });
    });
  }

  /* ── ACTIVE NAV ── 
     Garis merah mengikuti section yang sedang terlihat di viewport.
     Klik nav link → langsung set active, tidak menunggu scroll observer.
     Link eksternal (rekap.html dll) tidak ikut active logic. ── */
  let _navClickLock = false;

  function setActiveNav(href) {
    document.querySelectorAll('.nav-links a:not(.nav-ext)').forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === href);
    });
  }

  // Klik nav link → langsung set active + lock sementara agar scroll observer tidak override
  document.querySelectorAll('.nav-links a:not(.nav-ext), .mm-link').forEach(link => {
    link.addEventListener('click', () => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      setActiveNav(href);
      _navClickLock = true;
      setTimeout(() => { _navClickLock = false; }, 900); // beri waktu scroll settle
    });
  });

  // Scroll observer — hanya aktif jika tidak sedang locked oleh klik
  const _sectionIds = [];
  document.querySelectorAll('section[id]').forEach(sec => {
    _sectionIds.push(sec.id);
    new IntersectionObserver(entries => entries.forEach(e => {
      if (_navClickLock) return; // skip jika baru klik
      if (e.isIntersecting) setActiveNav('#' + e.target.getAttribute('id'));
    }), { threshold: 0.3, rootMargin: '-60px 0px -40% 0px' }).observe(sec);
  });

  // Set active awal berdasarkan hash URL jika ada
  if (location.hash) setActiveNav(location.hash);

  /* ── HERO LOAD ── */
  setTimeout(()=>{
    document.querySelectorAll('#hero .fade-up').forEach((el,i)=>setTimeout(()=>el.classList.add('visible'),i*130));
  },120);

  /* ── SAKURA ── */
  const ss=document.createElement('style');
  ss.textContent=`@keyframes sakuraFall{0%{transform:translateY(0) rotate(0deg);opacity:1}50%{transform:translateY(40vh) rotate(180deg) translateX(20px);opacity:.7}100%{transform:translateY(100vh) rotate(360deg) translateX(-20px);opacity:0}}
  .nav-links a.active{color:var(--purple-mid)}.nav-links a.active::after{transform:scaleX(1)}#navbar.scrolled .nav-links a.active{color:var(--white)}`;
  document.head.appendChild(ss);
  setInterval(()=>{
    const hero=$('hero');if(!hero)return;
    const p=document.createElement('div');
    const sz=4+Math.random()*6;
    p.style.cssText=`position:absolute;width:${sz}px;height:${sz}px;background:rgba(255,180,210,${.2+Math.random()*.3});border-radius:50% 0 50% 0;left:${Math.random()*100}%;top:-10px;pointer-events:none;z-index:1;animation:sakuraFall ${4+Math.random()*5}s linear forwards;`;
    hero.appendChild(p);p.addEventListener('animationend',()=>p.remove());
  },1000);
});

/* ═══════════════════════════════════════════════════════════
   GOOGLE SHEETS — PENGURUS
   Fungsi-fungsi di bawah berjalan di luar DOMContentLoaded
   agar bisa dipanggil async setelah halaman siap
═══════════════════════════════════════════════════════════ */

/**
 * Tampilkan skeleton loading card saat data belum masuk
 */
function renderPengurusSkeleton() {
  const skeletonCard = `
    <div class="org-photo"><div class="org-photo-ph skeleton-ph"></div></div>
    <div class="skeleton-line sk-short"></div>
    <div class="skeleton-line sk-medium"></div>
    <div class="skeleton-line sk-long"></div>`;

  $('orgKetua')      && ($('orgKetua').innerHTML      = skeletonCard);
  $('orgWakil')      && ($('orgWakil').innerHTML      = skeletonCard);
  $('orgSekretaris') && ($('orgSekretaris').innerHTML = skeletonCard);
  $('orgBendahara')  && ($('orgBendahara').innerHTML  = skeletonCard);
  const bidang = $('orgBidang');
  if (bidang) {
    bidang.innerHTML = ['','delay-1','delay-2','delay-3'].map(d =>
      `<div class="org-card org-card-bidang fade-up ${d}">${skeletonCard}</div>`
    ).join('');
  }
}

/**
 * Konversi array data dari Sheets → struktur yang dipakai buildOrgCard()
 */
function sheetsToStruktur(rows) {
  const struktur = {};
  const bidang   = [];

  // Map jabatan_level → key di content.js
  const levelMap = { ketua: 'ketua', wakil: 'wakil', sekretaris: 'sekretaris', bendahara: 'bendahara' };

  rows.forEach(row => {
    const level = (row.jabatan_level || '').toLowerCase().trim();
    const data  = {
      jabatan: row.jabatan || '',
      nama:    row.nama    || '–',
      kelas:   row.kelas   || '–',
      photo:   row.foto_url || row.photo || '',
      icon:    row.icon    || '👤',
      desc:    row.deskripsi_jabatan || row.desc || '',
    };

    if (levelMap[level]) {
      struktur[levelMap[level]] = data;
    } else if (level === 'bidang') {
      bidang.push(data);
    }
  });

  return { struktur, bidang };
}

/**
 * Fetch data pengurus dari Google Sheets via JSONP
 * (menghindari CORS error yang terjadi dengan fetch() biasa)
 */
async function loadPengurusFromSheets() {
  const C   = CONTENT;
  const P   = C.pengurus;
  const api = C.api && C.api.url;

  // Jika URL belum diisi → langsung pakai fallback
  if (!api || api.includes('PASTE_URL')) {
    console.warn('[JCOSASI] API URL belum diisi di content.js → pakai data fallback');
    renderPengurus(P.struktur, P.bidang, 'fallback');
    return;
  }

  try {
    const data = await _jcosasiJSONP(api + '?sheet=pengurus');

    if (!data || data.status !== 'ok' || !data.data || data.data.length === 0) {
      throw new Error('Data kosong atau status error');
    }

    const { struktur, bidang } = sheetsToStruktur(data.data);
    renderPengurus(struktur, bidang, 'sheets');

  } catch (err) {
    console.error('[JCOSASI] Gagal fetch dari Sheets:', err.message);
    renderPengurus(P.struktur, P.bidang, 'fallback');
  }
}

/**
 * Render org chart dengan data yang sudah siap
 * source: 'sheets' | 'fallback'
 */
function renderPengurus(struktur, bidang, source) {
  const P   = CONTENT.pengurus;

  // Update catatan — sembunyikan jika dari Sheets berhasil
  const noteEl = document.getElementById('pengurusNote');
  if (noteEl) {
    if (source === 'sheets') {
      noteEl.style.display = 'none';
    } else {
      noteEl.style.display = '';
      noteEl.innerHTML = `<span class="pn-icon">📋</span><p>${P.catatan}</p>`;
    }
  }

  // Render kartu — fallback jika jabatan tidak ada di data Sheets
  const getFallback = (key) => P.struktur[key] || { jabatan: key, nama: '–', kelas: '–', photo: '', icon: '👤', desc: '' };

  set('orgKetua',      buildOrgCard(struktur.ketua      || getFallback('ketua')));
  set('orgWakil',      buildOrgCard(struktur.wakil      || getFallback('wakil')));
  set('orgSekretaris', buildOrgCard(struktur.sekretaris || getFallback('sekretaris')));
  set('orgBendahara',  buildOrgCard(struktur.bendahara  || getFallback('bendahara')));

  const bidangData = (bidang && bidang.length > 0) ? bidang : P.bidang;
  set('orgBidang', bidangData.map((b, i) => {
    const delays = ['', 'delay-1', 'delay-2', 'delay-3'];
    return `<div class="org-card org-card-bidang fade-up ${delays[i] || ''}">${buildOrgCard(b)}</div>`;
  }).join(''));

  // Trigger animasi scroll setelah render
  const newCards = document.querySelectorAll('#pengurus .fade-up');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  newCards.forEach(el => { el.classList.remove('visible'); obs.observe(el); });
}

