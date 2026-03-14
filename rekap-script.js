/**
 * ============================================================
 *  JCOSASI — rekap-script.js
 *  Halaman rekap / dashboard keseluruhan program kerja
 *  Bergantung pada proker-script.js (harus dimuat lebih dulu)
 * ============================================================
 */

/* ══════════════════════════════════════════════
   OVERRIDE: proker.html?page=rekap tidak butuh renderPage
   dari proker-script.js. Init sendiri di bawah.
══════════════════════════════════════════════ */
/* ══════════════════════════════════════════════
   REKAP INIT — dijalankan oleh proker-script.js
   setelah ia selesai cek ?page=rekap.
   Fungsi fetch & cache dipakai dari proker-script.js
   agar tidak ada duplikasi dan urutan load aman.
══════════════════════════════════════════════ */
async function initRekap() {
  const main = document.getElementById('mainContent');

  // Invalidate cache jika reload — pakai cacheInvalidate() dari proker-script.js
  const isReload = performance && performance.navigation
    ? performance.navigation.type === 1
    : (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]?.type === 'reload');
  if (isReload) cacheInvalidate();

  // Set judul navbar
  const _navTitle = document.getElementById('navTitle');
  const _navNum   = document.getElementById('navNum');
  if (_navTitle) _navTitle.textContent = 'Rekap Keseluruhan';
  if (_navNum)   _navNum.textContent   = '📊';

  // Skeleton dulu
  main.innerHTML = renderRekapSkeleton();

  // Ambil data — pakai fetchAllSheets dari proker-script.js
  // fetchAllSheets butuh prokerId tapi untuk rekap kita butuh raw allData
  // Gunakan cacheLoad() langsung, jika miss fetch via fetchAllSheetsRaw()
  let allData = null;
  try {
    allData = cacheLoad();           // dari proker-script.js
    if (!allData) {
      allData = await fetchAllSheetsRaw();   // fetch & simpan cache
    }
  } catch(e) {
    console.warn('[JCOSASI Rekap]', e);
  }

  renderRekap(allData);

  if (!allData) {
    cacheInvalidate();
    const warn = document.createElement('div');
    warn.className = 'sheets-error-banner';
    warn.innerHTML = `
      <div class="seb-icon">⚠️</div>
      <div class="seb-body">
        <div class="seb-title">Data tidak dapat dimuat</div>
        <div class="seb-text">Koneksi ke Google Sheets gagal. Beberapa informasi mungkin tidak tersedia.</div>
        <button class="seb-btn" onclick="location.reload()">🔄 Coba Lagi</button>
      </div>`;
    main.prepend(warn);
  }
}

/* ══════════════════════════════════════════════
   HELPER: proker_id normalisasi
══════════════════════════════════════════════ */
function normId(val) {
  if (!val && val !== 0) return '';
  const n = parseInt(val, 10);
  return isNaN(n) ? String(val).trim() : (n < 10 ? '0'+n : ''+n);
}

function getProkerByNum(num) {
  return (CONTENT?.proker?.items || []).find(p => p.num === num) || null;
}

/* ══════════════════════════════════════════════
   RENDER UTAMA REKAP
══════════════════════════════════════════════ */
function renderRekap(allData) {
  const main  = document.getElementById('mainContent');
  const items = CONTENT?.proker?.items || [];

  const _sr = r => sanitizeRow({ ...r, proker_id: normId(r.proker_id) });
  const detArr = (allData?.detArr || []).map(_sr);
  const notArr = (allData?.notArr || []).map(_sr);
  const cfgArr = (allData?.cfgArr || []).map(_sr);
  const actArr = (allData?.actArr || []).map(_sr);
  const jadArr = (allData?.jadArr || []).map(_sr);
  const dokArr = (allData?.dokArr || []).map(_sr);

  /* ── Statistik global ── */
  const totalProker   = items.length;
  const totalRutin    = items.filter(p => (p.cat||'').includes('rutin')).length;
  const totalEvent    = items.filter(p => (p.cat||'').includes('event')).length;
  const totalAktual   = new Set(actArr.filter(r => r.status !== 'batal').map(r => r.proker_id + '|' + r.tanggal)).size
                      + new Set(dokArr.map(r => r.proker_id + '|' + r.tanggal_sesi)).size;
  const totalDokSesi  = new Set(dokArr.filter(r=>r.tanggal_sesi).map(r => r.proker_id+'|'+r.tanggal_sesi)).size;
  const totalBiaya    = dokArr.reduce((s,r) => {
    if(!r.biaya_aktual) return s;
    return s + (r.biaya_aktual+'').split(',').reduce((ss,v)=>ss+rupiahNum(v),0);
  }, 0);

  /* ── Event terdekat ── */
  const now    = Date.now();
  let nearestEvent = null, nearestDiff = Infinity;
  jadArr.forEach(r => {
    if (!r.tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(r.tanggal)) return;
    const parts = r.tanggal.split('-');
    const jm    = (r.jam||'').match(/^(\d{1,2}):(\d{2})$/);
    const dt    = new Date(+parts[0], +parts[1]-1, +parts[2], jm?+jm[1]:7, jm?+jm[2]:0);
    if (dt.getTime() <= now) return;
    const diff = dt.getTime() - now;
    if (diff < nearestDiff) { nearestDiff = diff; nearestEvent = { dt, pid: r.proker_id }; }
  });
  const nearestProker = nearestEvent ? getProkerByNum(nearestEvent.pid) : null;

  /* ── Render HTML ── */
  main.innerHTML = `

    <!-- HERO REKAP -->
    <div class="rekap-hero">
      <div class="rh-badge">📊 Dashboard Keseluruhan</div>
      <h1 class="rh-title">Rekap Program Kerja<span class="rh-jp">全プログラム</span></h1>
      <p class="rh-desc">Periode 2026–2027 · JCOSASI Angkatan 12 · SMKN 1 Cikarang Barat</p>

      <div class="rh-stats">
        <div class="rhs-item">
          <span class="rhs-num">${totalProker}</span>
          <span class="rhs-label">Total Proker</span>
        </div>
        <div class="rhs-item">
          <span class="rhs-num">${totalRutin}</span>
          <span class="rhs-label">Kegiatan Rutin</span>
        </div>
        <div class="rhs-item">
          <span class="rhs-num">${totalEvent}</span>
          <span class="rhs-label">Event</span>
        </div>
        <div class="rhs-item">
          <span class="rhs-num">${totalAktual}</span>
          <span class="rhs-label">Terlaksana</span>
        </div>
        <div class="rhs-item">
          <span class="rhs-num">${totalDokSesi}</span>
          <span class="rhs-label">Sesi Terdokumentasi</span>
        </div>
        <div class="rhs-item">
          <span class="rhs-num">${totalBiaya > 0 ? rupiah(totalBiaya) : '–'}</span>
          <span class="rhs-label">Total Biaya Aktual</span>
        </div>
      </div>

      ${nearestEvent ? `
      <div class="rh-nearest">
        <div class="rhn-label">⏭ Kegiatan Terdekat</div>
        <div class="rhn-name">${nearestProker ? nearestProker.icon + ' ' + nearestProker.judul.replace(/&amp;/g,'&') : 'Proker '+nearestEvent.pid}</div>
        <div id="rekapCountdownBox" class="countdown-wrap rhn-countdown"></div>
      </div>` : ''}

      <div class="rh-actions">
        <button class="rh-print-btn" onclick="printLaporanRekap()" title="Cetak laporan semua proker sebagai PDF">
          🖨️ Cetak Laporan PDF
        </button>
      </div>
    </div>

    <!-- PEMBERITAHUAN SEMUA PROKER -->
    <div class="pcard">
      <div class="pcard-header">
        <span class="pcard-header-icon">🔔</span>
        <h2>Pemberitahuan</h2>
        <span class="pcard-header-label">お知らせ</span>
      </div>
      <div class="pcard-body" id="rekapNotifBody">
        ${renderRekapNotif(items, notArr, cfgArr, jadArr, actArr, detArr)}
      </div>
    </div>

    <!-- ACTIVITY LOG GABUNGAN -->
    <div class="pcard">
      <div class="pcard-header">
        <span class="pcard-header-icon">📅</span>
        <h2>Activity Log — Semua Proker</h2>
        <span class="pcard-header-label">活動記録</span>
      </div>
      <div class="pcard-body"><div id="rekapActivityGraph"></div></div>
    </div>

    <!-- DOKUMENTASI SEMUA PROKER -->
    <div class="pcard">
      <div class="pcard-header">
        <span class="pcard-header-icon">📸</span>
        <h2>Dokumentasi</h2>
        <span class="pcard-header-label">ドキュメント</span>
      </div>
      <div class="pcard-body">
        ${renderRekapDok(items, dokArr)}
      </div>
    </div>`;

  /* ── Countdown kegiatan terdekat ── */
  if (nearestEvent) startCountdown(nearestEvent.dt, 'rekapCountdownBox');

  /* ── Activity log gabungan ── */
  /* Buat prokerLabelMap: pid → { icon, judul } */
  const _prokerLabelMap = {};
  (CONTENT?.proker?.items || []).forEach(p => { _prokerLabelMap[p.num] = { icon: p.icon, judul: p.judul.replace(/&amp;/g,'&') }; });
  buildActivityGraph('rekapActivityGraph', actArr, jadArr, dokArr, _prokerLabelMap);
}

