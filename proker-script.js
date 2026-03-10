/**
 * ============================================================
 *  JCOSASI — proker-script.js  (v3)
 *  Halaman detail program kerja
 * ============================================================
 */

/* ══════════════════════════════════════════════
   HELPERS UMUM
══════════════════════════════════════════════ */
const $  = id => document.getElementById(id);

const HARI        = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const BULAN       = ['Januari','Februari','Maret','April','Mei','Juni',
                     'Juli','Agustus','September','Oktober','November','Desember'];
const BULAN_PENDEK= ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

/** Parse "YYYY-MM-DD" → Date lokal (tidak ada konversi UTC/timezone) */
function parseDateLocal(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** "YYYY-MM-DD" → "Jumat, 7 Agustus 2026" */
function formatTglPanjang(str) {
  const d = parseDateLocal(str);
  if (!d) return str || '–';
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** "YYYY-MM-DD" → "7 Ags" */
function formatTglPendek(str) {
  const d = parseDateLocal(str);
  if (!d) return str || '';
  return `${d.getDate()} ${BULAN_PENDEK[d.getMonth()]}`;
}

/** "HH:MM" & "HH:MM" → "2 jam 30 menit" (dalam satu hari, tidak lintas hari) */
function hitungDurasi(mulai, selesai) {
  if (!mulai || !selesai) return null;
  const [h1, m1] = mulai.split(':').map(Number);
  const [h2, m2] = selesai.split(':').map(Number);
  if (isNaN(h1)||isNaN(h2)) return null;
  const totalMenit = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (totalMenit <= 0) return null;
  const jam = Math.floor(totalMenit / 60);
  const mnt = totalMenit % 60;
  if (jam > 0 && mnt > 0) return `${jam} jam ${mnt} mnt`;
  if (jam > 0) return `${jam} jam`;
  return `${mnt} menit`;
}

/** Angka → "Rp 150.000" */
function rupiah(val) {
  const n = parseInt((val + '').replace(/\D/g,''));
  if (isNaN(n) || n === 0) return null;
  return 'Rp ' + n.toLocaleString('id-ID');
}
function rupiahNum(val) {
  const n = parseInt((val + '').replace(/\D/g,''));
  return isNaN(n) ? 0 : n;
}


/** Sanitize kolom "waktu" di proker_detail.
 *  Kolom ini bisa berisi:
 *  - Teks bebas  : "Setiap Jumat", "Menyesuaikan" → tampil apa adanya
 *  - YYYY-MM-DD  : tanggal event → format Indonesia
 *  - String GMT  : Date object yang lolos Apps Script → format ulang
 *  Kolom waktu_teks (opsional) selalu ditampilkan apa adanya.
 */
function sanitizeWaktu(str) {
  if (!str || str === '–') return str;
  // String GMT panjang — parse dan format ulang
  if (str.includes('GMT') || str.includes('Waktu Indonesia')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      if (d.getFullYear() <= 1900) {
        // Kolom jam (Sheets simpan 14:00 sebagai 30 Des 1899)
        return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
      }
      // Tanggal penuh
      const ymd = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      return formatTglPanjang(ymd);
    }
  }
  // YYYY-MM-DD → format Indonesia
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return formatTglPanjang(str);
  // Teks bebas → tampil apa adanya
  return str;
}

function getProkerIdFromURL() {
  return new URLSearchParams(window.location.search).get('id') || '01';
}
function getProkerData(id) {
  return (CONTENT?.proker?.items || []).find(p => p.num === id) || null;
}

/* ══════════════════════════════════════════════
   STATUS PROKER
══════════════════════════════════════════════ */
function getStatusProker(proker, detail, jadwal) {
  const now = new Date(); now.setHours(0,0,0,0);

  /* Cari tanggal countdown:
     1. Jadwal terdekat di masa depan (dari proker_jadwal sheet)
     2. estimasi_tanggal dari proker_detail sheet
     3. null */
  function nearestJadwal() {
    if (!jadwal || !jadwal.length) return null;
    const nowMs = Date.now();
    const candidates = [];
    for (let i = 0; i < jadwal.length; i++) {
      const r = jadwal[i];
      if (!r.tanggal) continue;
      // Bangun datetime string langsung — hindari mutasi objek Date
      const jamStr   = (r.jam || '').trim();
      const jamMatch = jamStr.match(/^(\d{1,2}):(\d{2})$/);
      const hh = jamMatch ? jamMatch[1].padStart(2,'0') : '07';
      const mm = jamMatch ? jamMatch[2]                 : '00';
      // "YYYY-MM-DDTHH:MM:00" → Date lokal (bukan UTC)
      const dt = new Date(r.tanggal + 'T' + hh + ':' + mm + ':00');
      if (!isNaN(dt.getTime()) && dt.getTime() > nowMs) {
        candidates.push(dt);
      }
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => a - b);
    return candidates[0];
  }

  const cdDate = nearestJadwal() || parseDateLocal(detail?.estimasi_tanggal || '');

  if (proker.cat?.includes('rutin')) {
    const s = new Date(2026,0,1), e = new Date(2027,1,0);
    if (now < s) return { status:'upcoming', estDate: cdDate || s };
    if (now > e) return { status:'done',     estDate: null };
    // Untuk rutin: tampilkan countdown ke jadwal terdekat berikutnya
    return { status:'ongoing', estDate: cdDate };
  }
  if (cdDate) {
    const diff = cdDate - now;
    if (diff > 86400000)   return { status:'upcoming', estDate: cdDate };
    if (diff > -604800000) return { status:'ongoing',  estDate: null };
    return { status:'done', estDate: null };
  }
  return { status:'upcoming', estDate: null };
}

/* ══════════════════════════════════════════════
   COUNTDOWN
══════════════════════════════════════════════ */
function startCountdown(targetDate, containerId) {
  const box = $(containerId);
  if (!box || !targetDate) return;
  function tick() {
    const diff = targetDate - Date.now();
    if (diff <= 0) { box.innerHTML = `<p class="cd-done">🎉 Hari pelaksanaan telah tiba!</p>`; return; }
    const d = Math.floor(diff/86400000);
    const h = Math.floor((diff%86400000)/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    const tglTarget = targetDate.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    box.innerHTML = `
      <div class="cd-label">Menuju kegiatan · <span class="cd-tgl">${tglTarget}</span></div>
      <div class="countdown-boxes">
        <div class="cd-box"><span class="cd-num">${String(d).padStart(2,'0')}</span><span class="cd-unit">Hari</span></div>
        <div class="cd-box"><span class="cd-num">${String(h).padStart(2,'0')}</span><span class="cd-unit">Jam</span></div>
        <div class="cd-box"><span class="cd-num">${String(m).padStart(2,'0')}</span><span class="cd-unit">Menit</span></div>
        <div class="cd-box"><span class="cd-num">${String(s).padStart(2,'0')}</span><span class="cd-unit">Detik</span></div>
      </div>`;
  }
  tick(); setInterval(tick, 1000);
}

/* ══════════════════════════════════════════════
   PEMBERITAHUAN
══════════════════════════════════════════════ */
function renderNotifs(notifs, status, estDate, cfg) {
  cfg = cfg || {};
  let html = '';

  /* 1. Countdown — tampil otomatis jika ada jadwal terdekat (estDate)
        Bisa dinonaktifkan dari sheet config dengan countdown_aktif = false */
  const cdAktif = !cfg.countdown_aktif || cfg.countdown_aktif.toLowerCase() !== 'false';
  if (cdAktif && estDate) {
    html += `<div class="notif-blok notif-countdown">
      <div class="nb-eyebrow">⏳ Hitung Mundur</div>
      <div id="countdownBox" class="countdown-wrap"></div>
    </div>`;
  }

  /* 2. Ajakan / himbauan utama — font besar & menarik */
  if (cfg.ajakan === 'true' && cfg.ajakan_teks) {
    html += `<div class="notif-blok notif-ajakan">
      <div class="ajakan-teks">${cfg.ajakan_teks}</div>
      ${cfg.ajakan_sub ? `<div class="ajakan-sub">${cfg.ajakan_sub}</div>` : ''}
    </div>`;
  }

  /* 3. Wajib hadir + sanksi */
  if (cfg.wajib_hadir === 'true') {
    html += `<div class="notif-blok notif-wajib">
      <div class="nb-wajib-icon">⚠️</div>
      <div class="nb-wajib-body">
        <div class="nb-wajib-title">${cfg.wajib_hadir_teks || 'Kehadiran Wajib!'}</div>
        ${cfg.wajib_hadir_sanksi ? `<div class="nb-wajib-sanksi">Sanksi: <strong>${cfg.wajib_hadir_sanksi}</strong></div>` : ''}
      </div>
    </div>`;
  }

  /* 4. Notif bebas dari sheet proker_notif */
  if (notifs && notifs.length > 0) {
    const icons = { info:'ℹ️', warning:'⚠️', success:'✅', penting:'🔴' };
    const cls   = { info:'notif-info', warning:'notif-warning', success:'notif-success', penting:'notif-penting' };
    html += `<div class="notif-list">${notifs.map(n => `
      <div class="notif-item ${cls[n.tipe]||'notif-info'}">
        <div class="ni-icon">${icons[n.tipe]||'ℹ️'}</div>
        <div class="ni-body">
          <div class="ni-title">${n.judul||''}</div>
          <div class="ni-text">${n.isi||''}</div>
          ${n.tanggal ? `<div class="ni-date">${formatTglPanjang(n.tanggal)}</div>` : ''}
        </div>
      </div>`).join('')}</div>`;
  }

  if (!html) html = `<div class="notif-empty"><div class="ne-icon">📭</div><p>Belum ada pemberitahuan.</p></div>`;
  return html;
}

/* ══════════════════════════════════════════════
   DESKRIPSI KEGIATAN (semua dari Sheets)
══════════════════════════════════════════════ */
function renderDeskripsi(proker, detail) {
  const D       = detail || {};
  // waktu_teks = teks bebas ("Setiap Jumat"), waktu = tanggal event
  // Prioritas: waktu_teks > waktu (di-sanitize) > fallback content.js
  const waktuRaw = D.waktu_teks || D.waktu || proker.detail?.find(d=>d.label.includes('Waktu'))?.val || '–';
  const waktu    = D.waktu_teks ? waktuRaw : sanitizeWaktu(waktuRaw);
  const lokasi  = D.lokasi   || '–';
  const sasaran = D.sasaran  || proker.detail?.find(d=>d.label.includes('Sasaran'))?.val || '–';
  const tujuan  = D.tujuan   || '';
  const pemateri= D.pemateri || '';
  const panitia = D.panitia  || '';

  let rabItems = [];
  if (D.rab) { try { rabItems = JSON.parse(D.rab); } catch(e) {} }

  function listAccordion(str, satuanLabel) {
    if (!str) return `<span class="val-empty">Belum diisi</span>`;
    const names = str.split(',').map(n=>n.trim()).filter(Boolean);
    if (names.length === 1) return `<span>${names[0]}</span>`;
    return `<div class="daftar-accordion" onclick="toggleAccordion(this)">
      <div class="da-header"><span>${names.length} ${satuanLabel}</span><span class="da-arrow">▾</span></div>
      <div class="da-body">${names.map(n=>`<div class="da-row">${n}</div>`).join('')}</div>
    </div>`;
  }

  function renderRAB() {
    if (!rabItems.length) return `<p class="rab-empty">RAB belum diisi di Google Sheets.</p>`;
    let totEst = 0, totAkt = 0;
    const rows = rabItems.map(r => {
      const est = rupiahNum(r.estimasi); const akt = rupiahNum(r.aktual);
      totEst += est; totAkt += akt;
      return `<tr>
        <td>${r.item||''}</td>
        <td class="rab-num">${est?rupiah(est):'<span class="rab-nil">–</span>'}</td>
        <td class="rab-num ${akt>est&&est?'rab-over':akt?'rab-ok':''}">${akt?rupiah(akt):'<span class="rab-nil">–</span>'}</td>
      </tr>`;
    }).join('');
    return `<table class="rab-table">
      <thead><tr><th>Item</th><th>Estimasi</th><th>Aktual</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="rab-total">
        <td>Total</td>
        <td>${rupiah(totEst)||'–'}</td>
        <td class="${totAkt>totEst&&totEst?'rab-over':totAkt?'rab-ok':''}">${rupiah(totAkt)||'–'}</td>
      </tr></tfoot>
    </table>`;
  }

  return `<div class="desc-grid">
    <div class="desc-item full-width">
      <div class="di-label">🎯 Tujuan &amp; Manfaat</div>
      <div class="di-value">${tujuan||'<span class="val-empty">Belum diisi di Google Sheets</span>'}</div>
    </div>
    <div class="desc-item">
      <div class="di-label">🕐 Waktu Kegiatan</div>
      <div class="di-value">${waktu}</div>
    </div>
    <div class="desc-item">
      <div class="di-label">📍 Lokasi</div>
      <div class="di-value">${lokasi!=='–'?lokasi:'<span class="val-empty">Menyesuaikan</span>'}</div>
    </div>
    <div class="desc-item">
      <div class="di-label">👥 Target Peserta</div>
      <div class="di-value">${sasaran||'<span class="val-empty">–</span>'}</div>
    </div>
    <div class="desc-item">
      <div class="di-label">🎤 Pemateri / Narasumber</div>
      <div class="di-value">${pemateri?listAccordion(pemateri,'pemateri'):'<span class="val-empty">Belum ditentukan</span>'}</div>
    </div>
    <div class="desc-item full-width">
      <div class="di-label">🤝 Panitia / Penanggung Jawab</div>
      <div class="di-value">${listAccordion(panitia,'anggota panitia')}</div>
    </div>
    <div class="desc-item full-width">
      <div class="di-label">💰 Rencana Anggaran Biaya (RAB)</div>
      ${renderRAB()}
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════
   ACTIVITY GRAPH — 6 STATE WARNA
══════════════════════════════════════════════ */
function buildActivityGraph(containerId, activityRows, jadwalRows, dok, prokerLabelMap) {
  const container = $(containerId);
  if (!container) return;

  const START = new Date(2026,0,1);
  const END   = new Date(2027,0,31);
  const today = new Date(); today.setHours(0,0,0,0);

  /* Build sets */
  // rencanaMap: tanggal → Set nama proker
  const rencanaMap = new Map();
  (jadwalRows||[]).forEach(r => {
    if (!r.tanggal) return;
    if (!rencanaMap.has(r.tanggal)) rencanaMap.set(r.tanggal, new Set());
    if (prokerLabelMap && r.proker_id) rencanaMap.get(r.tanggal).add(r.proker_id);
  });
  const rencanaSet = new Set(rencanaMap.keys());

  // aktualMap & batalMap: tanggal → Set proker_id
  const aktualMap = new Map(), batalMap = new Map();
  (activityRows||[]).forEach(r => {
    if (!r.tanggal) return;
    if (r.status === 'batal') {
      if (!batalMap.has(r.tanggal)) batalMap.set(r.tanggal, new Set());
      if (prokerLabelMap && r.proker_id) batalMap.get(r.tanggal).add(r.proker_id);
    } else {
      if (!aktualMap.has(r.tanggal)) aktualMap.set(r.tanggal, new Set());
      if (prokerLabelMap && r.proker_id) aktualMap.get(r.tanggal).add(r.proker_id);
    }
  });
  (dok||[]).forEach(d => {
    if (!d.tanggal_sesi) return;
    if (!aktualMap.has(d.tanggal_sesi)) aktualMap.set(d.tanggal_sesi, new Set());
    if (prokerLabelMap && d.proker_id) aktualMap.get(d.tanggal_sesi).add(d.proker_id);
  });
  const aktualSet = new Set(aktualMap.keys());
  const batalSet  = new Set(batalMap.keys());

  /* Helper: nama-nama proker pada tanggal tertentu */
  function prokerNamesOn(dateMap, key) {
    if (!prokerLabelMap || !dateMap.has(key)) return '';
    const ids = [...dateMap.get(key)];
    if (!ids.length) return '';
    return ids.map(pid => {
      const p = prokerLabelMap[pid];
      return p ? p.icon + ' ' + p.judul : '#' + pid;
    }).join(', ');
  }

  /* Bangun weeks */
  const graphStart = new Date(START);
  graphStart.setDate(graphStart.getDate() - graphStart.getDay());
  const weeks=[], monthLabels=[];
  let cur = new Date(graphStart), lastMonth=-1;
  while (cur <= END) {
    const week=[];
    for(let d=0;d<7;d++){week.push(new Date(cur));cur.setDate(cur.getDate()+1);}
    const fir = week.find(d=>d>=START&&d<=END);
    if(fir && fir.getMonth()!==lastMonth){
      lastMonth=fir.getMonth();
      monthLabels.push({weekIdx:weeks.length,month:fir.getMonth()});
    }
    weeks.push(week);
  }

  /* Hitung stats */
  let totAktual=0, totDurasiMenit=0, totBiaya=0;
  aktualSet.forEach(()=>totAktual++);
  const dokSesiSeen = new Set();
  (dok||[]).forEach(d=>{
    if(!d.tanggal_sesi||dokSesiSeen.has(d.tanggal_sesi)) return;
    dokSesiSeen.add(d.tanggal_sesi);
    if(d.waktu_mulai&&d.waktu_selesai){
      const [h1,m1]=d.waktu_mulai.split(':').map(Number);
      const [h2,m2]=d.waktu_selesai.split(':').map(Number);
      totDurasiMenit += Math.max(0,(h2*60+m2)-(h1*60+m1));
    }
    if(d.biaya_aktual) totBiaya += rupiahNum(d.biaya_aktual);
  });
  // juga biaya dari baris lain sesi yang sama
  (dok||[]).forEach(d=>{ if(d.biaya_aktual && !dokSesiSeen.has(d.tanggal_sesi+'_biaya')){
    // sudah dihitung per sesi saja, tambah dari baris biaya
  }});

  /* Month row — 1 div per week, lebar identik dengan .activity-week (13px)
     Label hanya muncul di minggu pertama bulan, teks meluap ke kanan */
  const monthRow = document.createElement('div');
  monthRow.className = 'activity-months';
  weeks.forEach((_,wi)=>{
    const lbl = monthLabels.find(ml=>ml.weekIdx===wi);
    const sp  = document.createElement('div');
    sp.className   = 'activity-month-label';
    sp.textContent = lbl ? BULAN_PENDEK[lbl.month] : '';
    // Tandai kolom yang punya label agar bisa diberi warna berbeda jika perlu
    if (lbl) sp.setAttribute('data-has-label','1');
    monthRow.appendChild(sp);
  });

  /* Graph cells */
  const graphWrap = document.createElement('div');
  graphWrap.className = 'activity-graph-wrap';
  const graph = document.createElement('div');
  graph.className = 'activity-graph';

  weeks.forEach(week=>{
    const col = document.createElement('div');
    col.className = 'activity-week';
    week.forEach(day=>{
      const cell = document.createElement('div');
      cell.className = 'activity-day';
      const key   = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
      const inRng = day>=START && day<=END;
      const isFut = day>today;
      const isTdy = day.getTime()===today.getTime();

      if(!inRng){ cell.style.visibility='hidden'; col.appendChild(cell); return; }

      let state, tip;
      if      (aktualSet.has(key))  { state='actual';        tip='Kegiatan berlangsung'; }
      else if (batalSet.has(key))   { state='cancelled';     tip='Kegiatan dibatalkan'; }
      else if (rencanaSet.has(key)) {
        if(isTdy)  { state='today-planned'; tip='Hari ini — ada rencana kegiatan'; }
        else       { state='planned';       tip=isFut?'Rencana kegiatan':'Rencana (terlewat)'; }
      }
      else if (isTdy) { state='today';  tip='Hari ini'; }
      else if (isFut) { state='future'; tip='Belum ada kegiatan'; }
      else            { state='past';   tip='Tidak ada kegiatan'; }

      cell.setAttribute('data-state', state);
      // Tooltip — jika rekap (prokerLabelMap ada), tampilkan nama proker
      let tipProker = '';
      if (prokerLabelMap) {
        if      (state === 'actual')       tipProker = prokerNamesOn(aktualMap, key);
        else if (state === 'cancelled')    tipProker = prokerNamesOn(batalMap, key);
        else if (state === 'planned' || state === 'today-planned') tipProker = prokerNamesOn(rencanaMap, key);
      }
      const tipFull = tipProker
        ? `${formatTglPanjang(key)} — ${tip}<br><span style="font-size:.8em;opacity:.85">${tipProker}</span>`
        : `${formatTglPanjang(key)} — ${tip}`;
      cell.addEventListener('mouseenter', e=>showTooltip(e, tipFull));
      cell.addEventListener('mouseleave', hideTooltip);
      cell.addEventListener('mousemove',  moveTooltip);
      col.appendChild(cell);
    });
    graph.appendChild(col);
  });
  graphWrap.appendChild(graph);

  /* Legend */
  const legend = document.createElement('div');
  legend.className = 'activity-legend-wrap';
  legend.innerHTML = `<div class="al-legend-grid">
    <div class="al-item"><div class="al-dot" data-state="actual"></div><span>Terlaksana</span></div>
    <div class="al-item"><div class="al-dot" data-state="planned"></div><span>Rencana</span></div>
    <div class="al-item"><div class="al-dot" data-state="today-planned"></div><span>Hari ini (rencana)</span></div>
    <div class="al-item"><div class="al-dot" data-state="cancelled"></div><span>Dibatalkan</span></div>
    <div class="al-item"><div class="al-dot" data-state="past"></div><span>Hari lewat</span></div>
    <div class="al-item"><div class="al-dot" data-state="future"></div><span>Akan datang</span></div>
  </div>`;

  /* Stats */
  const totDurasiJam = totDurasiMenit >= 60
    ? `${Math.floor(totDurasiMenit/60)} jam ${totDurasiMenit%60>0?totDurasiMenit%60+' mnt':''}`
    : totDurasiMenit > 0 ? `${totDurasiMenit} menit` : '–';

  const stats = document.createElement('div');
  stats.className = 'activity-stats';
  stats.innerHTML = `
    <div class="astat"><span class="astat-num">${totAktual}</span><span class="astat-label">Kegiatan terlaksana</span></div>
    <div class="astat"><span class="astat-num">${totDurasiJam}</span><span class="astat-label">Total durasi</span></div>
    <div class="astat"><span class="astat-num">${totBiaya>0?rupiah(totBiaya):'–'}</span><span class="astat-label">Total biaya aktual</span></div>`;

  /* Single scroll wrapper */
  const scrollWrap = document.createElement('div');
  scrollWrap.className = 'activity-scroll-wrapper';
  scrollWrap.appendChild(monthRow);
  scrollWrap.appendChild(graphWrap);

  container.innerHTML = '';
  container.appendChild(legend);
  container.appendChild(scrollWrap);
  container.appendChild(stats);
}

/* Tooltip */
let _tip;
function showTooltip(e, html) {
  _tip=$('dayTooltip'); if(!_tip)return;
  _tip.innerHTML=html; _tip.style.opacity='1'; moveTooltip(e);
}
function hideTooltip()  { if(_tip) _tip.style.opacity='0'; }
function moveTooltip(e) { if(!_tip)return; _tip.style.left=(e.clientX+14)+'px'; _tip.style.top=(e.clientY-50)+'px'; }

/* ══════════════════════════════════════════════
   DOKUMENTASI MULTI-SESI
══════════════════════════════════════════════ */
function renderDok(dok) {
  if(!dok||!dok.length) return `<div class="dok-empty">
    <div class="de-icon">📷</div>
    <p>Dokumentasi belum tersedia.</p>
    <p class="de-sub">Akan diperbarui setelah kegiatan berlangsung.</p>
  </div>`;

  /* Grup per tanggal_sesi, terbaru dulu */
  const sesiMap={};
  dok.forEach(d=>{ const k=d.tanggal_sesi||'unknown'; if(!sesiMap[k])sesiMap[k]=[]; sesiMap[k].push(d); });
  const sesiKeys = Object.keys(sesiMap).filter(k=>k!=='unknown').sort().reverse();
  if(sesiMap['unknown']) sesiKeys.push('unknown');

  return `<div class="dok-sesi-list">${sesiKeys.map((key,idx)=>{
    const items = sesiMap[key];
    const d     = items[0];

    const tglStr = key!=='unknown' ? formatTglPanjang(key) : 'Tanggal tidak diketahui';
    const jamStr = (d.waktu_mulai&&d.waktu_selesai) ? `${d.waktu_mulai} – ${d.waktu_selesai}` : d.waktu_mulai||'';
    const dur    = hitungDurasi(d.waktu_mulai, d.waktu_selesai);
    const ket    = d.keterangan||'';

    /* Foto */
    const fotos = items.filter(i=>i.foto_url);
    const fotoHtml = fotos.length ? `<div class="dsb-section">
      <div class="dsb-label">📷 Foto Kegiatan</div>
      <div class="dok-foto-grid">${fotos.map(item=>{
        const src = convertGDriveUrl(item.foto_url);
        const alt = item.keterangan||'Foto kegiatan';
        return `<a href="${item.foto_url}" target="_blank" rel="noopener" class="dok-foto-wrap" title="${alt}">
          <img class="dok-foto" src="${src}" alt="${alt}" loading="lazy"
               onerror="this.closest('.dok-foto-wrap').innerHTML='<div class=\\'dok-foto-err\\'>🖼️</div>'"/>
          ${item.keterangan?`<div class="dok-foto-cap">${item.keterangan}</div>`:''}
        </a>`;
      }).join('')}</div></div>` : '';

    /* Daftar hadir — accordion jika >1 */
    function hadirBlok(kolom, label, ikon) {
      const raw = d[kolom]; if(!raw) return '';
      const names = raw.split(',').map(n=>n.trim()).filter(Boolean);
      const listHtml = names.length===1
        ? `<span class="hadir-single">${names[0]}</span>`
        : `<div class="daftar-accordion" onclick="toggleAccordion(this)">
            <div class="da-header"><span>${names.length} ${label}</span><span class="da-arrow">▾</span></div>
            <div class="da-body">${names.map(n=>`<div class="da-row">${n}</div>`).join('')}</div>
          </div>`;
      return `<div class="hadir-blok">
        <div class="hadir-blok-label">${ikon} ${label}</div>
        ${listHtml}
      </div>`;
    }
    const hadirParts = [
      hadirBlok('hadir_peserta',   'peserta',    '👥'),
      hadirBlok('hadir_panitia',   'panitia',    '🤝'),
      hadirBlok('hadir_narasumber','narasumber', '🎤'),
    ].filter(Boolean);
    const hadirHtml = hadirParts.length ? `<div class="dsb-section">
      <div class="dsb-label">✅ Daftar Hadir</div>
      <div class="hadir-grid">${hadirParts.join('')}</div>
    </div>` : '';

    /* Biaya */
    let totBiayaSesi=0;
    const biayaRows = items.filter(i=>i.item_biaya||i.biaya_aktual);
    biayaRows.forEach(i=>{ totBiayaSesi+=rupiahNum(i.biaya_aktual); });
    const biayaHtml = biayaRows.length ? `<div class="dsb-section">
      <div class="dsb-label">💰 Biaya Kegiatan</div>
      <table class="rab-table sesi-rab">
        <thead><tr><th>Item</th><th>Estimasi</th><th>Aktual</th></tr></thead>
        <tbody>${biayaRows.map(i=>{
          const est=rupiahNum(i.estimasi_biaya_item), akt=rupiahNum(i.biaya_aktual);
          return `<tr>
            <td>${i.item_biaya||'–'}</td>
            <td class="rab-num">${est?rupiah(est):'<span class="rab-nil">–</span>'}</td>
            <td class="rab-num ${akt>est&&est?'rab-over':akt?'rab-ok':''}">${akt?rupiah(akt):'<span class="rab-nil">–</span>'}</td>
          </tr>`;
        }).join('')}</tbody>
        <tfoot><tr class="rab-total"><td>Total Sesi</td><td>–</td><td>${rupiah(totBiayaSesi)||'–'}</td></tr></tfoot>
      </table>
    </div>` : '';

    const materiHtml = (d.materi||d.progress) ? `<div class="dsb-section">
      <div class="dsb-label">📖 Materi &amp; Progress</div>
      <div class="dsb-content">${d.materi||d.progress}</div>
    </div>` : '';

    const kendalaHtml = d.kendala ? `<div class="dsb-section">
      <div class="dsb-label">⚠️ Kendala &amp; Evaluasi</div>
      <div class="dsb-content dsb-evaluasi">${d.kendala}</div>
    </div>` : '';

    return `<div class="dok-sesi">
      <div class="dok-sesi-header" onclick="toggleSesi(${idx})">
        <div class="dsh-left">
          <span class="dsh-num">Sesi ${sesiKeys.length-idx}</span>
          <div class="dsh-info">
            <span class="dsh-tanggal">${tglStr}</span>
            ${jamStr ? `<span class="dsh-jam">${jamStr}${dur?` · ${dur}`:''}</span>` : ''}
            ${ket ? `<span class="dsh-ket">${ket}</span>` : ''}
          </div>
        </div>
        <div class="dsh-right">
          ${totBiayaSesi>0?`<span class="dsh-biaya">${rupiah(totBiayaSesi)}</span>`:''}
          <span class="dsh-toggle" id="toggle-icon-${idx}">▾</span>
        </div>
      </div>
      <div class="dok-sesi-body" id="sesi-body-${idx}">
        ${fotoHtml}${hadirHtml}${materiHtml}${biayaHtml}${kendalaHtml}
      </div>
    </div>`;
  }).join('')}</div>`;
}

function convertGDriveUrl(url) {
  if(!url) return '';
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if(m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w600`;
  return url;
}

function toggleSesi(idx) {
  const body=$(`sesi-body-${idx}`), icon=$(`toggle-icon-${idx}`);
  if(!body)return;
  const open=body.classList.toggle('open');
  if(icon)icon.textContent=open?'▴':'▾';
}
function toggleAccordion(el) {
  const body=el.querySelector('.da-body'), arr=el.querySelector('.da-arrow');
  if(!body)return;
  const open=body.classList.toggle('open');
  if(arr)arr.textContent=open?'▴':'▾';
}

/* ══════════════════════════════════════════════
   RENDER HALAMAN PENUH
══════════════════════════════════════════════ */
function renderPage(proker, sheetsData) {
  const main  = $('mainContent');
  const id    = proker.num;
  const items = CONTENT.proker.items;
  const idx   = items.findIndex(p=>p.num===id);
  const prev  = idx>0              ? items[idx-1] : null;
  const next  = idx<items.length-1 ? items[idx+1] : null;

  const sheetsData_ref = sheetsData; // referensi untuk tombol cetak
  const detail      = sheetsData?.detail      || null;
  const notifs      = sheetsData?.notifs      || [];
  const notifConfig = sheetsData?.notifConfig || null;
  const activity    = sheetsData?.activity    || [];
  const jadwal      = sheetsData?.jadwal      || [];
  const dok         = sheetsData?.dok         || [];

  const {status, estDate} = getStatusProker(proker, detail, jadwal);

  $('navTitle').textContent = proker.judul.replace(/&amp;/g,'&');
  $('navNum').textContent   = `#${id}`;
  document.title            = `${proker.judul.replace(/&amp;/g,'&')} — JCOSASI`;

  const statusLabel = {upcoming:'Akan Datang', ongoing:'Sedang Berjalan', done:'Selesai'}[status];
  const statusClass = {upcoming:'status-upcoming', ongoing:'status-ongoing', done:'status-done'}[status];

  const heroWaktuRaw = detail?.waktu_teks || detail?.waktu || proker.detail?.find(d=>d.label.includes('Waktu'))?.val || '–';
  const heroWaktu    = detail?.waktu_teks ? heroWaktuRaw : sanitizeWaktu(heroWaktuRaw);
  const heroLokasi = detail?.lokasi  || '–';
  const heroSasaran= detail?.sasaran || proker.detail?.find(d=>d.label.includes('Sasaran'))?.val || '–';

  main.innerHTML = `
    <div class="status-badge ${statusClass}"><div class="status-dot"></div>${statusLabel}</div>

    <div class="proker-hero">
      <div class="ph-top">
        <div class="ph-num">${id}</div>
        <div class="ph-badges">
          ${(() => {
            // Bangun set badge unik dari cat — hindari duplikasi dengan tag
            const tagLower = (proker.tag||'').toLowerCase();
            const catBadges = [];
            const catStr = (proker.cat||'').toLowerCase();
            // Map kategori → label badge tambahan (hanya jika berbeda dari tag)
            const catMap = {
              'rutin':      'Kegiatan Rutin',
              'akademik':   'Akademik',
              'event':      'Event',
              'organisasi': 'Organisasi',
              'lainlain':   'Lain-lain',
            };
            Object.entries(catMap).forEach(([k,v]) => {
              if (catStr.includes(k) && v.toLowerCase() !== tagLower) {
                catBadges.push(v);
              }
            });
            const allBadges = [proker.tag, ...catBadges];
            return allBadges.map(b => `<span class="ph-tag">${b}</span>`).join('');
          })()}
        </div>
        <div class="ph-icon">${proker.icon}</div>
      </div>
      <h1 class="ph-title">${proker.judul.replace(/&amp;/g,'&')}</h1>
      <p class="ph-desc">${proker.desc.replace(/<[^>]*>/g,'')}</p>
      <div class="ph-meta">
        <div class="ph-meta-item">🕐 ${heroWaktu}</div>
        <div class="ph-meta-item">👥 ${heroSasaran}</div>
        ${heroLokasi!=='–'?`<div class="ph-meta-item">📍 ${heroLokasi}</div>`:''}
      </div>
      <div class="ph-actions">
        <button class="ph-print-btn" id="btnCetakProker" title="Cetak laporan proker ini sebagai PDF">
          🖨️ Cetak Laporan
        </button>
      </div>
    </div>

    <div class="pcard">
      <div class="pcard-header">
        <span class="pcard-header-icon">🔔</span><h2>Pemberitahuan</h2>
        <span class="pcard-header-label">お知らせ</span>
      </div>
      <div class="pcard-body">${renderNotifs(notifs,status,estDate,notifConfig)}</div>
    </div>

    <div class="pcard">
      <div class="pcard-header">
        <span class="pcard-header-icon">📋</span><h2>Deskripsi Kegiatan</h2>
        <span class="pcard-header-label">詳細</span>
      </div>
      <div class="pcard-body">${renderDeskripsi(proker,detail)}</div>
    </div>

    <div class="pcard">
      <div class="pcard-header">
        <span class="pcard-header-icon">📅</span><h2>Activity Log</h2>
        <span class="pcard-header-label">活動記録</span>
      </div>
      <div class="pcard-body"><div id="activityGraph"></div></div>
    </div>

    <div class="pcard">
      <div class="pcard-header">
        <span class="pcard-header-icon">📸</span><h2>Dokumentasi</h2>
        <span class="pcard-header-label">ドキュメント</span>
      </div>
      <div class="pcard-body">${renderDok(dok)}</div>
    </div>

    <div class="proker-nav">
      <a class="pnav-card ${prev?'':'disabled'}" href="${prev?'proker.html?id='+prev.num:'#'}">
        <div class="pnav-dir">← Sebelumnya</div>
        <div class="pnav-name">${prev?prev.icon+' '+prev.judul.replace(/&amp;/g,'&'):'–'}</div>
      </a>
      <a class="pnav-card next ${next?'':'disabled'}" href="${next?'proker.html?id='+next.num:'#'}">
        <div class="pnav-dir">Berikutnya →</div>
        <div class="pnav-name">${next?next.judul.replace(/&amp;/g,'&')+' '+next.icon:'–'}</div>
      </a>
    </div>`;

  if(estDate) startCountdown(estDate,'countdownBox');
  buildActivityGraph('activityGraph',activity,jadwal,dok);

  const fb=$('sesi-body-0'), fi=$('toggle-icon-0');
  if(fb){fb.classList.add('open');if(fi)fi.textContent='▴';}

  // Ikat tombol cetak — printLaporanProker dari rekap-script.js
  const _btnCetak = document.getElementById('btnCetakProker');
  if (_btnCetak) {
    const _sdCapture = { ...sheetsData_ref }; // closure
    _btnCetak.addEventListener('click', () => {
      if (typeof printLaporanProker === 'function') {
        printLaporanProker(proker, sheetsData_ref);
      }
    });
  }
}

/* ══════════════════════════════════════════════
   GOOGLE SHEETS FETCH
   Sheets: proker_detail, proker_notif,
           proker_notif_config, proker_activity,
           proker_jadwal, proker_dokumentasi
══════════════════════════════════════════════ */
function fetchJSONP(url) {
  return new Promise((resolve,reject)=>{
    // ID unik per request — fix bug parallel fetch saling hapus script tag
    const uid = '_jcb_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const sid = 'jsonp_'+uid;
    const t   = setTimeout(()=>{cleanup();reject(new Error('Timeout'));},12000);
    window[uid] = data => { cleanup(); resolve(data); };
    function cleanup() {
      clearTimeout(t);
      delete window[uid];
      document.getElementById(sid)?.remove();
    }
    const el  = document.createElement('script');
    el.id     = sid;
    el.src    = url + '&callback=' + uid;
    el.onerror = () => { cleanup(); reject(new Error('Load failed')); };
    document.head.appendChild(el);
  });
}

/* ══════════════════════════════════════════════
   CACHE — sessionStorage, TTL 15 menit
   Menyimpan SEMUA sheet sekaligus dalam 1 entry.
   Semua proker berbagi cache yang sama — navigasi
   prev/next tidak perlu fetch ulang selama TTL aktif.
══════════════════════════════════════════════ */
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 menit

function _cacheKey() {
  // Key HARUS sama dengan _jcosasiCacheKey() di script.js
  // agar cache yang di-preload landing page langsung dipakai di sini
  const api = CONTENT?.api?.url || 'default';
  try { return 'jcosasi_v1_' + btoa(api).slice(0, 20).replace(/[^a-z0-9]/gi,''); }
  catch(e) { return 'jcosasi_v1_default'; }
}

function cacheLoad() {
  try {
    const raw = sessionStorage.getItem(_cacheKey());
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || !entry.ts || !entry.data) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(_cacheKey());
      return null;
    }
    return entry.data;
  } catch(e) { return null; }
}

