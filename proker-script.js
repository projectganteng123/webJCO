/**
 * ============================================================
 *  JCOSASI — proker-script.js
 *  Logic halaman detail program kerja
 *  - Routing via ?id=01
 *  - Countdown otomatis
 *  - Activity graph (Jan 2026 – Jan 2027)
 *  - Fetch data dari Google Sheets (pemberitahuan, deskripsi detail, dokumentasi)
 * ============================================================
 */

/* ── Helpers ── */
const $  = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);

/* ── Ambil ID proker dari URL ── */
function getProkerIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || '01';
}

/* ── Cari data proker dari CONTENT ── */
function getProkerData(id) {
  if (!CONTENT || !CONTENT.proker || !CONTENT.proker.items) return null;
  return CONTENT.proker.items.find(p => p.num === id) || null;
}

/* ── Format tanggal Indonesia ── */
function formatTanggal(date) {
  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
}

/* ── Hitung status proker ── */
function getStatus(proker) {
  const now = new Date();
  // Cari tanggal estimasi dari detail proker
  const detailWaktu = proker.detail ? proker.detail.find(d =>
    d.label.includes('Estimasi') || d.label.includes('Waktu')
  ) : null;

  // Proker rutin = ongoing jika periode aktif
  if (proker.cat && proker.cat.includes('rutin')) {
    const start = new Date('2026-01-01');
    const end   = new Date('2027-01-31');
    if (now >= start && now <= end) return 'ongoing';
    if (now < start) return 'upcoming';
    return 'done';
  }

  // Coba parse tanggal dari detail
  if (detailWaktu && detailWaktu.val) {
    const val = detailWaktu.val;
    // Format: "25 Juli 2026", "22 Agustus 2026", dll
    const monthMap = {
      'januari':1,'februari':2,'maret':3,'april':4,'mei':5,'juni':6,
      'juli':7,'agustus':8,'september':9,'oktober':10,'november':11,'desember':12
    };
    const parts = val.toLowerCase().replace('est. ','').split(' ');
    if (parts.length >= 3) {
      const d = parseInt(parts[0]);
      const m = monthMap[parts[1]];
      const y = parseInt(parts[2]);
      if (d && m && y) {
        const eventDate = new Date(y, m-1, d);
        const diff = eventDate - now;
        if (diff > 86400000) return 'upcoming';   // > 1 hari ke depan
        if (diff > -604800000) return 'ongoing';  // dalam 7 hari terakhir
        return 'done';
      }
    }
  }

  return 'upcoming';
}

/* ── Parse tanggal estimasi untuk countdown ── */
function parseEstimasiDate(proker) {
  const detailEst = proker.detail ? proker.detail.find(d =>
    d.label.includes('Estimasi')
  ) : null;
  if (!detailEst) return null;

  const val = detailEst.val;
  const monthMap = {
    'januari':1,'februari':2,'maret':3,'april':4,'mei':5,'juni':6,
    'juli':7,'agustus':8,'september':9,'oktober':10,'november':11,'desember':12
  };
  const parts = val.toLowerCase().replace('est. ','').split(' ');
  if (parts.length >= 3) {
    const d = parseInt(parts[0]);
    const m = monthMap[parts[1]];
    const y = parseInt(parts[2]);
    if (d && m && y) return new Date(y, m-1, d, 8, 0, 0);
  }
  return null;
}

/* ── Render countdown ── */
function startCountdown(targetDate, containerId) {
  const container = $(containerId);
  if (!container || !targetDate) return;

  function update() {
    const now  = new Date();
    const diff = targetDate - now;

    if (diff <= 0) {
      container.innerHTML = `<div class="countdown-label">Kegiatan telah berlangsung 🎉</div>`;
      return;
    }

    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);
    const secs  = Math.floor((diff % 60000) / 1000);

    container.innerHTML = `
      <div class="countdown-label">Menuju hari pelaksanaan</div>
      <div class="countdown-boxes">
        <div class="cd-box"><span class="cd-num">${String(days).padStart(2,'0')}</span><span class="cd-unit">Hari</span></div>
        <div class="cd-box"><span class="cd-num">${String(hours).padStart(2,'0')}</span><span class="cd-unit">Jam</span></div>
        <div class="cd-box"><span class="cd-num">${String(mins).padStart(2,'0')}</span><span class="cd-unit">Menit</span></div>
        <div class="cd-box"><span class="cd-num">${String(secs).padStart(2,'0')}</span><span class="cd-unit">Detik</span></div>
      </div>`;
  }

  update();
  setInterval(update, 1000);
}