/* ══════════════════════════════════════════════
   PEMBERITAHUAN SEMUA PROKER
   Tampilkan per proker yang punya notif/jadwal aktif,
   diurutkan: paling dekat jadwalnya tampil paling atas
══════════════════════════════════════════════ */
function renderRekapNotif(items, notArr, cfgArr, jadArr, actArr, detArr) {
  const now   = Date.now();
  const cards = [];

  items.forEach(proker => {
    const pid    = proker.num;
    const cfg    = cfgArr.find(r => r.proker_id === pid) || {};
    const notifs = notArr.filter(r => r.proker_id === pid || r.proker_id === 'all');
    const jadwal = jadArr.filter(r => r.proker_id === pid);
    const detail = detArr.find(r => r.proker_id === pid) || null;

    /* Cari jadwal terdekat */
    let nearestDt = null;
    jadwal.forEach(r => {
      if (!r.tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(r.tanggal)) return;
      const parts = r.tanggal.split('-');
      const jm    = (r.jam||'').match(/^(\d{1,2}):(\d{2})$/);
      const dt    = new Date(+parts[0], +parts[1]-1, +parts[2], jm?+jm[1]:7, jm?+jm[2]:0);
      if (dt.getTime() > now && (!nearestDt || dt < nearestDt)) nearestDt = dt;
    });

    /* estDate dari detail jika tidak ada jadwal */
    let estDate = nearestDt;
    if (!estDate && detail?.estimasi_tanggal) {
      const p = detail.estimasi_tanggal.split('-');
      const d = new Date(+p[0], +p[1]-1, +p[2], 7, 0);
      if (d.getTime() > now) estDate = d;
    }

    const cdAktif = !cfg.countdown_aktif || cfg.countdown_aktif.toLowerCase() !== 'false';
    const hasContent = (cdAktif && estDate) || cfg.ajakan === 'true' ||
                       cfg.wajib_hadir === 'true' || notifs.length > 0;
    if (!hasContent) return;

    const cdId = `rkcd-${pid}`;
    let notifHtml = '';

    /* Countdown */
    if (cdAktif && estDate) {
      notifHtml += `<div class="notif-blok notif-countdown">
        <div class="nb-eyebrow">⏳ Hitung Mundur</div>
        <div id="${cdId}" class="countdown-wrap"></div>
      </div>`;
    }

    /* Ajakan */
    if (cfg.ajakan === 'true' && cfg.ajakan_teks) {
      notifHtml += `<div class="notif-blok notif-ajakan">
        <div class="ajakan-teks">${cfg.ajakan_teks}</div>
        ${cfg.ajakan_sub ? `<div class="ajakan-sub">${cfg.ajakan_sub}</div>` : ''}
      </div>`;
    }

    /* Wajib hadir */
    if (cfg.wajib_hadir === 'true') {
      notifHtml += `<div class="notif-blok notif-wajib">
        <div class="nb-wajib-icon">⚠️</div>
        <div class="nb-wajib-body">
          <div class="nb-wajib-title">${cfg.wajib_hadir_teks || 'Kehadiran Wajib!'}</div>
          ${cfg.wajib_hadir_sanksi ? `<div class="nb-wajib-sanksi">Sanksi: <strong>${cfg.wajib_hadir_sanksi}</strong></div>` : ''}
        </div>
      </div>`;
    }

    /* Notif bebas */
    if (notifs.length > 0) {
      const icons = { info:'ℹ️', warning:'⚠️', success:'✅', penting:'🔴' };
      const cls   = { info:'notif-info', warning:'notif-warning', success:'notif-success', penting:'notif-penting' };
      notifHtml += `<div class="notif-list">${notifs.map(n => `
        <div class="notif-item ${cls[n.tipe]||'notif-info'}">
          <div class="ni-icon">${icons[n.tipe]||'ℹ️'}</div>
          <div class="ni-body">
            <div class="ni-title">${n.judul||''}</div>
            <div class="ni-text">${n.isi||''}</div>
            ${n.tanggal ? `<div class="ni-date">${formatTglPanjang(n.tanggal)}</div>` : ''}
          </div>
        </div>`).join('')}</div>`;
    }

    cards.push({
      pid, proker, estDate,
      nearestMs: nearestDt ? nearestDt.getTime() : (estDate ? estDate.getTime() : Infinity),
      cdId, notifHtml,
      hasCountdown: !!(cdAktif && estDate),
    });
  });

  if (!cards.length) {
    return `<div class="notif-empty"><div class="ne-icon">📭</div><p>Belum ada pemberitahuan aktif.</p></div>`;
  }

  /* Urut dari yang paling dekat jadwalnya */
  cards.sort((a, b) => a.nearestMs - b.nearestMs);

  const html = `<div class="rnc-accordion-list">${cards.map((c, idx) => {
    const isFirst = idx === 0;
    // Badge: hitung mundur jika ada jadwal terdekat
    const diffMs = c.estDate ? c.estDate.getTime() - Date.now() : null;
    const diffDays = diffMs ? Math.ceil(diffMs / 86400000) : null;
    const urgencyBadge = diffDays !== null && diffDays <= 7
      ? `<span class="rnc-urgency ${diffDays <= 3 ? 'rnc-urgent' : 'rnc-soon'}">${diffDays <= 0 ? 'Hari ini!' : diffDays + ' hari lagi'}</span>`
      : '';
    return `
    <div class="rekap-notif-card" id="rnc-${c.pid}">
      <div class="rnc-header" onclick="toggleRncAccordion('${c.pid}')">
        <span class="rnc-icon">${c.proker.icon}</span>
        <span class="rnc-num">#${c.pid}</span>
        <span class="rnc-name">${c.proker.judul.replace(/&amp;/g,'&')}</span>
        ${urgencyBadge}
        <a href="proker.html?id=${c.pid}" class="rnc-detail-link" onclick="event.stopPropagation()" title="Lihat halaman proker">↗</a>
        <span class="rnc-chevron" id="rnc-chev-${c.pid}">${isFirst ? '▴' : '▾'}</span>
      </div>
      <div class="rnc-body" id="rnc-body-${c.pid}" ${isFirst ? '' : 'style="display:none"'}>${c.notifHtml}</div>
    </div>`;
  }).join('')}</div>`;

  /* Jalankan countdown setelah DOM ready */
  setTimeout(() => {
    cards.forEach((c, idx) => {
      // Jalankan countdown untuk semua card yang punya estDate
      // Card pertama langsung, card lain akan diinit saat accordion dibuka (via toggleRncAccordion)
      if (c.hasCountdown && c.estDate) startCountdown(c.estDate, c.cdId);
    });
  }, 0);

  return html;
}

/* ══════════════════════════════════════════════
   DOKUMENTASI SEMUA PROKER
   Semua sesi digabung, diurutkan terbaru di atas,
   masing-masing ditandai nama prokernya
══════════════════════════════════════════════ */
function parseDokRow(d) {
  const splitCs = v => (v||'').split(',').map(s=>s.trim());
  const fotos   = splitCs(d.foto_url).filter(Boolean);
  const items_  = splitCs(d.item_biaya);
  const ests    = splitCs(d.estimasi_biaya_item);
  const akts    = splitCs(d.biaya_aktual);
  const n       = Math.max(items_.length, ests.length, akts.length);
  const biayaRows = [];
  for(let i=0;i<n;i++){
    const item=items_[i]||'',est=ests[i]||'',akt=akts[i]||'';
    if(item||est||akt) biayaRows.push({item_biaya:item,estimasi_biaya_item:est,biaya_aktual:akt});
  }
  return { d, fotos, biayaRows };
}