function cacheSave(data) {
  try {
    sessionStorage.setItem(_cacheKey(), JSON.stringify({ ts: Date.now(), data }));
  } catch(e) {
    // sessionStorage penuh (misal mode privat terbatas) — tidak masalah, skip
  }
}

function cacheInvalidate() {
  try { sessionStorage.removeItem(_cacheKey()); } catch(e) {}
}

async function fetchAllSheets(prokerId) {
  const api = CONTENT?.api?.url;
  if (!api || api === 'PASTE_URL_APPS_SCRIPT_KAMU_DI_SINI') return null;

  /* ── Coba cache dulu ── */
  let allData = cacheLoad();

  if (!allData) {
    /* ── Cache miss: fetch 6 sheet paralel ── */
    const sheetNames = ['proker_detail','proker_notif','proker_notif_config',
                        'proker_activity','proker_jadwal','proker_dokumentasi'];
    let results;
    try {
      results = await Promise.allSettled(
        sheetNames.map(s => fetchJSONP(`${api}?sheet=${s}`))
      );
    } catch(e) {
      console.warn('[JCOSASI] Fetch error:', e);
      return null;
    }

    const safe = res =>
      res.status === 'fulfilled' && res.value?.status === 'ok'
        ? res.value.data : [];

    const [detArr,notArr,cfgArr,actArr,jadArr,dokArr] = results.map(safe);
    allData = { detArr, notArr, cfgArr, actArr, jadArr, dokArr };

    /* Simpan ke cache hanya jika setidaknya 1 sheet ada datanya */
    if (Object.values(allData).some(arr => arr.length > 0)) {
      cacheSave(allData);
    } else {
      /* Semua sheet kosong / gagal — kembalikan null agar banner error muncul */
      return null;
    }
  }

  /* ── Filter per proker_id ── */
  const { detArr, notArr, cfgArr, actArr, jadArr, dokArr } = allData;
  const pid     = parseInt(prokerId, 10);
  const matchId = r => parseInt(r.proker_id, 10) === pid;

  return {
    detail:      detArr.find(matchId)      || null,
    notifs:      notArr.filter(r => matchId(r) || r.proker_id === 'all'),
    notifConfig: cfgArr.find(matchId)      || null,
    activity:    actArr.filter(matchId),
    jadwal:      jadArr.filter(matchId),
    dok:         dokArr.filter(matchId),
  };
}

