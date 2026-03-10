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
  buildActivityGraph('rekapActivityGraph', actArr, jadArr, dokArr);
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
    });
  });

  if (!cards.length) {
    return `<div class="notif-empty"><div class="ne-icon">📭</div><p>Belum ada pemberitahuan aktif.</p></div>`;
  }

  /* Urut dari yang paling dekat jadwalnya */
  cards.sort((a, b) => a.nearestMs - b.nearestMs);

  const html = cards.map(c => `
    <div class="rekap-notif-card">
      <div class="rnc-header">
        <a href="proker.html?id=${c.pid}" class="rnc-proker-link">
          <span class="rnc-icon">${c.proker.icon}</span>
          <span class="rnc-num">#${c.pid}</span>
          <span class="rnc-name">${c.proker.judul.replace(/&amp;/g,'&')}</span>
          <span class="rnc-arrow">→</span>
        </a>
      </div>
      <div class="rnc-body">${c.notifHtml}</div>
    </div>`).join('');

  /* Jalankan semua countdown setelah DOM ready */
  setTimeout(() => {
    cards.forEach(c => {
      if (c.estDate) startCountdown(c.estDate, c.cdId);
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