function renderRekapDok(items, dokArr) {
  if (!dokArr || !dokArr.length) {
    return `<div class="dok-empty">
      <div class="de-icon">📷</div>
      <p>Dokumentasi belum tersedia.</p>
      <p class="de-sub">Akan diperbarui setelah kegiatan berlangsung.</p>
    </div>`;
  }

  /* Format baru: 1 baris per sesi — sort terbaru di atas */
  const sesiList = dokArr.filter(d=>d.tanggal_sesi).sort((a,b) =>
    a.tanggal_sesi > b.tanggal_sesi ? -1 : a.tanggal_sesi < b.tanggal_sesi ? 1 : 0
  );

  if (!sesiList.length) {
    return `<div class="dok-empty"><div class="de-icon">📷</div><p>Dokumentasi belum tersedia.</p></div>`;
  }

  // Simpan ke global agar printLaporanSesi bisa akses per idx
  window._rekapSesiList = sesiList.map(d => ({ proker_id: d.proker_id, tanggal_sesi: d.tanggal_sesi, rows: [d] }));

  return `<div class="dok-sesi-list">${sesiList.map((d, idx) => {
    const { fotos, biayaRows } = parseDokRow(d);
    const proker     = getProkerByNum(d.proker_id);
    const tglStr     = formatTglPanjang(d.tanggal_sesi);
    const jamStr     = (d.waktu_mulai && d.waktu_selesai) ? `${d.waktu_mulai} – ${d.waktu_selesai}` : d.waktu_mulai||'';
    const dur        = hitungDurasi(d.waktu_mulai, d.waktu_selesai);
    const ket        = d.keterangan || '';

    /* Foto — array URLs dari parseDokRow */
    const fotoHtml = fotos.length ? `<div class="dsb-section">
      <div class="dsb-label">📷 Foto Kegiatan</div>
      <div class="dok-foto-grid">${fotos.map(url => {
        const src = convertGDriveUrl(url);
        return `<a href="${url}" target="_blank" rel="noopener" class="dok-foto-wrap">
          <img class="dok-foto" src="${src}" alt="Foto kegiatan" loading="lazy"
               onerror="this.closest('.dok-foto-wrap').innerHTML='<div class=\\'dok-foto-err\\'>🖼️</div>'"/>
        </a>`;
      }).join('')}</div></div>` : '';

    /* Hadir */
    function hadirBlok(kolom, label, ikon) {
      const raw = d[kolom]; if (!raw) return '';
      const names = raw.split(',').map(n=>n.trim()).filter(Boolean);
      const listHtml = names.length === 1
        ? `<span class="hadir-single">${names[0]}</span>`
        : `<div class="daftar-accordion" onclick="toggleAccordion(this)">
            <div class="da-header"><span>${names.length} ${label}</span><span class="da-arrow">▾</span></div>
            <div class="da-body">${names.map(n=>`<div class="da-row">${n}</div>`).join('')}</div>
          </div>`;
      return `<div class="hadir-blok">
        <div class="hadir-blok-label">${ikon} ${label}</div>${listHtml}
      </div>`;
    }
    const hadirParts = [
      hadirBlok('hadir_peserta','peserta','👥'),
      hadirBlok('hadir_panitia','panitia','🤝'),
      hadirBlok('hadir_narasumber','narasumber','🎤'),
    ].filter(Boolean);
    const hadirHtml = hadirParts.length ? `<div class="dsb-section">
      <div class="dsb-label">✅ Daftar Hadir</div>
      <div class="hadir-grid">${hadirParts.join('')}</div>
    </div>` : '';

    /* Biaya */
    let totBiayaSesi = 0, totEstSesi = 0;
    biayaRows.forEach(i => { totBiayaSesi += rupiahNum(i.biaya_aktual); totEstSesi += rupiahNum(i.estimasi_biaya_item); });
    const biayaHtml  = biayaRows.length ? `<div class="dsb-section">
      <div class="dsb-label">💰 Biaya Kegiatan</div>
      <table class="rab-table sesi-rab">
        <thead><tr><th>Item</th><th>Estimasi</th><th>Aktual</th></tr></thead>
        <tbody>${biayaRows.map(i => {
          const est = rupiahNum(i.estimasi_biaya_item), akt = rupiahNum(i.biaya_aktual);
          return `<tr><td>${i.item_biaya||'–'}</td>
            <td class="rab-num">${est?rupiah(est):'<span class="rab-nil">–</span>'}</td>
            <td class="rab-num ${akt>est&&est?'rab-over':akt?'rab-ok':''}">${akt?rupiah(akt):'<span class="rab-nil">–</span>'}</td>
          </tr>`;
        }).join('')}</tbody>
        <tfoot><tr class="rab-total"><td>Total Sesi</td><td>${totEstSesi?rupiah(totEstSesi):'–'}</td><td>${rupiah(totBiayaSesi)||'–'}</td></tr></tfoot>
      </table>
    </div>` : '';

    const materiHtml  = d.materi ? `<div class="dsb-section">
      <div class="dsb-label">📖 Materi &amp; Progress</div>
      <div class="dsb-content">${d.materi}</div>
    </div>` : '';

    const kendalaHtml = d.kendala ? `<div class="dsb-section">
      <div class="dsb-label">⚠️ Kendala &amp; Evaluasi</div>
      <div class="dsb-content dsb-evaluasi">${d.kendala}</div>
    </div>` : '';

    const rkId = `rk-sesi-body-${idx}`;
    const rkTi = `rk-toggle-icon-${idx}`;

    return `<div class="dok-sesi">
      <div class="dok-sesi-header" onclick="toggleRekapSesi(${idx})">
        <div class="dsh-left">
          <div class="dsh-proker-badge">
            <span class="dpb-icon">${proker ? proker.icon : '📌'}</span>
            <span class="dpb-name">${proker ? '#'+d.proker_id+' '+proker.judul.replace(/&amp;/g,'&') : 'Proker '+d.proker_id}</span>
          </div>
          <div class="dsh-info">
            <span class="dsh-tanggal">${tglStr}</span>
            ${jamStr ? `<span class="dsh-jam">${jamStr}${dur?' · '+dur:''}</span>` : ''}
            ${ket ? `<span class="dsh-ket">${ket}</span>` : ''}
          </div>
        </div>
        <div class="dsh-right">
          ${totBiayaSesi > 0 ? `<span class="dsh-biaya">${rupiah(totBiayaSesi)}</span>` : ''}
          <button class="dsh-print-btn" title="Cetak laporan sesi ini"
            onclick="event.stopPropagation(); printLaporanSesi(${JSON.stringify(idx)})"
          >🖨️</button>
          <span class="dsh-toggle" id="${rkTi}">▾</span>
        </div>
      </div>
      <div class="dok-sesi-body${idx === 0 ? ' open' : ''}" id="${rkId}">
        ${fotoHtml}${hadirHtml}${materiHtml}${biayaHtml}${kendalaHtml}
      </div>
    </div>`;
  }).join('')}</div>`;
}

/* Toggle sesi rekap (pakai ID berbeda dari proker-script) */
function toggleRekapSesi(idx) {
  const body = document.getElementById(`rk-sesi-body-${idx}`);
  const icon = document.getElementById(`rk-toggle-icon-${idx}`);
  if (!body) return;
  const open = body.classList.toggle('open');
  if (icon) icon.textContent = open ? '▴' : '▾';
}

/* ══════════════════════════════════════════════
   SKELETON LOADING
══════════════════════════════════════════════ */
function renderRekapSkeleton() {
  return `
    <div class="rekap-hero sk-rekap-hero">
      <div class="sk-line w40" style="height:20px;margin:0 auto 16px;border-radius:99px;"></div>
      <div class="sk-line w60" style="height:36px;margin:0 auto 12px;border-radius:8px;"></div>
      <div class="sk-line w40" style="height:16px;margin:0 auto 32px;border-radius:99px;"></div>
      <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
        ${Array(6).fill(0).map(()=>`
          <div style="background:rgba(255,255,255,.15);border-radius:12px;padding:16px 24px;text-align:center;min-width:80px;">
            <div class="sk-line w60" style="height:24px;margin-bottom:8px;"></div>
            <div class="sk-line w80" style="height:12px;"></div>
          </div>`).join('')}
      </div>
    </div>
    ${['Pemberitahuan','Activity Log — Semua Proker','Dokumentasi'].map(label => `
    <div class="pcard sk-card">
      <div class="pcard-header"><h2 style="color:var(--grey-mid)">${label}</h2></div>
      <div class="pcard-body">
        <div class="sk-line w80"></div><div class="sk-line w60"></div><div class="sk-line w70"></div>
      </div>
    </div>`).join('')}`;
}

/* ══════════════════════════════════════════════
   ACCORDION TOGGLE — PEMBERITAHUAN
══════════════════════════════════════════════ */
function toggleRncAccordion(pid) {
  const body = document.getElementById('rnc-body-' + pid);
  const chev = document.getElementById('rnc-chev-' + pid);
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (chev) chev.textContent = isOpen ? '▾' : '▴';
  // Jalankan countdown saat accordion dibuka jika belum berjalan
  if (!isOpen) {
    const cdBox = body.querySelector('.countdown-wrap[id]');
    if (cdBox && cdBox.innerHTML.trim() === '') {
      // Cari estDate dari card data — trigger countdown
      cdBox.innerHTML = '<span style="opacity:.6;font-size:.85rem">Menghitung...</span>';
    }
  }
}

