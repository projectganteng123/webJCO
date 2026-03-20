/**
 * ============================================================
 *  JCOSASI — pengumuman-script.js
 *
 *  Cache: pakai sessionStorage key yang SAMA dengan script.js
 *  dan proker-script.js (jcosasi_v1_xxx) agar data yang sudah
 *  di-preload landing page langsung dipakai — tidak fetch ulang.
 *
 *  Jika cache tidak punya pgmArr (cache lama sebelum sheet
 *  pengumuman ditambahkan), fetch pengumuman saja secara
 *  terpisah, lalu simpan ke cache.
 * ============================================================
 */

/* ── Shorthand ── */
const $ = id => document.getElementById(id);

/* ── Konstanta ── */
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 menit — sama dengan proker-script.js

const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli',
               'Agustus','September','Oktober','November','Desember'];

/* ══════════════════════════════════════════════
   CACHE — key IDENTIK dengan script.js & proker-script.js
══════════════════════════════════════════════ */
function _cacheKey() {
  const api = CONTENT?.api?.url || 'default';
  try { return 'jcosasi_v1_' + btoa(api).slice(0, 20).replace(/[^a-z0-9]/gi, ''); }
  catch(e) { return 'jcosasi_v1_default'; }
}

function cacheLoad() {
  try {
    const raw   = sessionStorage.getItem(_cacheKey());
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry?.ts || !entry?.data) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) { sessionStorage.removeItem(_cacheKey()); return null; }
    return entry.data;
  } catch(e) { return null; }
}

function cacheSave(data) {
  try { sessionStorage.setItem(_cacheKey(), JSON.stringify({ ts: Date.now(), data })); }
  catch(e) {}
}

/* Hapus hanya pgmArr dari cache — sheet lain tetap tersimpan */
function pgmCacheInvalidate() {
  try {
    const raw = sessionStorage.getItem(_cacheKey());
    if (!raw) return;
    const entry = JSON.parse(raw);
    if (entry?.data) {
      delete entry.data.pgmArr;
      sessionStorage.setItem(_cacheKey(), JSON.stringify(entry));
    }
  } catch(e) {}
}