/* ══════════════════════════════════════════════
   ACTIVITY GRAPH
   Januari 2026 – Januari 2027 (53 minggu)
══════════════════════════════════════════════ */
function buildActivityGraph(containerId, activityDates) {
  const container = $(containerId);
  if (!container) return;

  const START = new Date(2026, 0, 1);   // 1 Jan 2026
  const END   = new Date(2027, 0, 31);  // 31 Jan 2027
  const today = new Date();
  today.setHours(0,0,0,0);

  // Map tanggal → level (0=none, 1=low, 2=med, 3=high)
  const dateMap = {};
  (activityDates || []).forEach(entry => {
    if (entry.tanggal) {
      const key = entry.tanggal; // format: "YYYY-MM-DD"
      dateMap[key] = parseInt(entry.level) || 1;
    }
  });

  // Mulai dari Minggu pertama sebelum/pada 1 Jan 2026
  const graphStart = new Date(START);
  graphStart.setDate(graphStart.getDate() - graphStart.getDay()); // mundur ke Minggu

  const weeks = [];
  const monthLabels = [];
  let cur = new Date(graphStart);
  let lastMonth = -1;

  while (cur <= END) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    // Label bulan (tampilkan di minggu pertama bulan itu)
    const firstInRange = week.find(d => d >= START && d <= END);
    if (firstInRange && firstInRange.getMonth() !== lastMonth) {
      lastMonth = firstInRange.getMonth();
      monthLabels.push({ weekIdx: weeks.length, month: firstInRange.getMonth() });
    }
    weeks.push(week);
  }

  const namaHari  = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const namaBulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

  // Hitung stats
  let totalAktif   = 0;
  let streakSekarang = 0;
  let streakTerbanyak = 0;
  let tmpStreak    = 0;

  weeks.forEach(week => {
    week.forEach(day => {
      if (day < START || day > END) return;
      const key = day.toISOString().split('T')[0];
      if (dateMap[key] && day <= today) {
        totalAktif++;
        tmpStreak++;
        if (tmpStreak > streakTerbanyak) streakTerbanyak = tmpStreak;
      } else {
        if (day <= today) tmpStreak = 0;
      }
    });
  });
  // Streak sekarang (mundur dari hari ini)
  let checkDay = new Date(today);
  while (true) {
    const key = checkDay.toISOString().split('T')[0];
    if (dateMap[key]) { streakSekarang++; checkDay.setDate(checkDay.getDate()-1); }
    else break;
  }

  // Render month labels
  const monthRow = document.createElement('div');
  monthRow.className = 'activity-months';
  weeks.forEach((_, wi) => {
    const label = monthLabels.find(ml => ml.weekIdx === wi);
    const span = document.createElement('div');
    span.className = 'activity-month-label';
    span.style.minWidth = '14px';
    span.textContent = label ? namaBulan[label.month] : '';
    monthRow.appendChild(span);
  });

  // Render graph
  const graphWrap = document.createElement('div');
  graphWrap.className = 'activity-graph-wrap';
  const graph = document.createElement('div');
  graph.className = 'activity-graph';

  weeks.forEach(week => {
    const weekCol = document.createElement('div');
    weekCol.className = 'activity-week';

    week.forEach(day => {
      const cell = document.createElement('div');
      cell.className = 'activity-day';

      const isFuture  = day > today;
      const inRange   = day >= START && day <= END;
      const key       = day.toISOString().split('T')[0];
      const level     = inRange && !isFuture ? (dateMap[key] || 0) : 0;

      if (!inRange) {
        cell.style.visibility = 'hidden';
      } else if (isFuture) {
        cell.setAttribute('data-future', '1');
        cell.setAttribute('data-level', '0');
      } else {
        cell.setAttribute('data-level', level);
      }

      // Tooltip
      if (inRange) {
        const tgl = formatTanggal(day);
        const statusText = isFuture ? 'Belum tiba' :
          level === 0 ? 'Tidak ada kegiatan' :
          level === 1 ? 'Ada kegiatan' :
          level === 2 ? 'Kegiatan aktif' : 'Kegiatan intensif';
        cell.title = `${tgl} — ${statusText}`;

        cell.addEventListener('mouseenter', e => showTooltip(e, `${tgl} — ${statusText}`));
        cell.addEventListener('mouseleave', hideTooltip);
        cell.addEventListener('mousemove', moveTooltip);
      }

      weekCol.appendChild(cell);
    });
    graph.appendChild(weekCol);
  });

  graphWrap.appendChild(graph);

  // Stats
  const stats = document.createElement('div');
  stats.className = 'activity-stats';
  stats.innerHTML = `
    <div class="astat"><span class="astat-num">${totalAktif}</span><span class="astat-label">Hari aktif</span></div>
    <div class="astat"><span class="astat-num">${streakSekarang}</span><span class="astat-label">Streak saat ini</span></div>
    <div class="astat"><span class="astat-num">${streakTerbanyak}</span><span class="astat-label">Streak terpanjang</span></div>`;

  container.innerHTML = '';

  // Legend (di luar scroll area)
  const legend = document.createElement('div');
  legend.className = 'activity-header';
  legend.innerHTML = `
    <span style="font-size:.8rem;color:var(--grey-mid)">Jan 2026 — Jan 2027</span>
    <div class="activity-legend">
      Lebih sedikit
      <div class="al-boxes">
        <div class="al-box al-0"></div>
        <div class="al-box al-1"></div>
        <div class="al-box al-2"></div>
        <div class="al-box al-3"></div>
      </div>
      Lebih banyak
    </div>`;

  // FIX: bulan + kotak dalam 1 wrapper scroll tunggal — tidak ada 2 scrollbar
  const scrollWrapper = document.createElement('div');
  scrollWrapper.className = 'activity-scroll-wrapper';
  scrollWrapper.appendChild(monthRow);
  scrollWrapper.appendChild(graphWrap);

  container.appendChild(legend);
  container.appendChild(scrollWrapper);
  container.appendChild(stats);
}