/* ══════════════════════════════════════════════
   CETAK LAPORAN — REKAP SEMUA PROKER
══════════════════════════════════════════════ */
function printLaporanRekap() {
  // Ambil data dari cache
  const api = CONTENT?.api?.url;
  if (!api) return;
  const cacheKey = 'jcosasi_v1_' + (() => {
    try { return btoa(api).slice(0,20).replace(/[^a-z0-9]/gi,''); } catch(e){ return 'default'; }
  })();
  let allData = null;
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (raw) { const e = JSON.parse(raw); if (e?.data) allData = e.data; }
  } catch(e) {}

  const items  = CONTENT?.proker?.items || [];
  const org    = CONTENT?.org || {};
  const _srP = r => sanitizeRow({ ...r, proker_id: normId(r.proker_id) });
  const detArr = (allData?.detArr||[]).map(_srP);
  const dokArr = (allData?.dokArr||[]).map(_srP);
  const actArr = (allData?.actArr||[]).map(_srP);
  const jadArr = (allData?.jadArr||[]).map(_srP);

  const now    = new Date();
  const tglCetak = now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  // Hitung total keuangan — biaya_aktual dan estimasi bisa comma-separated
  let grandTotal = 0, grandEst = 0;
  dokArr.forEach(d => {
    if(d.biaya_aktual) (d.biaya_aktual+'').split(',').forEach(v=>{ grandTotal += rupiahNum(v); });
    if(d.estimasi_biaya_item) (d.estimasi_biaya_item+'').split(',').forEach(v=>{ grandEst += rupiahNum(v); });
  });

  // Baris keuangan global — expand comma-separated per baris
  const keuRows = [];
  dokArr.forEach(d => {
    if (!d.tanggal_sesi) return;
    const proker = items.find(p => p.num === d.proker_id);
    const { biayaRows: bRows } = parseDokRow(d);
    bRows.forEach(b => {
      keuRows.push({
        proker: proker ? '#'+d.proker_id+' '+proker.judul.replace(/&amp;/g,'&') : '#'+d.proker_id,
        tanggal: d.tanggal_sesi,
        item: b.item_biaya,
        estimasi: rupiahNum(b.estimasi_biaya_item),
        aktual: rupiahNum(b.biaya_aktual),
      });
    });
  });
  keuRows.sort((a,b) => (a.tanggal > b.tanggal ? 1 : -1));

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Laporan Program Kerja JCOSASI 2026–2027</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1a1a2e; line-height: 1.5; }
  .cover { text-align: center; padding: 0 40px; border-bottom: 3px solid #3D1A5E; page-break-after: always;
    min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .cover h1 { font-size: 22pt; color: #3D1A5E; margin-bottom: 8px; }
  .cover h2 { font-size: 14pt; font-weight: 400; color: #555; margin-bottom: 32px; }
  .cover .org { font-size: 12pt; color: #3D1A5E; font-weight: 600; }
  .cover .meta { font-size: 10pt; color: #888; margin-top: 8px; }
  .cover .tgl { margin-top: 40px; font-size: 10pt; color: #aaa; }
  .cover-logo-wrap { margin-bottom: 24px; }
  .cover-logo { width: 110px; height: 110px; object-fit: contain; filter: drop-shadow(0 4px 16px rgba(61,26,94,.2)); }
  .cover-logo-fallback { font-size: 72pt; line-height: 1; }
  h2.section-title { font-size: 13pt; color: #3D1A5E; border-bottom: 2px solid #3D1A5E; padding-bottom: 6px; margin: 24px 0 14px; }
  h3.proker-title { font-size: 11pt; color: #2c0a4a; background: #f5eeff; padding: 8px 12px; border-left: 4px solid #3D1A5E; margin: 20px 0 10px; page-break-before: auto; }
  .proker-meta { display: flex; flex-wrap: wrap; gap: 8px 24px; margin-bottom: 10px; font-size: 9.5pt; color: #444; }
  .proker-meta span::before { content: '• '; color: #9B59D4; }
  .tujuan { font-size: 10pt; color: #333; margin-bottom: 10px; background: #fafafa; padding: 8px 10px; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 12px; }
  th { background: #3D1A5E; color: #fff; padding: 6px 8px; text-align: left; font-weight: 600; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  tr:nth-child(even) td { background: #f8f5ff; }
  .num-col { text-align: right; font-variant-numeric: tabular-nums; }
  .total-row td { font-weight: 700; background: #ede0f8 !important; }
  .grand-total { text-align: right; font-size: 10pt; font-weight: 700; color: #3D1A5E; margin-top: 4px; }
  .dok-sesi { margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; }
  .dok-sesi-header { font-weight: 600; font-size: 10pt; color: #3D1A5E; margin-bottom: 4px; }
  .dok-sesi-meta { font-size: 9pt; color: #666; margin-bottom: 4px; }
  .dok-sesi-ket { font-size: 9.5pt; }
  .no-data { color: #aaa; font-style: italic; font-size: 9.5pt; }
  .keu-table th:nth-child(3), .keu-table td:nth-child(3),
  .keu-table th:nth-child(4), .keu-table td:nth-child(4) { text-align: right; }
  @media print {
    .cover { page-break-after: always; }
    h3.proker-title { page-break-before: auto; }
    .no-print { display: none; }
  }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: #3D1A5E; color: #fff;
    border: none; border-radius: 99px; padding: 12px 24px; font-size: 11pt; cursor: pointer;
    box-shadow: 0 4px 16px rgba(61,26,94,.35); z-index: 999; }
  .print-btn:hover { background: #6B34AF; }

  /* ── SAVE GUIDE OVERLAY ── */
  .save-guide-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(20,10,40,.72); backdrop-filter: blur(3px);
    display: flex; align-items: center; justify-content: center; padding: 20px;
    animation: sgFadeIn .25s ease;
  }
  @keyframes sgFadeIn { from { opacity:0; } to { opacity:1; } }
  .save-guide-box {
    background: #fff; border-radius: 16px; padding: 28px 32px;
    max-width: 440px; width: 100%;
    box-shadow: 0 20px 60px rgba(20,10,40,.35); text-align: center;
  }
  .save-guide-icon { font-size: 2.5rem; margin-bottom: 10px; }
  .save-guide-title { font-family: 'Segoe UI',Arial,sans-serif; font-size: 15pt; font-weight: 700; color: #3D1A5E; margin-bottom: 6px; }
  .save-guide-fname { display: inline-block; background: #f5eeff; color: #3D1A5E; border-radius: 7px; padding: 4px 14px; font-family: 'Courier New',monospace; font-size: 9pt; margin-bottom: 18px; word-break: break-all; }
  .save-guide-steps { text-align: left; margin: 0 0 16px; font-family: 'Segoe UI',Arial,sans-serif; font-size: 9.5pt; color: #333; line-height: 1.9; padding-left: 18px; }
  .save-guide-steps li strong { color: #3D1A5E; }
  .save-guide-tip { font-size: 8.5pt; color: #777; background: #fffbea; border: 1px solid #ffe082; border-radius: 7px; padding: 7px 12px; margin-bottom: 18px; font-family: 'Segoe UI',Arial,sans-serif; }
  .save-guide-btn { background: #3D1A5E; color: #fff; border: none; border-radius: 99px; padding: 11px 30px; font-size: 10.5pt; font-weight: 600; cursor: pointer; font-family: 'Segoe UI',Arial,sans-serif; box-shadow: 0 4px 16px rgba(61,26,94,.3); transition: background .2s; }
  .save-guide-btn:hover { background: #6B34AF; }
  @media print { .save-guide-overlay { display: none !important; } }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-logo-wrap">
    <img src="${window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/logo-jcosasi.png')}" alt="JCOSASI" class="cover-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"/>
    <div class="cover-logo-fallback" style="display:none">🌸</div>
  </div>
  <h1>Laporan Program Kerja</h1>
  <h2>Periode 2026–2027</h2>
  <div class="org">${org.nama_lengkap||'JCOSASI'} (${org.nama_singkat||'JCOSASI'})</div>
  <div class="meta">${org.sekolah||''} · Cikarang Barat, Bekasi</div>
  <div class="meta">Angkatan ${org.angkatan_aktif||'12'} · Berdiri ${org.berdiri||'2013'}</div>
  <div class="tgl">Dicetak pada: ${tglCetak}</div>
</div>

<!-- DAFTAR PROKER -->
<h2 class="section-title">📋 Daftar & Deskripsi Program Kerja</h2>
${items.map(p => {
  const det = detArr.find(d => d.proker_id === p.num) || {};
  const aktual  = actArr.filter(r => r.proker_id === p.num && r.status !== 'batal').length;
  const jadwals = jadArr.filter(r => r.proker_id === p.num);
  const dokSesiRows = dokArr.filter(d=>d.proker_id===p.num&&d.tanggal_sesi);
  const dokSesi = [...new Set(dokSesiRows.map(d=>d.tanggal_sesi))];

  // Total durasi
  let totMenitProker = 0;
  dokSesiRows.forEach(d => {
    if (!d.waktu_mulai || !d.waktu_selesai) return;
    const [h1,m1] = d.waktu_mulai.split(':').map(Number);
    const [h2,m2] = d.waktu_selesai.split(':').map(Number);
    if (!isNaN(h1)&&!isNaN(h2)) { const mnt=(h2*60+m2)-(h1*60+m1); if(mnt>0) totMenitProker+=mnt; }
  });
  const totDurasiProker = totMenitProker >= 60
    ? Math.floor(totMenitProker/60)+'j '+(totMenitProker%60>0?totMenitProker%60+'mnt':'')
    : totMenitProker > 0 ? totMenitProker+'mnt' : '0';

  // Total biaya aktual proker ini
  let totBiayaProker = 0;
  dokSesiRows.forEach(d => {
    if(d.biaya_aktual) (d.biaya_aktual+'').split(',').forEach(v=>{ totBiayaProker+=rupiahNum(v); });
  });

  const metaParts = [
    det.waktu_teks ? '⏰ '+det.waktu_teks : null,
    det.lokasi     ? '📍 '+det.lokasi     : null,
    det.sasaran    ? '👥 '+det.sasaran    : null,
    det.pemateri   ? '🎤 '+det.pemateri   : null,
  ].filter(Boolean);

  return `
  <h3 class="proker-title">${p.icon} #${p.num} — ${p.judul.replace(/&amp;/g,'&')} <span style="font-size:9pt;font-weight:400;color:#777">(${p.tag})</span></h3>
  <div class="tujuan">${det.tujuan || p.desc?.replace(/<[^>]*>/g,'') || '–'}</div>
  ${metaParts.length ? `<div class="proker-meta">${metaParts.map(m=>`<span>${m}</span>`).join('')}</div>` : ''}
  <div style="font-size:9pt;color:#555;margin-bottom:14px">
    Jadwal direncanakan: <strong>${jadwals.length}</strong> sesi &nbsp;|&nbsp;
    Terlaksana: <strong>${aktual}</strong> &nbsp;|&nbsp;
    Terdokumentasi: <strong>${dokSesi.length}</strong> sesi &nbsp;|&nbsp; Total durasi: <strong>${totDurasiProker}</strong> &nbsp;|&nbsp; Total biaya: <strong>${totBiayaProker>0?rupiah(totBiayaProker):'Rp 0'}</strong>
  </div>`;
}).join('')}

<!-- KEUANGAN -->
<h2 class="section-title" style="margin-top:32px">💰 Rekapitulasi Keuangan</h2>
${keuRows.length ? `
<table class="keu-table">
  <thead><tr><th>Proker</th><th>Tanggal</th><th>Item Biaya</th><th>Estimasi</th><th>Aktual</th></tr></thead>
  <tbody>
    ${keuRows.map(r=>`<tr>
      <td>${r.proker}</td>
      <td>${formatTglPanjang(r.tanggal)}</td>
      <td>${r.item}</td>
      <td class="num-col">${r.estimasi ? rupiah(r.estimasi) : '–'}</td>
      <td class="num-col">${r.aktual ? rupiah(r.aktual) : '–'}</td>
    </tr>`).join('')}
    <tr class="total-row"><td colspan="3">Total Keseluruhan</td><td class="num-col">${grandEst?rupiah(grandEst):'–'}</td><td class="num-col">${rupiah(grandTotal)||'–'}</td></tr>
  </tbody>
</table>` : '<p class="no-data">Belum ada data keuangan.</p>'}

<!-- DOKUMENTASI -->
<h2 class="section-title" style="margin-top:32px">📸 Dokumentasi Kegiatan</h2>
${items.map(p => {
  const sesiDok = dokArr.filter(d=>d.proker_id===p.num&&d.tanggal_sesi)
    .sort((a,b)=>a.tanggal_sesi>b.tanggal_sesi?1:-1);
  if (!sesiDok.length) return '';
  return `
  <h3 class="proker-title">${p.icon} #${p.num} — ${p.judul.replace(/&amp;/g,'&')}</h3>
  ${sesiDok.map((d,si) => {
    const { biayaRows: bRows } = parseDokRow(d);
    const biayaSesi = bRows.reduce((s,r)=>s+rupiahNum(r.biaya_aktual),0);
    const estSesi   = bRows.reduce((s,r)=>s+rupiahNum(r.estimasi_biaya_item),0);
    const dur  = hitungDurasi(d.waktu_mulai, d.waktu_selesai);
    const hadirParts = [
      d.hadir_peserta    ? { label: '👥 Peserta',     val: d.hadir_peserta }    : null,
      d.hadir_panitia    ? { label: '🤝 Panitia',     val: d.hadir_panitia }    : null,
      d.hadir_narasumber ? { label: '🎤 Narasumber',  val: d.hadir_narasumber } : null,
    ].filter(Boolean);
    return `<div class="dok-sesi">
      <div class="dok-sesi-header">Sesi ${si+1} — ${formatTglPanjang(d.tanggal_sesi)}</div>
      ${d.waktu_mulai ? `<div class="dok-sesi-meta">⏰ ${d.waktu_mulai}${d.waktu_selesai?' – '+d.waktu_selesai:''}${dur?' ('+dur+')':''}</div>` : ''}
      ${hadirParts.map(h=>`<div class="dok-sesi-meta"><strong>${h.label}:</strong> ${h.val}</div>`).join('')}
      ${d.keterangan?`<div class="dok-sesi-ket">${d.keterangan}</div>`:''}
      ${d.materi?`<div class="dok-sesi-ket"><strong>Materi:</strong> ${d.materi}</div>`:''}
      ${d.kendala?`<div class="dok-sesi-ket"><strong>Kendala:</strong> ${d.kendala}</div>`:''}
      ${bRows.length?`<table style="margin-top:6px">
        <thead><tr><th>Item</th><th style="text-align:right">Estimasi</th><th style="text-align:right">Aktual</th></tr></thead>
        <tbody>
          ${bRows.map(r=>`<tr>
            <td>${r.item_biaya||'–'}</td>
            <td class="num-col">${r.estimasi_biaya_item?rupiah(rupiahNum(r.estimasi_biaya_item)):'–'}</td>
            <td class="num-col">${r.biaya_aktual?rupiah(rupiahNum(r.biaya_aktual)):'–'}</td>
          </tr>`).join('')}
          <tr class="total-row"><td>Total Sesi</td><td class="num-col">${estSesi?rupiah(estSesi):'–'}</td><td class="num-col">${rupiah(biayaSesi)||'–'}</td></tr>
        </tbody>
      </table>`:''}
    </div>`;
  }).join('')}`;
}).join('')}

<button class="print-btn no-print" onclick="showPrintGuide('Laporan-Proker-JCOSASI-'+new Date().toLocaleDateString('id-ID').replace(/\\//g,'-')+'.pdf')">🖨️ Cetak / Simpan PDF</button>

<script>
function showPrintGuide(fileName) {
  var old = document.getElementById('saveGuideOverlay');
  if (old) old.remove();
  var overlay = document.createElement('div');
  overlay.id = 'saveGuideOverlay';
  overlay.className = 'save-guide-overlay';
  overlay.innerHTML =
    '<div class="save-guide-box">'
    + '<div class="save-guide-icon">🖨️</div>'
    + '<div class="save-guide-title">Simpan sebagai PDF ke Google Drive</div>'
    + '<div class="save-guide-fname">' + fileName + '</div>'
    + '<ol class="save-guide-steps">'
    + '<li>Klik <strong>Lanjut Cetak</strong> di bawah</li>'
    + '<li>Di dialog print, ubah <strong>Destination / Tujuan</strong></li>'
    + '<li>Pilih <strong>Save to Google Drive</strong> atau <strong>Save as PDF</strong></li>'
    + '<li>Ubah nama file sesuai nama di atas ↑</li>'
    + '<li>Klik <strong>Save / Simpan</strong></li>'
    + '</ol>'
    + '<div class="save-guide-tip">💡 Jika "Save to Google Drive" tidak muncul, pilih "Save as PDF" lalu upload ke folder <strong>Laporan JCOSASI</strong> di Drive</div>'
    + '<button class="save-guide-btn" onclick="doActualPrint()">🖨️ Lanjut Cetak</button>'
    + '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}
function doActualPrint() {
  var el = document.getElementById('saveGuideOverlay');
  if (el) el.remove();
  setTimeout(function() { window.print(); }, 150);
}
</script>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini.'); return; }
  win.document.write(html);
  win.document.close();
}

/* ══════════════════════════════════════════════
   CETAK LAPORAN — SATU PROKER (dipanggil dari proker-script.js)
══════════════════════════════════════════════ */
function printLaporanProker(proker, sheetsData) {
  const det    = sheetsData?.detail || {};
  const dok    = sheetsData?.dok    || [];
  const act    = sheetsData?.activity || [];
  const jadwal = sheetsData?.jadwal   || [];
  const org    = CONTENT?.org || {};

  const now      = new Date();
  const tglCetak = now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  const aktualCount = act.filter(r=>r.status!=='batal').length;
  const sesiDok = dok.filter(d=>d.tanggal_sesi).sort((a,b)=>a.tanggal_sesi>b.tanggal_sesi?1:-1);
  const dokSesiUniq = [...new Set(sesiDok.map(d=>d.tanggal_sesi))];

  let totalBiaya = 0;
  dok.forEach(d=>{
    if(d.biaya_aktual) (d.biaya_aktual+'').split(',').forEach(v=>{ totalBiaya+=rupiahNum(v); });
  });

  // Hitung total durasi dari sesi terdokumentasi
  let totMenitProker = 0;
  sesiDok.forEach(d => {
    if (!d.waktu_mulai || !d.waktu_selesai) return;
    const [h1,m1] = d.waktu_mulai.split(':').map(Number);
    const [h2,m2] = d.waktu_selesai.split(':').map(Number);
    if (!isNaN(h1)&&!isNaN(h2)) { const mnt=(h2*60+m2)-(h1*60+m1); if(mnt>0) totMenitProker+=mnt; }
  });
  const totDurasiProker = totMenitProker >= 60
    ? Math.floor(totMenitProker/60)+'j '+(totMenitProker%60>0?totMenitProker%60+'mnt':'')
    : totMenitProker > 0 ? totMenitProker+'mnt' : null;

  const metaParts = [
    det.waktu_teks ? '⏰ '+det.waktu_teks : null,
    det.lokasi     ? '📍 '+det.lokasi     : null,
    det.sasaran    ? '👥 '+det.sasaran    : null,
    det.pemateri   ? '🎤 '+det.pemateri   : null,
    det.panitia    ? '🤝 '+det.panitia    : null,
  ].filter(Boolean);

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Laporan ${proker.judul.replace(/&amp;/g,'&')} — JCOSASI</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1a1a2e; line-height: 1.5; padding: 32px 40px; max-width: 800px; margin: 0 auto; }
  .cover { text-align: center; padding: 0 40px; border-bottom: 3px solid #3D1A5E; margin-bottom: 28px;
    min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .cover .num { font-size: 28pt; font-weight: 900; color: #3D1A5E; }
  .cover h1 { font-size: 18pt; color: #2c0a4a; margin: 8px 0 4px; }
  .cover .tag { display:inline-block; background:#f5eeff; color:#3D1A5E; border-radius:99px; padding:2px 12px; font-size:9pt; margin-bottom:8px; }
  .cover .desc { font-size:10pt; color:#555; margin-bottom:12px; }
  .cover .org { font-size:9.5pt; color:#888; }
  .cover .tgl { margin-top:16px; font-size:9pt; color:#bbb; }
  .cover-logo { width: 80px; height: 80px; object-fit: contain; margin-bottom: 16px; filter: drop-shadow(0 3px 10px rgba(61,26,94,.2)); }
  h2 { font-size:12pt; color:#3D1A5E; border-bottom:2px solid #3D1A5E; padding-bottom:5px; margin:22px 0 12px; }
  .meta-grid { display:flex; flex-wrap:wrap; gap:6px 20px; margin-bottom:12px; font-size:9.5pt; color:#444; }
  .meta-grid span::before { content:'• '; color:#9B59D4; }
  .tujuan { background:#f8f5ff; border-left:3px solid #9B59D4; padding:10px 12px; font-size:10pt; border-radius:4px; margin-bottom:14px; }
  .stats { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
  .stat { background:#f5eeff; border-radius:8px; padding:10px 16px; text-align:center; min-width:80px; }
  .stat-num { display:block; font-size:14pt; font-weight:900; color:#3D1A5E; }
  .stat-lbl { display:block; font-size:8pt; color:#777; }
  table { width:100%; border-collapse:collapse; font-size:9.5pt; margin-bottom:12px; }
  th { background:#3D1A5E; color:#fff; padding:6px 8px; text-align:left; font-weight:600; }
  td { padding:5px 8px; border-bottom:1px solid #eee; vertical-align:top; }
  tr:nth-child(even) td { background:#f8f5ff; }
  .num-col { text-align:right; }
  .total-row td { font-weight:700; background:#ede0f8 !important; }
  .dok-sesi { border:1px solid #ddd; border-radius:4px; padding:10px 12px; margin-bottom:10px; }
  .dok-hdr { font-weight:600; color:#3D1A5E; margin-bottom:4px; }
  .dok-meta { font-size:9pt; color:#666; margin-bottom:4px; }
  .dok-ket { font-size:9.5pt; }
  .no-data { color:#aaa; font-style:italic; }
  .print-btn { position:fixed; bottom:24px; right:24px; background:#3D1A5E; color:#fff;
    border:none; border-radius:99px; padding:12px 24px; font-size:11pt; cursor:pointer;
    box-shadow:0 4px 16px rgba(61,26,94,.35); }
  .print-btn:hover { background:#6B34AF; }
  @media print { .print-btn { display:none; } }

  .save-guide-overlay{position:fixed;inset:0;z-index:9999;background:rgba(20,10,40,.72);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px;animation:sgFadeIn .25s ease}
  @keyframes sgFadeIn{from{opacity:0}to{opacity:1}}
  .save-guide-box{background:#fff;border-radius:16px;padding:28px 32px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(20,10,40,.35);text-align:center}
  .save-guide-icon{font-size:2.5rem;margin-bottom:10px}
  .save-guide-title{font-family:'Segoe UI',Arial,sans-serif;font-size:15pt;font-weight:700;color:#3D1A5E;margin-bottom:6px}
  .save-guide-fname{display:inline-block;background:#f5eeff;color:#3D1A5E;border-radius:7px;padding:4px 14px;font-family:'Courier New',monospace;font-size:9pt;margin-bottom:18px;word-break:break-all}
  .save-guide-steps{text-align:left;margin:0 0 16px;font-family:'Segoe UI',Arial,sans-serif;font-size:9.5pt;color:#333;line-height:1.9;padding-left:18px}
  .save-guide-steps li strong{color:#3D1A5E}
  .save-guide-tip{font-size:8.5pt;color:#777;background:#fffbea;border:1px solid #ffe082;border-radius:7px;padding:7px 12px;margin-bottom:18px;font-family:'Segoe UI',Arial,sans-serif}
  .save-guide-btn{background:#3D1A5E;color:#fff;border:none;border-radius:99px;padding:11px 30px;font-size:10.5pt;font-weight:600;cursor:pointer;font-family:'Segoe UI',Arial,sans-serif;box-shadow:0 4px 16px rgba(61,26,94,.3);transition:background .2s}
  .save-guide-btn:hover{background:#6B34AF}
  @media print{.save-guide-overlay{display:none!important}}
</style>
</head>
<body>
<div class="cover">
  <img src="${window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/logo-jcosasi.png')}" alt="JCOSASI" class="cover-logo" onerror="this.style.display='none'"/>
  <div class="num">${proker.icon} #${proker.num}</div>
  <h1>${proker.judul.replace(/&amp;/g,'&')}</h1>
  <span class="tag">${proker.tag}</span>
  <div class="desc">${proker.desc?.replace(/<[^>]*>/g,'')||''}</div>
  <div class="org">${org.nama_lengkap||'JCOSASI'} · ${org.sekolah||''} · Periode 2026–2027</div>
  <div class="tgl">Dicetak: ${tglCetak}</div>
</div>

<h2>📋 Deskripsi Kegiatan</h2>
<div class="tujuan">${det.tujuan||'–'}</div>
${metaParts.length?`<div class="meta-grid">${metaParts.map(m=>`<span>${m}</span>`).join('')}</div>`:''}

<div style="font-size:9pt;color:#555;margin-bottom:14px">
  Jadwal direncanakan: <strong>${jadwal.length}</strong> sesi &nbsp;|&nbsp;
  Terlaksana: <strong>${aktualCount}</strong> &nbsp;|&nbsp;
  Terdokumentasi: <strong>${dokSesiUniq.length}</strong> sesi &nbsp;|&nbsp; Total durasi: <strong>${totDurasiProker||'0'}</strong> &nbsp;|&nbsp; Total biaya: <strong>${totalBiaya>0?rupiah(totalBiaya):'Rp 0'}</strong>
</div>

${det.rab ? (() => {
  try {
    const rab = JSON.parse(det.rab);
    if (!rab.length) return '';
    return `<h2>💰 Rencana Anggaran Biaya (RAB)</h2>
    <table><thead><tr><th>Item</th><th class="num-col">Estimasi</th><th class="num-col">Aktual</th></tr></thead>
    <tbody>${rab.map(r=>`<tr><td>${r.item||'–'}</td><td class="num-col">${r.estimasi?rupiah(rupiahNum(r.estimasi)):'–'}</td><td class="num-col">${r.aktual?rupiah(rupiahNum(r.aktual)):'–'}</td></tr>`).join('')}</tbody></table>`;
  } catch(e) { return ''; }
})() : ''}

<h2>📸 Dokumentasi Kegiatan</h2>
${sesiDok.length ? sesiDok.map((d,si)=>{
  const { biayaRows: bRows } = parseDokRow(d);
  const biayaSesi = bRows.reduce((s,r)=>s+rupiahNum(r.biaya_aktual),0);
  const estSesiP  = bRows.reduce((s,r)=>s+rupiahNum(r.estimasi_biaya_item),0);
  const dur  = hitungDurasi(d.waktu_mulai,d.waktu_selesai);
  const hadirPartsP = [
    d.hadir_peserta    ? { label: '👥 Peserta',    val: d.hadir_peserta }    : null,
    d.hadir_panitia    ? { label: '🤝 Panitia',    val: d.hadir_panitia }    : null,
    d.hadir_narasumber ? { label: '🎤 Narasumber', val: d.hadir_narasumber } : null,
  ].filter(Boolean);
  return `<div class="dok-sesi">
    <div class="dok-hdr">Sesi ${si+1} — ${formatTglPanjang(d.tanggal_sesi)}</div>
    ${d.waktu_mulai?`<div class="dok-meta">⏰ ${d.waktu_mulai}${d.waktu_selesai?' – '+d.waktu_selesai:''}${dur?' ('+dur+')':''}</div>`:''}
    ${hadirPartsP.length ? hadirPartsP.map(h =>
      `<div class="dok-meta"><strong>${h.label}:</strong> ${h.val}</div>`
    ).join('') : ''}
    ${d.keterangan?`<div class="dok-ket">${d.keterangan}</div>`:''}
    ${d.materi?`<div class="dok-ket"><strong>Materi:</strong> ${d.materi}</div>`:''}
    ${d.kendala?`<div class="dok-ket"><strong>Kendala:</strong> ${d.kendala}</div>`:''}
    ${bRows.length?`<table style="margin-top:8px">
      <thead><tr><th>Item</th><th class="num-col">Estimasi</th><th class="num-col">Aktual</th></tr></thead>
      <tbody>${bRows.map(r=>`<tr><td>${r.item_biaya||'–'}</td><td class="num-col">${r.estimasi_biaya_item?rupiah(rupiahNum(r.estimasi_biaya_item)):'–'}</td><td class="num-col">${r.biaya_aktual?rupiah(rupiahNum(r.biaya_aktual)):'–'}</td></tr>`).join('')}
      <tr class="total-row"><td>Total Sesi</td><td class="num-col">${estSesiP?rupiah(estSesiP):'–'}</td><td class="num-col">${rupiah(biayaSesi)||'–'}</td></tr></tbody>
    </table>`:''}
  </div>`;
}).join('') : '<p class="no-data">Belum ada dokumentasi.</p>'}

<button class="print-btn" onclick="showPrintGuide((document.title||'Laporan-JCOSASI').replace(/ /g,'-')+'.pdf')">🖨️ Cetak / Simpan PDF</button>

<script>
function showPrintGuide(fileName) {
  var old = document.getElementById('saveGuideOverlay');
  if (old) old.remove();
  var overlay = document.createElement('div');
  overlay.id = 'saveGuideOverlay';
  overlay.className = 'save-guide-overlay';
  overlay.innerHTML =
    '<div class="save-guide-box">'
    + '<div class="save-guide-icon">🖨️</div>'
    + '<div class="save-guide-title">Simpan sebagai PDF ke Google Drive</div>'
    + '<div class="save-guide-fname">' + fileName + '</div>'
    + '<ol class="save-guide-steps">'
    + '<li>Klik <strong>Lanjut Cetak</strong> di bawah</li>'
    + '<li>Di dialog print, ubah <strong>Destination / Tujuan</strong></li>'
    + '<li>Pilih <strong>Save to Google Drive</strong> atau <strong>Save as PDF</strong></li>'
    + '<li>Ubah nama file sesuai nama di atas ↑</li>'
    + '<li>Klik <strong>Save / Simpan</strong></li>'
    + '</ol>'
    + '<div class="save-guide-tip">💡 Jika tidak ada opsi Drive, pilih "Save as PDF" lalu upload ke folder <strong>Laporan JCOSASI</strong> di Drive</div>'
    + '<button class="save-guide-btn" onclick="doActualPrint()">🖨️ Lanjut Cetak</button>'
    + '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}
function doActualPrint() {
  var el = document.getElementById('saveGuideOverlay');
  if (el) el.remove();
  setTimeout(function() { window.print(); }, 150);
}
</script>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini.'); return; }
  win.document.write(html);
  win.document.close();
}

/* ══════════════════════════════════════════════
   CETAK LAPORAN SATU SESI — dari halaman rekap
══════════════════════════════════════════════ */
function printLaporanSesi(idx) {
  const sesiList = window._rekapSesiList;
  if (!sesiList || !sesiList[idx]) return;

  const sesi     = sesiList[idx];
  const d        = sesi.rows ? sesi.rows[0] : sesi; // compat: rows[0] or direct d
  const proker   = getProkerByNum(sesi.proker_id || d.proker_id);
  const org      = CONTENT?.org || {};
  const now      = new Date();
  const tglCetak = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const tglSesi  = formatTglPanjang(sesi.tanggal_sesi || d.tanggal_sesi);
  const dur      = hitungDurasi(d.waktu_mulai, d.waktu_selesai);
  const jamStr   = d.waktu_mulai
    ? d.waktu_mulai + (d.waktu_selesai ? ' – ' + d.waktu_selesai : '') + (dur ? ' (' + dur + ')' : '')
    : '–';

  const hadirRows = [];
  const parseNama = (str, peran) =>
    (str||'').split(',').map(n=>n.trim()).filter(Boolean).map(nama => ({ nama, peran }));
  parseNama(d.hadir_peserta,    'Peserta').forEach(r => hadirRows.push(r));
  parseNama(d.hadir_panitia,    'Panitia').forEach(r => hadirRows.push(r));
  parseNama(d.hadir_narasumber, 'Narasumber').forEach(r => hadirRows.push(r));

  // Biaya — parseDokRow handles comma-separated
  const { fotos: fotosArr, biayaRows: biayaItems } = parseDokRow(d);
  const totalBiaya = biayaItems.reduce((s,r) => s + rupiahNum(r.biaya_aktual), 0);
  const totalEst   = biayaItems.reduce((s,r) => s + rupiahNum(r.estimasi_biaya_item), 0);

  // Nomor sesi
  const sesiProkerSama = sesiList
    .filter(s => (s.proker_id||s.rows?.[0]?.proker_id) === (sesi.proker_id||d.proker_id))
    .sort((a,b) => ((a.tanggal_sesi||a.rows?.[0]?.tanggal_sesi) > (b.tanggal_sesi||b.rows?.[0]?.tanggal_sesi) ? 1 : -1));
  const nomorSesi = sesiProkerSama.findIndex(s => (s.tanggal_sesi||s.rows?.[0]?.tanggal_sesi) === (sesi.tanggal_sesi||d.tanggal_sesi)) + 1;

  const fotos = fotosArr; // array of URLs

  // ── Layout foto adaptif berdasarkan jumlah ──
  // 1 foto  → full width (1 kolom)
  // 2 foto  → 2 kolom sejajar
  // 3 foto  → foto pertama full width, 2 lainnya di bawah
  // 4 foto  → 2×2 grid
  // 5+ foto → foto pertama full width, sisanya 2 kolom (max 5 diambil)
  const fotosCapped = fotos.slice(0, 5); // fotos is now array of URL strings
  const n = fotosCapped.length;
  let fotoGridCols, fotoGridClass;
  if      (n === 1) { fotoGridCols = '1fr';         fotoGridClass = 'fg-1'; }
  else if (n === 2) { fotoGridCols = '1fr 1fr';     fotoGridClass = 'fg-2'; }
  else if (n === 3) { fotoGridCols = '1fr 1fr';     fotoGridClass = 'fg-3'; }
  else if (n === 4) { fotoGridCols = '1fr 1fr';     fotoGridClass = 'fg-4'; }
  else              { fotoGridCols = '1fr 1fr';     fotoGridClass = 'fg-5'; }

  // Tinggi foto adaptif — lebih tinggi jika lebih sedikit
  const fotoH = n === 1 ? '220px' : n <= 2 ? '190px' : '150px';

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Laporan Sesi — ${proker ? proker.judul.replace(/&amp;/g,'&') : 'Proker'} · ${tglSesi}</title>
<style>
/* ── Reset & Base ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 210mm; min-height: 297mm; }
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  font-size: 10.5pt;
  color: #1a1a2e;
  line-height: 1.55;
  padding: 18mm 18mm 16mm;
}

/* ── KOP SURAT ── */
.kop {
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 3px solid #3D1A5E;
  padding-bottom: 10px;
  margin-bottom: 6px;
}
.kop-logo {
  width: 52px; height: 52px; flex-shrink: 0;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24pt; overflow: hidden;
}
.kop-text { flex: 1; }
.kop-org   { font-size: 13pt; font-weight: 800; color: #3D1A5E; letter-spacing: .3px; }
.kop-sub   { font-size: 8.5pt; color: #666; }
.kop-right { text-align: right; font-size: 8pt; color: #999; }

/* ── JUDUL LAPORAN ── */
.lap-title {
  text-align: center;
  margin: 10px 0 4px;
  font-size: 13pt;
  font-weight: 800;
  color: #2c0a4a;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.lap-sub {
  text-align: center;
  font-size: 9pt;
  color: #666;
  margin-bottom: 14px;
}
.divider { border: none; border-top: 1px solid #ddd; margin: 10px 0; }

/* ── INFO BOKS ── */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 24px;
  background: #f8f5ff;
  border: 1px solid #d9c8f5;
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 14px;
  font-size: 9.5pt;
}
.info-row { display: flex; gap: 6px; }
.info-label { color: #666; min-width: 90px; flex-shrink: 0; }
.info-val   { font-weight: 600; color: #1a1a2e; }

/* ── SECTION TITLE ── */
h3 {
  font-size: 10pt;
  color: #3D1A5E;
  border-left: 3px solid #3D1A5E;
  padding-left: 8px;
  margin: 14px 0 8px;
  text-transform: uppercase;
  letter-spacing: .4px;
}

/* ── TABEL UMUM ── */
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
th {
  background: #3D1A5E; color: #fff;
  padding: 6px 8px; text-align: left; font-weight: 600;
}
td { padding: 5px 8px; border-bottom: 1px solid #eee; }
tr:nth-child(even) td { background: #f8f5ff; }
.num-col { text-align: right; font-variant-numeric: tabular-nums; }
.total-row td { font-weight: 700; background: #ede0f8 !important; border-top: 2px solid #c4a0e8; }

/* ── BADGE PERAN ── */
.badge-peserta    { background: #DBEAFE; color: #1D4ED8; border-radius: 99px; padding: 1px 8px; font-size: 8.5pt; font-weight: 600; }
.badge-panitia    { background: #D1FAE5; color: #065F46; border-radius: 99px; padding: 1px 8px; font-size: 8.5pt; font-weight: 600; }
.badge-narasumber { background: #FEF3C7; color: #92400E; border-radius: 99px; padding: 1px 8px; font-size: 8.5pt; font-weight: 600; }

/* ── TEKS BEBAS ── */
.text-box {
  background: #fafafa;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 9.5pt;
  margin-bottom: 10px;
}
.text-label { font-size: 8.5pt; color: #888; text-transform: uppercase; letter-spacing: .3px; margin-bottom: 3px; }

/* ── FOTO ── */
.foto-section { margin-top: 4px; }
.foto-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  margin-bottom: 8px;
  break-inside: avoid;
  page-break-inside: avoid;
  align-items: flex-start;
}
.foto-cell {
  flex: 1;
  min-width: 0;
  break-inside: avoid;
  page-break-inside: avoid;
  text-align: center;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px;
}
.foto-cell img {
  display: block;
  max-width: 100%;
  max-height: var(--fh, 140px); /* batas tinggi — foto tidak akan melebihi ini */
  width: auto;
  height: auto;
  object-fit: contain;       /* seluruh foto tampil, tidak terpotong */
  margin: 0 auto;
  border-radius: 2px;
}
.foto-cap {
  font-size: 7.5pt; color: #777;
  text-align: center; margin-top: 3px;
}
h3.foto-h3 {
  break-before: auto;
  page-break-before: auto;
}

/* ── TTD AREA ── */
.ttd-area {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 20px;
}
.ttd-box {
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px 12px;
}
.ttd-role { font-size: 8.5pt; font-weight: 700; color: #3D1A5E; margin-bottom: 48px; }
.ttd-line { border-top: 1px solid #555; margin-top: 0; }
.ttd-name { font-size: 8pt; color: #555; margin-top: 4px; }

/* ── NO DATA ── */
.no-data { color: #bbb; font-style: italic; font-size: 9pt; }

/* ── PRINT ── */
.print-btn {
  position: fixed; bottom: 20px; right: 20px;
  background: #3D1A5E; color: #fff;
  border: none; border-radius: 99px;
  padding: 10px 22px; font-size: 10.5pt;
  cursor: pointer; box-shadow: 0 4px 16px rgba(61,26,94,.35);
}
.print-btn:hover { background: #6B34AF; }
@media print {
  body { padding: 12mm 14mm; }
  .print-btn { display: none; }
  .foto-row  { break-inside: avoid !important; page-break-inside: avoid !important; }
  .foto-cell { break-inside: avoid !important; page-break-inside: avoid !important; }
  .foto-section { break-inside: avoid !important; page-break-inside: avoid !important; }
  h3.foto-h3 { break-after: avoid !important; page-break-after: avoid !important; }
}

  .save-guide-overlay{position:fixed;inset:0;z-index:9999;background:rgba(20,10,40,.72);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px;animation:sgFadeIn .25s ease}
  @keyframes sgFadeIn{from{opacity:0}to{opacity:1}}
  .save-guide-box{background:#fff;border-radius:16px;padding:28px 32px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(20,10,40,.35);text-align:center}
  .save-guide-icon{font-size:2.5rem;margin-bottom:10px}
  .save-guide-title{font-family:'Segoe UI',Arial,sans-serif;font-size:15pt;font-weight:700;color:#3D1A5E;margin-bottom:6px}
  .save-guide-fname{display:inline-block;background:#f5eeff;color:#3D1A5E;border-radius:7px;padding:4px 14px;font-family:'Courier New',monospace;font-size:9pt;margin-bottom:18px;word-break:break-all}
  .save-guide-steps{text-align:left;margin:0 0 16px;font-family:'Segoe UI',Arial,sans-serif;font-size:9.5pt;color:#333;line-height:1.9;padding-left:18px}
  .save-guide-steps li strong{color:#3D1A5E}
  .save-guide-tip{font-size:8.5pt;color:#777;background:#fffbea;border:1px solid #ffe082;border-radius:7px;padding:7px 12px;margin-bottom:18px;font-family:'Segoe UI',Arial,sans-serif}
  .save-guide-btn{background:#3D1A5E;color:#fff;border:none;border-radius:99px;padding:11px 30px;font-size:10.5pt;font-weight:600;cursor:pointer;font-family:'Segoe UI',Arial,sans-serif;box-shadow:0 4px 16px rgba(61,26,94,.3);transition:background .2s}
  .save-guide-btn:hover{background:#6B34AF}
  @media print{.save-guide-overlay{display:none!important}}
</style>
</head>
<body>

<!-- KOP -->
<div class="kop">
  <div class="kop-logo">
    <img src="${window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/logo-jcosasi.png')}" alt="J" style="width:100%;height:100%;object-fit:contain;border-radius:6px" onerror="this.style.display='none';this.parentElement.innerHTML='${proker ? proker.icon : '&#127800;'}'"/>
  </div>
  <div class="kop-text">
    <div class="kop-org">${org.nama_lengkap || 'JCOSASI'}</div>
    <div class="kop-sub">${org.sekolah || 'SMKN 1 Cikarang Barat'} · ${org.angkatan_aktif || 'Angkatan 12'} · Periode 2026–2027</div>
  </div>
  <div class="kop-right">Dicetak: ${tglCetak}</div>
</div>

<div class="lap-title">Laporan Kegiatan</div>
<div class="lap-sub">${proker ? proker.judul.replace(/&amp;/g,'&') : 'Program Kerja'} · Sesi ke-${nomorSesi}</div>
<hr class="divider"/>

<!-- INFO KEGIATAN -->
<div class="info-grid">
  <div class="info-row">
    <span class="info-label">Program Kerja</span>
    <span class="info-val">${proker ? '#' + sesi.proker_id + ' ' + proker.judul.replace(/&amp;/g,'&') : sesi.proker_id}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Nomor Sesi</span>
    <span class="info-val">Sesi ke-${nomorSesi} dari ${sesiProkerSama.length} sesi</span>
  </div>
  <div class="info-row">
    <span class="info-label">Tanggal</span>
    <span class="info-val">${tglSesi}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Waktu</span>
    <span class="info-val">${jamStr}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Jumlah Hadir</span>
    <span class="info-val">${hadirRows.length > 0 ? hadirRows.length + ' orang' : '–'}</span>
  </div>
  ${d.lokasi ? `<div class="info-row">
    <span class="info-label">Lokasi</span>
    <span class="info-val">${d.lokasi}</span>
  </div>` : ''}
  ${totalBiaya > 0 ? `<div class="info-row">
    <span class="info-label">Total Biaya</span>
    <span class="info-val">${rupiah(totalBiaya)}</span>
  </div>` : ''}
</div>

${d.keterangan ? `
<div class="text-box">
  <div class="text-label">Keterangan Kegiatan</div>
  ${d.keterangan}
</div>` : ''}

${d.materi ? `
<div class="text-box">
  <div class="text-label">Materi &amp; Progress</div>
  ${d.materi}
</div>` : ''}

${d.kendala ? `
<div class="text-box" style="border-color:#FECACA;background:#FFF5F5;">
  <div class="text-label" style="color:#B91C1C;">Kendala &amp; Evaluasi</div>
  ${d.kendala}
</div>` : ''}

<!-- DAFTAR HADIR -->
${hadirRows.length ? `
<h3>✅ Daftar Hadir</h3>
<table>
  <thead>
    <tr>
      <th style="width:36px">No</th>
      <th>Nama</th>
      <th style="width:110px">Peran</th>
      <th style="width:110px">Tanda Tangan</th>
    </tr>
  </thead>
  <tbody>
    ${hadirRows.map((r,i) => `<tr>
      <td class="num-col">${i+1}</td>
      <td>${r.nama}</td>
      <td><span class="badge-${r.peran.toLowerCase()}">${r.peran}</span></td>
      <td style="height:24px"></td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

<!-- RINCIAN BIAYA -->
${biayaItems.length ? `
<h3>💰 Rincian Biaya</h3>
<table>
  <thead>
    <tr>
      <th>Item</th>
      <th class="num-col" style="width:110px">Estimasi</th>
      <th class="num-col" style="width:110px">Aktual</th>
    </tr>
  </thead>
  <tbody>
    ${biayaItems.map(r => `<tr>
      <td>${r.item_biaya || '–'}</td>
      <td class="num-col">${r.estimasi_biaya_item ? rupiah(rupiahNum(r.estimasi_biaya_item)) : '–'}</td>
      <td class="num-col">${r.biaya_aktual ? rupiah(rupiahNum(r.biaya_aktual)) : '–'}</td>
    </tr>`).join('')}
    <tr class="total-row">
      <td>Total</td>
      <td class="num-col">${totalEst ? rupiah(totalEst) : '–'}</td>
      <td class="num-col">${rupiah(totalBiaya) || '–'}</td>
    </tr>
  </tbody>
</table>` : ''}

<!-- FOTO KEGIATAN -->
${fotosCapped.length ? (() => {
  // Susun foto menjadi baris-baris flex yang aman untuk print
  // Layout:
  //  1 foto  → 1 baris, 1 foto full (tinggi 220px)
  //  2 foto  → 1 baris, 2 foto (tinggi 190px)
  //  3 foto  → baris 1: 1 foto full (200px), baris 2: 2 foto (155px)
  //  4 foto  → 2 baris × 2 foto (165px)
  //  5 foto  → baris 1: 1 foto full (200px), baris 2: 2 foto, baris 3: 2 foto (145px)
  const imgs = fotosCapped.map(url => ({
    src: convertGDriveUrl(url),
    cap: '',
    url: url,
  }));

  let fotoRows = [];
  // --fh = max-height untuk img (object-fit:contain → tidak pernah terpotong)
  // Nilai dikurangi agar foto portrait tetap muat dalam 1 halaman
  if (n === 1) {
    fotoRows = [[{ ...imgs[0], h: '180px' }]];
  } else if (n === 2) {
    fotoRows = [[{ ...imgs[0], h: '150px' }, { ...imgs[1], h: '150px' }]];
  } else if (n === 3) {
    fotoRows = [
      [{ ...imgs[0], h: '155px' }],
      [{ ...imgs[1], h: '120px' }, { ...imgs[2], h: '120px' }],
    ];
  } else if (n === 4) {
    fotoRows = [
      [{ ...imgs[0], h: '130px' }, { ...imgs[1], h: '130px' }],
      [{ ...imgs[2], h: '130px' }, { ...imgs[3], h: '130px' }],
    ];
  } else {
    fotoRows = [
      [{ ...imgs[0], h: '150px' }],
      [{ ...imgs[1], h: '115px' }, { ...imgs[2], h: '115px' }],
      [{ ...imgs[3], h: '115px' }, { ...imgs[4], h: '115px' }],
    ];
  }

  const rowsHtml = fotoRows.map(row => `
    <div class="foto-row">
      ${row.map(img => `
        <div class="foto-cell" style="--fh:${img.h}">
          <img src="${img.src}" alt="${img.cap}"
               onerror="this.closest('.foto-cell').style.display='none'"/>
          ${img.cap ? `<div class="foto-cap">${img.cap}</div>` : ''}
        </div>`).join('')}
    </div>`).join('');

  return `
<h3 class="foto-h3">📷 Foto Kegiatan${fotos.length > 5 ? ' (menampilkan 5 dari '+fotos.length+')' : ''}</h3>
<div class="foto-section">${rowsHtml}</div>`;
})() : ''}

<!-- TANDA TANGAN -->
<div class="ttd-area" style="margin-top:${fotos.length?'16px':'32px'}">
  <div class="ttd-box">
    <div class="ttd-role">Ketua Pelaksana</div>
    <hr class="ttd-line"/>
    <div class="ttd-name">( _________________________ )</div>
  </div>
  <div class="ttd-box">
    <div class="ttd-role">Sekretaris</div>
    <hr class="ttd-line"/>
    <div class="ttd-name">( _________________________ )</div>
  </div>
  <div class="ttd-box">
    <div class="ttd-role">Pembina / Guru Pendamping</div>
    <hr class="ttd-line"/>
    <div class="ttd-name">( _________________________ )</div>
  </div>
</div>

<button class="print-btn" onclick="showPrintGuide((document.title||'Laporan-Sesi-JCOSASI').replace(/ /g,'-').replace(/[·—]/g,'-')+'.pdf')">🖨️ Cetak / Simpan PDF</button>

<script>
function showPrintGuide(fileName) {
  var old = document.getElementById('saveGuideOverlay');
  if (old) old.remove();
  var overlay = document.createElement('div');
  overlay.id = 'saveGuideOverlay';
  overlay.className = 'save-guide-overlay';
  overlay.innerHTML =
    '<div class="save-guide-box">'
    + '<div class="save-guide-icon">🖨️</div>'
    + '<div class="save-guide-title">Simpan sebagai PDF ke Google Drive</div>'
    + '<div class="save-guide-fname">' + fileName + '</div>'
    + '<ol class="save-guide-steps">'
    + '<li>Klik <strong>Lanjut Cetak</strong> di bawah</li>'
    + '<li>Di dialog print, ubah <strong>Destination / Tujuan</strong></li>'
    + '<li>Pilih <strong>Save to Google Drive</strong> atau <strong>Save as PDF</strong></li>'
    + '<li>Ubah nama file sesuai nama di atas ↑</li>'
    + '<li>Klik <strong>Save / Simpan</strong></li>'
    + '</ol>'
    + '<div class="save-guide-tip">💡 Jika "Save to Google Drive" tidak muncul, pilih "Save as PDF" lalu upload ke folder <strong>Laporan JCOSASI</strong> di Drive</div>'
    + '<button class="save-guide-btn" onclick="doActualPrint()">🖨️ Lanjut Cetak</button>'
    + '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}
function doActualPrint() {
  var el = document.getElementById('saveGuideOverlay');
  if (el) el.remove();
  setTimeout(function() { window.print(); }, 150);
}
</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini.'); return; }
  win.document.write(html);
  win.document.close();
}
