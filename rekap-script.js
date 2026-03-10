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

  const detArr = (allData?.detArr || []).map(r => ({ ...r, proker_id: normId(r.proker_id) }));
  const notArr = (allData?.notArr || []).map(r => ({ ...r, proker_id: normId(r.proker_id) }));
  const cfgArr = (allData?.cfgArr || []).map(r => ({ ...r, proker_id: normId(r.proker_id) }));
  const actArr = (allData?.actArr || []).map(r => ({ ...r, proker_id: normId(r.proker_id) }));
  const jadArr = (allData?.jadArr || []).map(r => ({ ...r, proker_id: normId(r.proker_id) }));
  const dokArr = (allData?.dokArr || []).map(r => ({ ...r, proker_id: normId(r.proker_id) }));

  /* ── Statistik global ── */
  const totalProker   = items.length;
  const totalRutin    = items.filter(p => (p.cat||'').includes('rutin')).length;
  const totalEvent    = items.filter(p => (p.cat||'').includes('event')).length;
  const totalAktual   = new Set(actArr.filter(r => r.status !== 'batal').map(r => r.proker_id + '|' + r.tanggal)).size
                      + new Set(dokArr.map(r => r.proker_id + '|' + r.tanggal_sesi)).size;
  const totalDokSesi  = new Set(dokArr.filter(r=>r.tanggal_sesi).map(r => r.proker_id+'|'+r.tanggal_sesi)).size;
  const totalBiaya    = dokArr.reduce((s,r) => s + rupiahNum(r.biaya_aktual), 0);

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
      if (c.estDate && (idx === 0)) startCountdown(c.estDate, c.cdId);
    });
  }, 0);

  return html;
}