/* ══════════════════════════════════════════════
   JSONP — pola sama dengan proker-script.js
══════════════════════════════════════════════ */
function fetchJSONP(url) {
  return new Promise((resolve, reject) => {
    const cb  = '_pgcb' + Date.now() + Math.random().toString(36).slice(2);
    const el  = document.createElement('script');
    const tid = setTimeout(() => { cleanup(); reject(new Error('Timeout')); }, 12000);
    window[cb] = data => { cleanup(); resolve(data); };
    function cleanup() {
      clearTimeout(tid); delete window[cb];
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    el.onerror = () => { cleanup(); reject(new Error('Script load error')); };
    el.src     = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    document.head.appendChild(el);
  });
}

/* ══════════════════════════════════════════════
   FETCH DATA — dengan cache
══════════════════════════════════════════════ */
async function getPgmData() {
  const api = CONTENT?.api?.url;
  if (!api || api.includes('PASTE_URL')) return null;

  /* ── Coba cache dulu ── */
  let cached = cacheLoad();

  /* Cache hit dan sudah punya pgmArr → pakai langsung */
  if (cached?.pgmArr) return cached.pgmArr;

  /* Cache hit tapi belum ada pgmArr (cache dari landing page / proker)
     → fetch HANYA pengumuman, merge ke cache yang ada */
  if (cached) {
    try {
      const res = await fetchJSONP(`${api}?sheet=pengumuman`);
      const pgmArr = (res?.status === 'ok') ? (res.data || []) : [];
      cached.pgmArr = pgmArr;
      cacheSave(cached);         // update cache dengan pgmArr
      return pgmArr;
    } catch(e) {
      console.warn('[Pengumuman] fetch pgmArr gagal, cache tanpa pgmArr:', e);
      return [];
    }
  }

  /* Cache miss total → fetch semua sheet sekaligus (sama dengan proker-script.js) */
  const sheetNames = [
    'proker_detail', 'proker_notif', 'proker_notif_config',
    'proker_activity', 'proker_jadwal', 'proker_dokumentasi',
    'pengumuman'
  ];

  const results = await Promise.allSettled(
    sheetNames.map(s => fetchJSONP(`${api}?sheet=${s}`))
  );

  const safe = r =>
    r.status === 'fulfilled' && r.value?.status === 'ok' ? (r.value.data || []) : [];

  const [detArr, notArr, cfgArr, actArr, jadArr, dokArr, pgmArr] = results.map(safe);
  const allData = { detArr, notArr, cfgArr, actArr, jadArr, dokArr, pgmArr };

  if (Object.values(allData).some(a => a.length > 0)) cacheSave(allData);

  return pgmArr;
}

/* ══════════════════════════════════════════════
   HELPERS FORMAT
══════════════════════════════════════════════ */
function parseTgl(str) {
  if (!str) return null;
  if (typeof str !== 'string') {
    const d = new Date(str);
    return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  // Format YYYY-MM-DD — parse manual tanpa timezone
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return new Date(+ymd[1], +ymd[2] - 1, +ymd[3]);
  // Fallback: Date string dari GAS (misal "Sun Mar 22 2026...")
  const d = new Date(str);
  if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return null;
}

/* Konversi Date → 'YYYY-MM-DD' untuk perbandingan string */
function toYMD(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function fmtTgl(str) {
  const d = parseTgl(str); if (!d) return str || '';
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtTglShort(str) {
  const d = parseTgl(str); if (!d) return '';
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function convertGDrive(url) {
  if (!url) return '';
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800` : url;
}

function convertGDriveFull(url) {
  if (!url) return '';
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : url;
}

function priorityInfo(p) {
  if (p === 'urgent')  return { label:'🚨 Urgent',  cls:'urgent',  bg:'#FEE2E2', color:'#B91C1C' };
  if (p === 'penting') return { label:'⚠️ Penting', cls:'penting', bg:'#FEF3C7', color:'#92400E' };
  return                      { label:'✅ Info',     cls:'normal',  bg:'#D1FAE5', color:'#065F46' };
}

function isVisible(item) {
  const td  = todayStr();
  const pub = toYMD(parseTgl(item.tanggal_publish)) || '2000-01-01';
  const tun = toYMD(parseTgl(item.tanggal_turun))   || '2099-12-31';
  return item.aktif !== 'FALSE' && pub <= td && td <= tun;
}

function parsePairs(judulStr, urlStr) {
  if (!urlStr) return [];
  const juduls = (judulStr || '').split(';').map(s => s.trim());
  return urlStr.split(';').map(s => s.trim()).filter(Boolean)
    .map((url, i) => [juduls[i] || `Dokumen ${i+1}`, url]);
}

/* ══════════════════════════════════════════════
   ERROR RENDER
══════════════════════════════════════════════ */
function renderError(msg) {
  $('mainContent').innerHTML = `
    <div class="page-error">
      <div class="pe-icon">⚠️</div>
      <h2>Gagal memuat</h2>
      <p>${msg}</p>
      <a href="index.html" class="btn-back">← Kembali ke Beranda</a>
    </div>`;
}

/* ══════════════════════════════════════════════
   RENDER LIST
══════════════════════════════════════════════ */
function renderList(items) {
  const allTags = [...new Set(items.map(i => i.tag).filter(Boolean).map(t => t.trim()))].sort();

  $('mainContent').innerHTML = `
    <div class="pg-list">
      <div class="pg-list-header">
        <div class="section-label">📣 Pengumuman</div>
        <h1>Informasi &amp; Pengumuman</h1>
        <p>Informasi terbaru, acara mendatang, dan pengumuman resmi JCOSASI.</p>
      </div>

      ${allTags.length ? `
      <div class="pg-filter-bar" id="pgFilterBar">
        <button class="pg-filter-btn active" data-tag="all">Semua</button>
        ${allTags.map(t => `<button class="pg-filter-btn" data-tag="${t}">${t}</button>`).join('')}
      </div>` : ''}

      <div class="pg-card-grid" id="pgCardGrid">
        ${items.length === 0
          ? `<div class="page-error" style="grid-column:1/-1;border:none;background:none">
               <div class="pe-icon">📭</div>
               <p>Belum ada pengumuman aktif saat ini.</p>
             </div>`
          : items.map(renderCard).join('')}
      </div>
    </div>`;

  document.querySelectorAll('.pg-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pg-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tag = btn.dataset.tag;
      document.querySelectorAll('.pg-card').forEach(card => {
        card.style.display = (tag === 'all' || (card.dataset.tag||'') === tag) ? '' : 'none';
      });
    });
  });
}

function renderCard(item) {
  const prio   = priorityInfo(item.prioritas);
  const imgSrc = item.poster_url ? convertGDrive(item.poster_url) : '';
  const date   = item.tanggal_publish ? fmtTglShort(item.tanggal_publish) : '';

  return `
    <a class="pg-card" href="pengumuman.html?id=${encodeURIComponent(item.id)}"
       data-tag="${item.tag || ''}">
      <div class="pg-card-poster">
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${item.judul}" loading="lazy"
                  onerror="this.parentElement.innerHTML='<div class=pg-card-poster-placeholder>📣</div>'">`
          : `<div class="pg-card-poster-placeholder">📣</div>`}
        ${item.prioritas && item.prioritas !== 'normal'
          ? `<span class="pg-priority ${prio.cls}">${prio.label}</span>` : ''}
        ${item.tag ? `<span class="pg-tag-badge">${item.tag}</span>` : ''}
      </div>
      <div class="pg-card-body">
        ${date ? `<div class="pg-card-date">📅 ${date}</div>` : ''}
        <div class="pg-card-title">${item.judul}</div>
        ${item.deskripsi ? `<div class="pg-card-desc">${item.deskripsi}</div>` : ''}
        <div class="pg-card-footer">
          ${item.waktu_kegiatan  ? `<span class="pg-card-meta">⏰ ${item.waktu_kegiatan}</span>` : ''}
          ${item.lokasi_kegiatan ? `<span class="pg-card-meta">📍 ${item.lokasi_kegiatan}</span>` : ''}
          <span class="pg-card-cta">Selengkapnya →</span>
        </div>
      </div>
    </a>`;
}

/* ══════════════════════════════════════════════
   RENDER DETAIL
══════════════════════════════════════════════ */
function renderDetail(item) {
  const navTitle = $('pgmNavTitle');
  if (navTitle) navTitle.textContent = item.judul;

  updateOGTags(item);

  const prio   = priorityInfo(item.prioritas);
  const imgSrc = item.poster_url ? convertGDriveFull(item.poster_url) : '';
  const efek   = (item.efek_poster || 'none').toLowerCase();
  const pairs  = parsePairs(item.dokumen_judul, item.dokumen_url);
  const efekClass = { sakura:'efek-sakura', backlight:'efek-backlight', bioskop:'efek-bioskop' }[efek] || '';

  $('mainContent').innerHTML = `
    <div class="pg-detail">

      <a href="pengumuman.html" class="pg-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Kembali ke Pengumuman
      </a>

      ${imgSrc ? `
      <div class="pg-poster-wrap ${efekClass}" id="pgPosterWrap">
        <div class="pg-poster-inner" id="pgPosterInner">
          <img src="${imgSrc}" alt="${item.judul}"
               onerror="document.getElementById('pgPosterWrap').style.display='none'"/>
        </div>
        ${efek === 'bioskop' ? '<div class="bioskop-lights" id="bioskopLights"></div>' : ''}
      </div>` : ''}

      <div class="pg-detail-content">

        <div class="pg-detail-header">
          <div class="pg-detail-meta">
            ${item.tag ? `<span class="pg-detail-tag">${item.tag}</span>` : ''}
            ${item.prioritas
              ? `<span class="pg-detail-priority ${prio.cls}"
                       style="background:${prio.bg};color:${prio.color}">${prio.label}</span>` : ''}
            ${item.tanggal_publish
              ? `<span class="pg-detail-date">📅 ${fmtTgl(item.tanggal_publish)}</span>` : ''}
          </div>
          <h1 class="pg-detail-title">${item.judul}</h1>
          ${item.deskripsi ? `<p class="pg-detail-desc">${item.deskripsi}</p>` : ''}
        </div>

        ${buildInfoGrid(item)}

        ${item.persiapan ? `
        <div>
          <div class="pg-section-label">📝 Persiapan</div>
          <div class="pg-info-block full">
            <div class="pg-info-value" style="white-space:pre-wrap">${item.persiapan}</div>
          </div>
        </div>` : ''}

        ${item.cara_daftar ? `
        <div>
          <div class="pg-section-label">📋 Cara Mendaftar</div>
          <div class="pg-info-block full">
            <div class="pg-info-value" style="white-space:pre-wrap">${item.cara_daftar}</div>
          </div>
        </div>` : ''}

        ${pairs.length ? `
        <div>
          <div class="pg-section-label">📎 Dokumen &amp; Lampiran</div>
          <div class="pg-docs">
            ${pairs.map(([judul, url]) => `
            <a href="${url}" target="_blank" rel="noopener" class="pg-doc-item">
              <span class="pg-doc-icon">📄</span>
              <span class="pg-doc-name">${judul}</span>
              <span class="pg-doc-arrow">↗</span>
            </a>`).join('')}
          </div>
        </div>` : ''}

        <div class="pg-cta-row">
          ${item.link_pendaftaran
            ? `<a href="${item.link_pendaftaran}" target="_blank" rel="noopener"
                  class="pg-cta-btn primary">🔗 Daftar / Buka Link</a>` : ''}
          <button class="pg-cta-btn secondary" id="btnCopyLink">
            🔗 Salin Link Pengumuman
          </button>
        </div>

      </div>
    </div>`;

  if (efek === 'sakura'  && imgSrc) startSakura('pgPosterInner');
  if (efek === 'bioskop')           buildBioskopLights('bioskopLights', 'pgPosterWrap');

  const btnCopy = $('btnCopyLink');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const url = `${location.origin}${location.pathname}?id=${encodeURIComponent(item.id)}`;
      navigator.clipboard.writeText(url)
        .catch(() => {
          const ta = document.createElement('textarea');
          ta.value = url; document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); ta.remove();
        })
        .finally(() => showToast('✅ Link berhasil disalin!'));
    });
  }
}

function buildInfoGrid(item) {
  const rows = [
    item.waktu_kegiatan  ? ['⏰ Waktu',         item.waktu_kegiatan]  : null,
    item.lokasi_kegiatan ? ['📍 Lokasi',         item.lokasi_kegiatan] : null,
    item.target_audiens  ? ['👥 Target Audiens', item.target_audiens]  : null,
    (item.narahubung_nama || item.narahubung_kontak)
      ? ['📞 Narahubung', [item.narahubung_nama, item.narahubung_kontak].filter(Boolean).join(' · ')] : null,
    item.tanggal_turun
      ? ['📅 Berlaku Hingga', fmtTgl(item.tanggal_turun)] : null,
  ].filter(Boolean);

  if (!rows.length) return '';

  return `
    <div>
      <div class="pg-section-label">ℹ️ Informasi Kegiatan</div>
      <div class="pg-info-grid">
        ${rows.map(([label, val], i) => `
        <div class="pg-info-block${rows.length % 2 !== 0 && i === rows.length-1 ? ' full' : ''}">
          <div class="pg-info-label">${label}</div>
          <div class="pg-info-value">${val}</div>
        </div>`).join('')}
      </div>
    </div>`;
}

/* ── OG Meta ── */
function updateOGTags(item) {
  const set = (sel, val) => { const el = document.querySelector(sel); if (el && val) el.setAttribute('content', val); };
  const title = `${item.judul} — JCOSASI`;
  const desc  = item.deskripsi || 'Pengumuman resmi JCOSASI.';
  const img   = item.poster_url ? convertGDriveFull(item.poster_url) : '';
  const url   = `${location.origin}${location.pathname}?id=${encodeURIComponent(item.id)}`;
  document.title = title;
  set('meta[property="og:title"]',        title);
  set('meta[property="og:description"]',  desc);
  set('meta[property="og:image"]',        img);
  set('meta[property="og:url"]',          url);
  set('meta[name="twitter:title"]',       title);
  set('meta[name="twitter:description"]', desc);
  set('meta[name="twitter:image"]',       img);
  set('meta[name="description"]',         desc);
}

/* ── Toast ── */
function showToast(msg) {
  let t = $('pgToast');
  if (!t) { t = document.createElement('div'); t.id = 'pgToast'; t.className = 'pg-copy-toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

/* ── Efek Sakura ── */
function startSakura(id) {
  const c = $(id); if (!c) return;
  setInterval(() => {
    const p = document.createElement('div');
    const sz = 4 + Math.random() * 8;
    p.className = 'sakura-petal';
    p.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:-10px;animation-duration:${4+Math.random()*5}s;opacity:${0.4+Math.random()*0.5}`;
    c.appendChild(p); p.addEventListener('animationend', () => p.remove());
  }, 700);
}

/* ── Efek Bioskop ── */
function buildBioskopLights(lightsId, wrapId) {
  const lights = $(lightsId), wrap = $(wrapId); if (!lights || !wrap) return;
  const W = wrap.offsetWidth, H = wrap.offsetHeight, step = 22;
  let delay = 0;
  for (let x = 8; x < W-8; x += step) { addDot(lights,x,6,delay); addDot(lights,x,H-12,delay); delay+=80; }
  for (let y = 28; y < H-28; y += step) { addDot(lights,6,y,delay); addDot(lights,W-12,y,delay); delay+=80; }
}
function addDot(parent, x, y, delay) {
  const d = document.createElement('div'); d.className = 'bioskop-light-dot';
  d.style.cssText = `left:${x}px;top:${y}px;animation-delay:${delay%1400}ms`; parent.appendChild(d);
}

/* ══════════════════════════════════════════════
   ENTRY POINT — identik dengan proker-script.js
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  const api = CONTENT?.api?.url;
  if (!api || api.includes('PASTE_URL')) {
    renderError('URL API belum dikonfigurasi di <code>content.js</code>.');
    return;
  }

  // Jika halaman di-reload (F5 / Ctrl+R) → invalidate pgmArr agar fetch ulang dari GAS
  const _isReload = performance?.navigation
    ? performance.navigation.type === 1
    : (performance?.getEntriesByType?.('navigation')[0]?.type === 'reload');
  if (_isReload) pgmCacheInvalidate();

  const itemId = new URLSearchParams(location.search).get('id');

  try {
    const pgmArr = await getPgmData();

    if (!pgmArr) {
      renderError('Gagal memuat data pengumuman.');
      return;
    }

    const allItems = pgmArr.filter(r => r.id || r.judul);

    if (itemId) {
      const item = allItems.find(r => r.id === decodeURIComponent(itemId));
      if (!item) { renderError('Pengumuman tidak ditemukan.'); return; }
      renderDetail(item);
    } else {
      const visible = allItems
        .filter(isVisible)
        .sort((a, b) => {
          const ord = { urgent:0, penting:1, normal:2 };
          const pa = ord[a.prioritas] ?? 2, pb = ord[b.prioritas] ?? 2;
          if (pa !== pb) return pa - pb;
          return (b.tanggal_publish||'') > (a.tanggal_publish||'') ? 1 : -1;
        });
      renderList(visible);
    }

  } catch(err) {
    console.error('[Pengumuman]', err);
    renderError('Gagal memuat data: ' + err.message);
  }
});