/* ── Tooltip handlers ── */
let _tooltipEl;
function showTooltip(e, text) {
  _tooltipEl = $('dayTooltip');
  if (!_tooltipEl) return;
  _tooltipEl.textContent = text;
  _tooltipEl.style.opacity = '1';
  moveTooltip(e);
}
function hideTooltip() {
  if (_tooltipEl) _tooltipEl.style.opacity = '0';
}
function moveTooltip(e) {
  if (!_tooltipEl) return;
  _tooltipEl.style.left = (e.clientX + 12) + 'px';
  _tooltipEl.style.top  = (e.clientY - 30) + 'px';
}

/* ══════════════════════════════════════════════
   RENDER HALAMAN
══════════════════════════════════════════════ */

function renderPage(proker, sheetsData) {
  const main  = $('mainContent');
  const id    = proker.num;
  const items = CONTENT.proker.items;
  const idx   = items.findIndex(p => p.num === id);
  const prev  = idx > 0         ? items[idx-1] : null;
  const next  = idx < items.length-1 ? items[idx+1] : null;

  const status   = getStatus(proker);
  const estDate  = parseEstimasiDate(proker);
  const detail   = sheetsData ? sheetsData.detail   : null;
  const notifs   = sheetsData ? sheetsData.notifs   : [];
  const activity = sheetsData ? sheetsData.activity : [];
  const dok      = sheetsData ? sheetsData.dok      : [];

  // Update nav
  $('navTitle').textContent = proker.judul.replace(/&amp;/g,'&');
  $('navNum').textContent   = `#${id}`;
  document.title            = `${proker.judul.replace(/&amp;/g,'&')} — JCOSASI`;

  // Status label
  const statusLabel = { upcoming:'Akan Datang', ongoing:'Sedang Berjalan', done:'Selesai' }[status];
  const statusClass = { upcoming:'status-upcoming', ongoing:'status-ongoing', done:'status-done' }[status];

  /* ── Detail dari Sheets atau fallback dari content.js ── */
  const D = detail || {};
  const waktu    = D.waktu    || (proker.detail ? (proker.detail.find(d=>d.label.includes('Waktu')||d.label.includes('Estimasi'))||{val:'–'}).val : '–');
  const lokasi   = D.lokasi   || '–';
  const sasaran  = D.sasaran  || (proker.detail ? (proker.detail.find(d=>d.label.includes('Sasaran'))||{val:'–'}).val : '–');
  const tujuan   = D.tujuan   || '–';
  const pemateri = D.pemateri || '–';
  const panitia  = D.panitia  || '';
  const catDok   = D.catatan_dokumentasi || '';
  const rabItems = D.rab ? JSON.parse(D.rab) : [];

  /* ── RAB ── */
  function renderRAB(items) {
    if (!items || items.length === 0) return `<div class="rab-empty">RAB belum diisi</div>`;
    const rows = items.map(r =>
      `<tr><td>${r.nama||''}</td><td>${r.qty||''}</td><td>${r.satuan||''}</td><td>${r.harga_satuan||''}</td><td><strong>${r.total||''}</strong></td></tr>`
    ).join('');
    const total = items.reduce((s,r) => {
      const t = parseInt((r.total||'0').replace(/\D/g,''));
      return s + (isNaN(t)?0:t);
    }, 0);
    return `
      <table class="rab-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Satuan</th><th>Harga/sat</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="rab-total"><td colspan="4">Total Estimasi</td><td>Rp ${total.toLocaleString('id-ID')}</td></tr></tfoot>
      </table>`;
  }

  /* ── Panitia chips ── */
  function renderPanitia(str) {
    if (!str || str === '–') return '<div class="di-value" style="color:var(--grey-mid);font-style:italic">Belum diisi</div>';
    return `<div class="panitia-list">${str.split(',').map(p => `<span class="panitia-chip">${p.trim()}</span>`).join('')}</div>`;
  }

  /* ── Pemberitahuan ── */
  function renderNotifs() {
    const typeIcon = { info:'ℹ️', warning:'⚠️', success:'✅' };
    const typeClass = { info:'notif-info', warning:'notif-warning', success:'notif-success' };
    if (!notifs || notifs.length === 0) {
      if (status === 'upcoming' && estDate) {
        return `<div id="countdownBox" class="countdown-wrap"></div>`;
      }
      return `<div class="notif-empty"><div class="ne-icon">📭</div><p>Belum ada pemberitahuan untuk proker ini.</p></div>`;
    }
    let html = '';
    if (status === 'upcoming' && estDate) {
      html += `<div id="countdownBox" class="countdown-wrap" style="margin-bottom:20px"></div>`;
    }
    html += `<div class="notif-list">${notifs.map(n => `
      <div class="notif-item ${typeClass[n.tipe] || 'notif-info'}">
        <div class="ni-icon">${typeIcon[n.tipe] || 'ℹ️'}</div>
        <div class="ni-body">
          <div class="ni-title">${n.judul || ''}</div>
          <div class="ni-text">${n.isi || ''}</div>
          ${n.tanggal ? `<div class="ni-date">${n.tanggal}</div>` : ''}
        </div>
      </div>`).join('')}</div>`;
    return html;
  }

  /* ── Dokumentasi multi-sesi ── */
  function renderDok() {
    if (!dok || dok.length === 0) {
      return `<div class="dok-empty">
        <div class="de-icon">📷</div>
        <p>Dokumentasi belum tersedia.</p>
        <p style="font-size:.8rem;margin-top:6px">Akan diperbarui setelah kegiatan berlangsung.</p>
      </div>`;
    }

    // Kelompokkan dokumentasi berdasarkan tanggal_sesi
    const sesiMap = {};
    dok.forEach(d => {
      const key = d.tanggal_sesi || d.tanggal || 'Tanggal tidak diketahui';
      if (!sesiMap[key]) sesiMap[key] = [];
      sesiMap[key].push(d);
    });
    const sesiKeys = Object.keys(sesiMap).sort();
    const jumlahSesi = sesiKeys.length;

    // Hitung total biaya aktual dari semua sesi
    let totalBiayaAktual = 0;
    dok.forEach(d => {
      if (d.biaya_aktual) {
        const num = parseInt((d.biaya_aktual + '').replace(/\D/g,''));
        if (!isNaN(num)) totalBiayaAktual += num;
      }
    });

    // ── Header ringkasan otomatis ──
    let summaryHtml = '';
    if (jumlahSesi === 1) {
      // Hanya 1 sesi: tampilkan tanggal
      const tglFormatted = formatTglLong(sesiKeys[0]);
      summaryHtml = `
        <div class="dok-summary single">
          <div class="dsum-stat">
            <span class="dsum-icon">📅</span>
            <div><span class="dsum-val">${tglFormatted}</span><span class="dsum-label">Tanggal Kegiatan</span></div>
          </div>
          ${totalBiayaAktual > 0 ? `
          <div class="dsum-stat">
            <span class="dsum-icon">💸</span>
            <div><span class="dsum-val">Rp ${totalBiayaAktual.toLocaleString('id-ID')}</span><span class="dsum-label">Total Biaya Dikeluarkan</span></div>
          </div>` : ''}
        </div>`;
    } else {
      // Lebih dari 1 sesi: tampilkan jumlah + total biaya
      summaryHtml = `
        <div class="dok-summary multi">
          <div class="dsum-stat">
            <span class="dsum-icon">🔄</span>
            <div><span class="dsum-val">${jumlahSesi}×</span><span class="dsum-label">Kegiatan Telah Dilaksanakan</span></div>
          </div>
          ${totalBiayaAktual > 0 ? `
          <div class="dsum-stat">
            <span class="dsum-icon">💸</span>
            <div><span class="dsum-val">Rp ${totalBiayaAktual.toLocaleString('id-ID')}</span><span class="dsum-label">Total Biaya Dikeluarkan</span></div>
          </div>` : ''}
          <div class="dsum-stat">
            <span class="dsum-icon">📅</span>
            <div>
              <span class="dsum-val" style="font-size:.9rem">${formatTglShort(sesiKeys[0])} – ${formatTglShort(sesiKeys[sesiKeys.length-1])}</span>
              <span class="dsum-label">Rentang Pelaksanaan</span>
            </div>
          </div>
        </div>`;
    }

    // ── Render tiap sesi ──
    const sesiHtml = sesiKeys.map((key, idx) => {
      const items = sesiMap[key];
      // Ambil data utama dari item pertama sesi ini
      const d = items[0];

      // Foto-foto dari semua item sesi ini
      const fotoHtml = items
        .filter(item => item.foto_url)
        .map(item => {
          // Convert Google Drive link ke direct image link jika perlu
          const src = convertGDriveUrl(item.foto_url);
          return `<a href="${item.foto_url}" target="_blank" rel="noopener" class="dok-foto-wrap">
            <img class="dok-foto" src="${src}" alt="${item.keterangan||'Foto kegiatan'}" loading="lazy"
                 onerror="this.closest('.dok-foto-wrap').innerHTML='<div class=\\'dok-foto-err\\'>🖼️ Foto tidak dapat dimuat</div>'"/>
          </a>`;
        }).join('');

      // Daftar hadir
      const hadirHtml = buildHadirSection(d);

      // Biaya sesi ini
      let biayaSesi = 0;
      items.forEach(item => {
        if (item.biaya_aktual) {
          const num = parseInt((item.biaya_aktual+'').replace(/\D/g,''));
          if (!isNaN(num)) biayaSesi += num;
        }
      });

      return `
        <div class="dok-sesi" id="sesi-${idx+1}">
          <div class="dok-sesi-header" onclick="toggleSesi(${idx})">
            <div class="dsh-left">
              <span class="dsh-num">Sesi ${idx+1}</span>
              <span class="dsh-tanggal">${formatTglLong(key)}</span>
              ${d.waktu_mulai && d.waktu_selesai
                ? `<span class="dsh-jam">${d.waktu_mulai} – ${d.waktu_selesai}</span>`
                : ''}
            </div>
            <div class="dsh-right">
              ${biayaSesi > 0 ? `<span class="dsh-biaya">Rp ${biayaSesi.toLocaleString('id-ID')}</span>` : ''}
              <span class="dsh-toggle" id="toggle-icon-${idx}">▾</span>
            </div>
          </div>

          <div class="dok-sesi-body" id="sesi-body-${idx}">

            ${fotoHtml ? `<div class="dsb-section">
              <div class="dsb-label">📷 Foto Kegiatan</div>
              <div class="dok-foto-grid">${fotoHtml}</div>
            </div>` : ''}

            ${hadirHtml}

            ${d.materi || d.progress ? `<div class="dsb-section">
              <div class="dsb-label">📖 Materi & Progress</div>
              <div class="dsb-content">${d.materi || d.progress || ''}</div>
            </div>` : ''}

            ${d.waktu_mulai || d.waktu_selesai ? `<div class="dsb-section dsb-row">
              ${d.waktu_mulai ? `<div class="dsb-chip">🕐 Mulai: <strong>${d.waktu_mulai}</strong></div>` : ''}
              ${d.waktu_selesai ? `<div class="dsb-chip">🕔 Selesai: <strong>${d.waktu_selesai}</strong></div>` : ''}
              ${d.waktu_mulai && d.waktu_selesai ? `<div class="dsb-chip">⏱️ Durasi: <strong>${hitungDurasi(d.waktu_mulai, d.waktu_selesai)}</strong></div>` : ''}
            </div>` : ''}

            ${biayaSesi > 0 ? `<div class="dsb-section">
              <div class="dsb-label">💰 Biaya Kegiatan</div>
              <div class="dsb-biaya-box">
                ${items.filter(i=>i.item_biaya).map(i=>`
                  <div class="dsb-biaya-row">
                    <span>${i.item_biaya}</span>
                    <span>Rp ${parseInt((i.biaya_aktual+'').replace(/\D/g,'')).toLocaleString('id-ID')}</span>
                  </div>`).join('')}
                <div class="dsb-biaya-total">
                  <span>Total Sesi Ini</span>
                  <span>Rp ${biayaSesi.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>` : ''}

            ${d.kendala || d.evaluasi ? `<div class="dsb-section">
              <div class="dsb-label">⚠️ Kendala & Evaluasi</div>
              <div class="dsb-content dsb-evaluasi">${d.kendala || d.evaluasi || ''}</div>
            </div>` : ''}

          </div>
        </div>`;
    }).join('');

    return summaryHtml + `<div class="dok-sesi-list">${sesiHtml}</div>`;
  }

  /* Helper: konversi Google Drive share link ke embeddable URL */
  function convertGDriveUrl(url) {
    if (!url) return '';
    // Format: https://drive.google.com/file/d/FILE_ID/view?...
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
    return url;
  }

  /* Helper: render daftar hadir */
  function buildHadirSection(d) {
    const groups = [
      { key: 'hadir_peserta',    label: 'Peserta',    icon: '👥' },
      { key: 'hadir_panitia',    label: 'Panitia',    icon: '🤝' },
      { key: 'hadir_narasumber', label: 'Narasumber', icon: '🎤' },
    ];
    const parts = groups.filter(g => d[g.key]);
    if (parts.length === 0) return '';

    return `<div class="dsb-section">
      <div class="dsb-label">✅ Daftar Hadir</div>
      <div class="dsb-hadir-grid">
        ${parts.map(g => `
          <div class="dsb-hadir-block">
            <div class="dsb-hadir-title">${g.icon} ${g.label}</div>
            <div class="dsb-hadir-names">
              ${(d[g.key]+'').split(',').map(n => `<span class="dsb-hadir-chip">${n.trim()}</span>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  /* Helper: format tanggal panjang "12 Januari 2026" */
  function formatTglLong(str) {
    if (!str || str === 'Tanggal tidak diketahui') return str;
    const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                   'Juli','Agustus','September','Oktober','November','Desember'];
    const parts = str.split('-');
    if (parts.length === 3) return `${parseInt(parts[2])} ${bulan[parseInt(parts[1])-1]} ${parts[0]}`;
    return str;
  }

  /* Helper: format tanggal pendek "12 Jan" */
  function formatTglShort(str) {
    if (!str) return '';
    const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    const parts = str.split('-');
    if (parts.length === 3) return `${parseInt(parts[2])} ${bulan[parseInt(parts[1])-1]}`;
    return str;
  }

  /* Helper: hitung durasi dari waktu mulai–selesai "08:00" */
  function hitungDurasi(mulai, selesai) {
    try {
      const [h1,m1] = mulai.split(':').map(Number);
      const [h2,m2] = selesai.split(':').map(Number);
      let totalMenit = (h2*60+m2) - (h1*60+m1);
      if (totalMenit < 0) totalMenit += 1440;
      const jam  = Math.floor(totalMenit/60);
      const mnt  = totalMenit % 60;
      return jam > 0 ? `${jam} jam ${mnt > 0 ? mnt+' menit' : ''}`.trim() : `${mnt} menit`;
    } catch { return '–'; }
  }

  /* ── Render full HTML ── */
  main.innerHTML = `
    <div class="status-badge ${statusClass}">
      <div class="status-dot"></div>
      ${statusLabel}
    </div>

    <!-- HERO -->
    <div class="proker-hero">
      <div class="ph-top">
        <div class="ph-num">${id}</div>
        <div class="ph-badges">
          <span class="ph-tag">${proker.tag}</span>
          ${proker.cat.includes('rutin') ? '<span class="ph-tag">Kegiatan Rutin</span>' : ''}
        </div>
        <div class="ph-icon">${proker.icon}</div>
      </div>
      <h1 class="ph-title">${proker.judul.replace(/&amp;/g,'&')}</h1>
      <p class="ph-desc">${proker.desc.replace(/<[^>]*>/g,'')}</p>
      <div class="ph-meta">
        <div class="ph-meta-item">🕐 ${waktu}</div>
        <div class="ph-meta-item">👥 ${sasaran.replace(/&amp;/g,'&')}</div>
        ${lokasi !== '–' ? `<div class="ph-meta-item">📍 ${lokasi}</div>` : ''}
      </div>
    </div>

    <!-- PEMBERITAHUAN -->
    <div class="pcard">
      <div class="pcard-header">
        <span class="pcard-header-icon">🔔</span>
        <h2>Pemberitahuan</h2>
        <span class="pcard-header-label">お知らせ</span>
      </div>
      <div class="pcard-body" id="notifBody">${renderNotifs()}</div>
    </div>

    <!-- DESKRIPSI -->
    <div class="pcard">
      <div class="pcard-header">
        <span class="pcard-header-icon">📋</span>
        <h2>Deskripsi Kegiatan</h2>
        <span class="pcard-header-label">詳細</span>
      </div>
      <div class="pcard-body">
        <div class="desc-grid">
          <div class="desc-item full-width">
            <div class="di-label">Tujuan & Manfaat</div>
            <div class="di-value">${tujuan !== '–' ? tujuan : '<span style="color:var(--grey-mid);font-style:italic">Belum diisi di Google Sheets</span>'}</div>
          </div>
          <div class="desc-item">
            <div class="di-label">Waktu Kegiatan</div>
            <div class="di-value">${waktu}</div>
          </div>
          <div class="desc-item">
            <div class="di-label">Lokasi</div>
            <div class="di-value">${lokasi !== '–' ? lokasi : '<span style="color:var(--grey-mid);font-style:italic">Menyesuaikan</span>'}</div>
          </div>
          <div class="desc-item">
            <div class="di-label">Target Peserta</div>
            <div class="di-value">${sasaran.replace(/&amp;/g,'&')}</div>
          </div>
          <div class="desc-item">
            <div class="di-label">Pemateri / Narasumber</div>
            <div class="di-value">${pemateri !== '–' ? pemateri : '<span style="color:var(--grey-mid);font-style:italic">Belum ditentukan</span>'}</div>
          </div>
          <div class="desc-item full-width">
            <div class="di-label">Panitia / Penanggung Jawab</div>
            ${renderPanitia(panitia)}
          </div>
          <div class="desc-item full-width">
            <div class="di-label">Rencana Anggaran Biaya (RAB)</div>
            ${renderRAB(rabItems)}
          </div>
        </div>
      </div>
    </div>

    <!-- ACTIVITY LOG -->
    <div class="pcard">
      <div class="pcard-header">
        <span class="pcard-header-icon">📅</span>
        <h2>Activity Log</h2>
        <span class="pcard-header-label">活動記録</span>
      </div>
      <div class="pcard-body">
        <div id="activityGraph"></div>
      </div>
    </div>

    <!-- DOKUMENTASI -->
    <div class="pcard">
      <div class="pcard-header">
        <span class="pcard-header-icon">📸</span>
        <h2>Dokumentasi</h2>
        <span class="pcard-header-label">ドキュメント</span>
      </div>
      <div class="pcard-body">${renderDok()}</div>
    </div>

    <!-- PREV / NEXT -->
    <div class="proker-nav">
      <a class="pnav-card ${prev?'':'disabled'}" href="${prev?'proker.html?id='+prev.num:'#'}">
        <div class="pnav-dir">← Sebelumnya</div>
        <div class="pnav-name">${prev ? prev.icon+' '+prev.judul.replace(/&amp;/g,'&') : '–'}</div>
      </a>
      <a class="pnav-card next ${next?'':'disabled'}" href="${next?'proker.html?id='+next.num:'#'}">
        <div class="pnav-dir">Berikutnya →</div>
        <div class="pnav-name">${next ? next.judul.replace(/&amp;/g,'&')+' '+next.icon : '–'}</div>
      </a>
    </div>
  `;

  // Jalankan countdown jika ada
  if (estDate && status === 'upcoming') {
    startCountdown(estDate, 'countdownBox');
  }

  // Build activity graph
  buildActivityGraph('activityGraph', activity);

  // Auto-buka sesi dokumentasi pertama
  const firstBody = document.getElementById('sesi-body-0');
  const firstIcon = document.getElementById('toggle-icon-0');
  if (firstBody) { firstBody.classList.add('open'); if (firstIcon) firstIcon.textContent = '▴'; }
}

/* ── Toggle accordion sesi dokumentasi ── */
function toggleSesi(idx) {
  const body = document.getElementById(`sesi-body-${idx}`);
  const icon = document.getElementById(`toggle-icon-${idx}`);
  if (!body) return;
  const isOpen = body.classList.toggle('open');
  if (icon) icon.textContent = isOpen ? '▴' : '▾';
}

/* ══════════════════════════════════════════════
   GOOGLE SHEETS FETCH
   Sheet: proker_detail, proker_notif,
          proker_activity, proker_dokumentasi
   Semua difilter berdasarkan kolom proker_id
══════════════════════════════════════════════ */

function fetchJSONP(url) {
  return new Promise((resolve, reject) => {
    const cbName  = '_jcosasi_pcb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const timeout = setTimeout(() => {
      cleanup(); reject(new Error('Timeout'));
    }, 12000);

    window[cbName] = data => { cleanup(); resolve(data); };

    function cleanup() {
      clearTimeout(timeout);
      delete window[cbName];
      const el = document.getElementById('jsonp-proker-tmp');
      if (el) el.remove();
    }

    const s = document.createElement('script');
    s.id    = 'jsonp-proker-tmp';
    s.src   = url + '&callback=' + cbName;
    s.onerror = () => { cleanup(); reject(new Error('Script load failed')); };
    document.head.appendChild(s);
  });
}

async function fetchProkerSheets(prokerId) {
  const api = CONTENT.api && CONTENT.api.url;
  if (!api || api === 'PASTE_URL_APPS_SCRIPT_KAMU_DI_SINI') return null;

  try {
    // Fetch semua sheet proker sekaligus (4 permintaan paralel)
    const [detailRes, notifRes, activityRes, dokRes] = await Promise.allSettled([
      fetchJSONP(`${api}?sheet=proker_detail&id=${prokerId}`),
      fetchJSONP(`${api}?sheet=proker_notif&id=${prokerId}`),
      fetchJSONP(`${api}?sheet=proker_activity&id=${prokerId}`),
      fetchJSONP(`${api}?sheet=proker_dokumentasi&id=${prokerId}`),
    ]);

    const safeData = (res, defaultVal) =>
      res.status === 'fulfilled' && res.value && res.value.status === 'ok'
        ? res.value.data : defaultVal;

    const detailArr = safeData(detailRes, []);
    const detail    = detailArr.find(r => r.proker_id === prokerId) || null;

    return {
      detail:   detail,
      notifs:   safeData(notifRes, []),
      activity: safeData(activityRes, []),
      dok:      safeData(dokRes, []),
    };
  } catch (e) {
    console.warn('[JCOSASI] Sheets fetch error:', e.message);
    return null;
  }
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  const id     = getProkerIdFromURL();
  const proker = getProkerData(id);

  if (!proker) {
    $('mainContent').innerHTML = `
      <div class="page-error">
        <div class="pe-icon">🔍</div>
        <h2>Proker tidak ditemukan</h2>
        <p>ID proker "<strong>${id}</strong>" tidak ada dalam daftar.</p>
        <a href="index.html" class="btn-back">← Kembali ke Landing Page</a>
      </div>`;
    return;
  }

  // Fetch data sheets secara async (tidak memblokir render awal)
  const sheetsData = await fetchProkerSheets(id);

  // Render halaman dengan data yang tersedia
  renderPage(proker, sheetsData);
});