/* ── fetchAllSheetsRaw: fetch semua sheet tanpa filter proker_id ──
   Dipakai oleh rekap-script.js. Hasil disimpan ke cache yang sama. */
async function fetchAllSheetsRaw() {
  const api = CONTENT?.api?.url;
  if (!api || api === 'PASTE_URL_APPS_SCRIPT_KAMU_DI_SINI') return null;

  const sheetNames = ['proker_detail','proker_notif','proker_notif_config',
                      'proker_activity','proker_jadwal','proker_dokumentasi'];
  let results;
  try {
    results = await Promise.allSettled(
      sheetNames.map(s => fetchJSONP(`${api}?sheet=${s}`))
    );
  } catch(e) {
    console.warn('[JCOSASI] fetchAllSheetsRaw error:', e);
    return null;
  }

  const safe = res =>
    res.status === 'fulfilled' && res.value?.status === 'ok' ? res.value.data : [];
  const [detArr,notArr,cfgArr,actArr,jadArr,dokArr] = results.map(safe);
  const allData = { detArr, notArr, cfgArr, actArr, jadArr, dokArr };

  if (Object.values(allData).some(a => a.length > 0)) {
    cacheSave(allData);
    return allData;
  }
  return null;
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async ()=>{
  // Jika ?page=rekap → jalankan initRekap() dari rekap-script.js
  const _page = new URLSearchParams(window.location.search).get('page');
  if (_page === 'rekap') {
    if (typeof initRekap === 'function') initRekap();
    return;
  }

  const id     = getProkerIdFromURL();
  const proker = getProkerData(id);

  if(!proker){
    $('mainContent').innerHTML=`<div class="page-error">
      <div class="pe-icon">🔍</div>
      <h2>Proker tidak ditemukan</h2>
      <p>ID "<strong>${id}</strong>" tidak ada dalam daftar.</p>
      <a href="index.html" class="btn-back">← Kembali</a>
    </div>`;
    return;
  }

  // Invalidate cache jika halaman proker di-refresh langsung
  const _isReload = performance && performance.navigation
    ? performance.navigation.type === 1
    : (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]?.type === 'reload');
  if (_isReload) cacheInvalidate();

  // Render skeleton loading dulu — tidak blank saat fetch
  $('mainContent').innerHTML = renderSkeleton(proker);

  // Fetch data Sheets (dengan cache 15 menit, di-preload dari landing page)
  let sheetsData = null;
  try {
    sheetsData = await fetchAllSheets(id);
  } catch(e) {
    console.warn('[JCOSASI] fetchAllSheets error:', e);
  }

  // Render halaman — sheetsData null = tampil dengan data kosong + banner error
  renderPage(proker, sheetsData);

  if (!sheetsData) {
    // Invalidate cache yang mungkin corrupt, agar retry fresh
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
    $('mainContent').prepend(warn);
  }
});

/* ── Skeleton loading ── */
function renderSkeleton(proker) {
  return `
    <div class="sk-hero">
      <div class="sk-badge"></div>
      <div class="sk-icon">${proker.icon}</div>
      <div class="sk-title">${proker.judul.replace(/&amp;/g,'&')}</div>
      <div class="sk-desc">${proker.desc.replace(/<[^>]*>/g,'')}</div>
      <div class="sk-meta">
        <div class="sk-chip"></div>
        <div class="sk-chip"></div>
      </div>
    </div>
    ${['Pemberitahuan','Deskripsi Kegiatan','Activity Log','Dokumentasi'].map(label=>`
    <div class="pcard sk-card">
      <div class="pcard-header">
        <h2 style="color:var(--grey-mid)">${label}</h2>
      </div>
      <div class="pcard-body">
        <div class="sk-line w80"></div>
        <div class="sk-line w60"></div>
        <div class="sk-line w70"></div>
      </div>
    </div>`).join('')}`;
}