/* ══════════════════════════════════════════════
   DOKUMENTASI SEMUA PROKER
   Semua sesi digabung, diurutkan terbaru di atas,
   masing-masing ditandai nama prokernya
══════════════════════════════════════════════ */
function renderRekapDok(items, dokArr) {
  if (!dokArr || !dokArr.length) {
    return `<div class="dok-empty">
      <div class="de-icon">📷</div>
      <p>Dokumentasi belum tersedia.</p>
      <p class="de-sub">Akan diperbarui setelah kegiatan berlangsung.</p>
    </div>`;
  }

  /* Gabungkan semua sesi unik: key = proker_id|tanggal_sesi */
  const sesiMap = {};
  dokArr.forEach(d => {
    if (!d.tanggal_sesi) return;
    const key = d.proker_id + '|' + d.tanggal_sesi;
    if (!sesiMap[key]) sesiMap[key] = { proker_id: d.proker_id, tanggal_sesi: d.tanggal_sesi, rows: [] };
    sesiMap[key].rows.push(d);
  });

  /* Urutkan terbaru di atas */
  const sesiList = Object.values(sesiMap).sort((a, b) => {
    const da = a.tanggal_sesi || '', db = b.tanggal_sesi || '';
    if (da > db) return -1;
    if (da < db) return 1;
    return 0;
  });

  if (!sesiList.length) {
    return `<div class="dok-empty"><div class="de-icon">📷</div><p>Dokumentasi belum tersedia.</p></div>`;
  }

  return `<div class="dok-sesi-list">${sesiList.map((sesi, idx) => {
    const items_rows = sesi.rows;
    const proker     = getProkerByNum(sesi.proker_id);
    const d          = items_rows[0];
    const tglStr     = formatTglPanjang(sesi.tanggal_sesi);
    const jamStr     = (d.waktu_mulai && d.waktu_selesai) ? `${d.waktu_mulai} – ${d.waktu_selesai}` : d.waktu_mulai||'';
    const dur        = hitungDurasi(d.waktu_mulai, d.waktu_selesai);
    const ket        = d.keterangan || '';

    /* Foto */
    const fotos    = items_rows.filter(i => i.foto_url);
    const fotoHtml = fotos.length ? `<div class="dsb-section">
      <div class="dsb-label">📷 Foto Kegiatan</div>
      <div class="dok-foto-grid">${fotos.map(item => {
        const src = convertGDriveUrl(item.foto_url);
        const alt = item.keterangan || 'Foto kegiatan';
        return `<a href="${item.foto_url}" target="_blank" rel="noopener" class="dok-foto-wrap" title="${alt}">
          <img class="dok-foto" src="${src}" alt="${alt}" loading="lazy"
               onerror="this.closest('.dok-foto-wrap').innerHTML='<div class=\\'dok-foto-err\\'>🖼️</div>'"/>
          ${item.keterangan ? `<div class="dok-foto-cap">${item.keterangan}</div>` : ''}
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
    let totBiayaSesi = 0;
    const biayaRows  = items_rows.filter(i => i.item_biaya || i.biaya_aktual);
    biayaRows.forEach(i => { totBiayaSesi += rupiahNum(i.biaya_aktual); });
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
        <tfoot><tr class="rab-total"><td>Total Sesi</td><td>–</td><td>${rupiah(totBiayaSesi)||'–'}</td></tr></tfoot>
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
          <!-- Label nama proker -->
          <div class="dsh-proker-badge">
            <span class="dpb-icon">${proker ? proker.icon : '📌'}</span>
            <span class="dpb-name">${proker ? '#'+sesi.proker_id+' '+proker.judul.replace(/&amp;/g,'&') : 'Proker '+sesi.proker_id}</span>
          </div>
          <div class="dsh-info">
            <span class="dsh-tanggal">${tglStr}</span>
            ${jamStr ? `<span class="dsh-jam">${jamStr}${dur?' · '+dur:''}</span>` : ''}
            ${ket ? `<span class="dsh-ket">${ket}</span>` : ''}
          </div>
        </div>
        <div class="dsh-right">
          ${totBiayaSesi > 0 ? `<span class="dsh-biaya">${rupiah(totBiayaSesi)}</span>` : ''}
          <span class="dsh-toggle" id="${rkTi}">▾</span>
        </div>
      </div>
      <div class="dok-sesi-body" id="${rkId}">
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
  const detArr = (allData?.detArr||[]).map(r=>({...r, proker_id: normId(r.proker_id)}));
  const dokArr = (allData?.dokArr||[]).map(r=>({...r, proker_id: normId(r.proker_id)}));
  const actArr = (allData?.actArr||[]).map(r=>({...r, proker_id: normId(r.proker_id)}));
  const jadArr = (allData?.jadArr||[]).map(r=>({...r, proker_id: normId(r.proker_id)}));

  const now    = new Date();
  const tglCetak = now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  // Hitung total keuangan
  let grandTotal = 0;
  dokArr.forEach(d => { grandTotal += rupiahNum(d.biaya_aktual); });

  // Baris keuangan global
  const keuRows = [];
  const sesiSeen = new Set();
  dokArr.forEach(d => {
    if (!d.tanggal_sesi || !d.item_biaya) return;
    const sesiKey = d.proker_id + '|' + d.tanggal_sesi + '|' + d.item_biaya;
    if (sesiSeen.has(sesiKey)) return;
    sesiSeen.add(sesiKey);
    const proker = items.find(p => p.num === d.proker_id);
    keuRows.push({
      proker: proker ? '#'+d.proker_id+' '+proker.judul.replace(/&amp;/g,'&') : '#'+d.proker_id,
      tanggal: d.tanggal_sesi,
      item: d.item_biaya,
      estimasi: rupiahNum(d.estimasi_biaya_item),
      aktual: rupiahNum(d.biaya_aktual),
    });
  });
  // Urutkan per tanggal
  keuRows.sort((a,b) => (a.tanggal > b.tanggal ? 1 : -1));

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Laporan Program Kerja JCOSASI 2026–2027</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1a1a2e; line-height: 1.5; }
  .cover { text-align: center; padding: 60px 40px; border-bottom: 3px solid #3D1A5E; page-break-after: always; }
  .cover h1 { font-size: 22pt; color: #3D1A5E; margin-bottom: 8px; }
  .cover h2 { font-size: 14pt; font-weight: 400; color: #555; margin-bottom: 32px; }
  .cover .org { font-size: 12pt; color: #3D1A5E; font-weight: 600; }
  .cover .meta { font-size: 10pt; color: #888; margin-top: 8px; }
  .cover .tgl { margin-top: 40px; font-size: 10pt; color: #aaa; }
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
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div style="font-size:40pt;margin-bottom:16px">🌸</div>
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
  const dokSesi = [...new Set(dokArr.filter(d=>d.proker_id===p.num&&d.tanggal_sesi).map(d=>d.tanggal_sesi))];

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
  <div style="font-size:9pt;color:#555;margin-bottom:4px">
    Jadwal direncanakan: <strong>${jadwals.length}</strong> sesi &nbsp;|&nbsp;
    Terlaksana: <strong>${aktual}</strong> &nbsp;|&nbsp;
    Terdokumentasi: <strong>${dokSesi.length}</strong> sesi
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
    <tr class="total-row"><td colspan="4">Total Keseluruhan</td><td class="num-col">${rupiah(grandTotal)||'–'}</td></tr>
  </tbody>
</table>` : '<p class="no-data">Belum ada data keuangan.</p>'}

<!-- DOKUMENTASI -->
<h2 class="section-title" style="margin-top:32px">📸 Dokumentasi Kegiatan</h2>
${items.map(p => {
  const sesiMap = {};
  dokArr.filter(d=>d.proker_id===p.num&&d.tanggal_sesi).forEach(d=>{
    if(!sesiMap[d.tanggal_sesi]) sesiMap[d.tanggal_sesi]=[];
    sesiMap[d.tanggal_sesi].push(d);
  });
  const sesiKeys = Object.keys(sesiMap).sort();
  if (!sesiKeys.length) return '';
  return `
  <h3 class="proker-title">${p.icon} #${p.num} — ${p.judul.replace(/&amp;/g,'&')}</h3>
  ${sesiKeys.map((tgl,si) => {
    const rows = sesiMap[tgl];
    const d    = rows[0];
    const biayaSesi = rows.reduce((s,r)=>s+rupiahNum(r.biaya_aktual),0);
    const dur  = hitungDurasi(d.waktu_mulai, d.waktu_selesai);
    const hadirAll = [d.hadir_peserta,d.hadir_panitia,d.hadir_narasumber].filter(Boolean).join(', ');
    const biayaItems = rows.filter(r=>r.item_biaya||r.biaya_aktual);
    return `<div class="dok-sesi">
      <div class="dok-sesi-header">Sesi ${si+1} — ${formatTglPanjang(tgl)}</div>
      <div class="dok-sesi-meta">
        ${d.waktu_mulai?'⏰ '+d.waktu_mulai+(d.waktu_selesai?' – '+d.waktu_selesai:'')+(dur?' ('+dur+')':''):'' }
        ${hadirAll ? ' &nbsp;|&nbsp; 👥 '+hadirAll : ''}
        ${biayaSesi ? ' &nbsp;|&nbsp; 💰 '+rupiah(biayaSesi) : ''}
      </div>
      ${d.keterangan?`<div class="dok-sesi-ket">${d.keterangan}</div>`:''}
      ${d.materi?`<div class="dok-sesi-ket"><strong>Materi:</strong> ${d.materi}</div>`:''}
      ${d.kendala?`<div class="dok-sesi-ket"><strong>Kendala:</strong> ${d.kendala}</div>`:''}
      ${biayaItems.length?`<table style="margin-top:6px">
        <thead><tr><th>Item</th><th style="text-align:right">Estimasi</th><th style="text-align:right">Aktual</th></tr></thead>
        <tbody>${biayaItems.map(r=>`<tr><td>${r.item_biaya||'–'}</td><td class="num-col">${r.estimasi_biaya_item?rupiah(rupiahNum(r.estimasi_biaya_item)):'–'}</td><td class="num-col">${r.biaya_aktual?rupiah(rupiahNum(r.biaya_aktual)):'–'}</td></tr>`).join('')}</tbody>
      </table>`:''}
    </div>`;
  }).join('')}`;
}).join('')}

<button class="print-btn no-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
</body></html>`;

  const win = window.open('', '_blank');
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

  const aktualCount = act.filter(r=>r.status!=='batal').length +
    new Set(dok.filter(d=>d.tanggal_sesi).map(d=>d.tanggal_sesi)).size;
  const sesiMap = {};
  dok.forEach(d=>{ if(!d.tanggal_sesi){return;} if(!sesiMap[d.tanggal_sesi])sesiMap[d.tanggal_sesi]=[]; sesiMap[d.tanggal_sesi].push(d); });
  const sesiKeys = Object.keys(sesiMap).sort();

  let totalBiaya = 0;
  dok.forEach(d=>{ totalBiaya += rupiahNum(d.biaya_aktual); });

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
  .cover { text-align: center; padding: 40px 20px 32px; border-bottom: 3px solid #3D1A5E; margin-bottom: 28px; }
  .cover .num { font-size: 28pt; font-weight: 900; color: #3D1A5E; }
  .cover h1 { font-size: 18pt; color: #2c0a4a; margin: 8px 0 4px; }
  .cover .tag { display:inline-block; background:#f5eeff; color:#3D1A5E; border-radius:99px; padding:2px 12px; font-size:9pt; margin-bottom:8px; }
  .cover .desc { font-size:10pt; color:#555; margin-bottom:12px; }
  .cover .org { font-size:9.5pt; color:#888; }
  .cover .tgl { margin-top:16px; font-size:9pt; color:#bbb; }
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
</style>
</head>
<body>
<div class="cover">
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

<div class="stats">
  <div class="stat"><span class="stat-num">${jadwal.length}</span><span class="stat-lbl">Jadwal</span></div>
  <div class="stat"><span class="stat-num">${aktualCount}</span><span class="stat-lbl">Terlaksana</span></div>
  <div class="stat"><span class="stat-num">${sesiKeys.length}</span><span class="stat-lbl">Terdokumentasi</span></div>
  <div class="stat"><span class="stat-num">${totalBiaya>0?rupiah(totalBiaya):'–'}</span><span class="stat-lbl">Total Biaya</span></div>
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
${sesiKeys.length ? sesiKeys.map((tgl,si)=>{
  const rows = sesiMap[tgl];
  const d    = rows[0];
  const biayaSesi = rows.reduce((s,r)=>s+rupiahNum(r.biaya_aktual),0);
  const dur  = hitungDurasi(d.waktu_mulai,d.waktu_selesai);
  const hadirAll = [
    d.hadir_peserta && '👥 Peserta: '+d.hadir_peserta,
    d.hadir_panitia && '🤝 Panitia: '+d.hadir_panitia,
    d.hadir_narasumber && '🎤 Narasumber: '+d.hadir_narasumber,
  ].filter(Boolean).join(' | ');
  const biayaItems = rows.filter(r=>r.item_biaya||r.biaya_aktual);
  return `<div class="dok-sesi">
    <div class="dok-hdr">Sesi ${si+1} — ${formatTglPanjang(tgl)}</div>
    ${d.waktu_mulai?`<div class="dok-meta">⏰ ${d.waktu_mulai}${d.waktu_selesai?' – '+d.waktu_selesai:''}${dur?' ('+dur+')':''}</div>`:''}
    ${hadirAll?`<div class="dok-meta">${hadirAll}</div>`:''}
    ${d.keterangan?`<div class="dok-ket">${d.keterangan}</div>`:''}
    ${d.materi?`<div class="dok-ket"><strong>Materi:</strong> ${d.materi}</div>`:''}
    ${d.kendala?`<div class="dok-ket"><strong>Kendala:</strong> ${d.kendala}</div>`:''}
    ${biayaItems.length?`<table style="margin-top:8px">
      <thead><tr><th>Item</th><th class="num-col">Estimasi</th><th class="num-col">Aktual</th></tr></thead>
      <tbody>${biayaItems.map(r=>`<tr><td>${r.item_biaya||'–'}</td><td class="num-col">${r.estimasi_biaya_item?rupiah(rupiahNum(r.estimasi_biaya_item)):'–'}</td><td class="num-col">${r.biaya_aktual?rupiah(rupiahNum(r.biaya_aktual)):'–'}</td></tr>`).join('')}
      <tr class="total-row"><td>Total Sesi</td><td>–</td><td class="num-col">${rupiah(biayaSesi)||'–'}</td></tr></tbody>
    </table>`:''}
  </div>`;
}).join('') : '<p class="no-data">Belum ada dokumentasi.</p>'}

<button class="print-btn" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}
