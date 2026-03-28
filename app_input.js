/* ═══════ CONFIG ═══════ */
// API_READ  → deployment read-only (gas_readonly.js) — untuk load data awal
// API_WRITE → deployment gas_v7.js  — untuk semua operasi write
// WRITE_TOKEN → harus sama persis dengan WRITE_TOKEN di gas_v7.js
const API_READ   = 'https://script.google.com/macros/s/AKfycby4syb7I0ygt_TuYPo3A3O-mQHNn8O0JLudGIWHzxS-AFa63EIZPaNL0QEOq5bkPo6AAQ/exec';
const API_WRITE  = 'https://script.google.com/macros/s/AKfycbw9dQmCy9JaiDWby3xG5L71UvZCfcJp9LsroKBmUWte94cv472tW9k1_8u1lQuq82DQ/exec';
let WRITE_TOKEN = null; // diisi user saat loading screen
const API = API_WRITE; // alias untuk kompatibilitas

/* ═══════ UPLOAD LOCK CONFIG ═══════ */
// Session ID unik per tab/sesi — dipakai sebagai locked_by
const SESSION_ID = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7);
const LOCK_SHEET  = 'upload_confirm';
const LOCK_TTL_MS = 30000; // 30 detik — lock dianggap stale jika melebihi ini
// Version yang diambil saat init — dipakai untuk deteksi konflik
let _localVersion = null;

// Sheet headers — harus sama persis dengan GAS SHEET_HEADERS
const SH = {
  // id & delete_flag adalah kolom manajemen — tidak ditampilkan di UI
  // id = key unik per baris; delete_flag = 'TRUE' artinya baris mati
  proker_dokumentasi:  ['id','proker_id','tanggal_sesi','foto_url','keterangan','hadir_peserta','kelas_peserta','hadir_panitia','kelas_panitia','hadir_narasumber','kelas_narasumber','materi','waktu_mulai','waktu_selesai','item_biaya','estimasi_biaya_item','biaya_aktual','kendala','delete_flag'],
  proker_jadwal:       ['id','proker_id','tanggal','jam','catatan','penanggung_jawab','delete_flag'],
  proker_detail:       ['id','proker_id','tujuan','deskripsi_kegiatan','waktu_teks','estimasi_tanggal','lokasi','sasaran','pemateri','panitia','item_biaya','estimasi_biaya_item','biaya_aktual','delete_flag'],
  proker_notif_config: ['id','proker_id','countdown_aktif','ajakan','ajakan_teks','ajakan_sub','wajib_hadir','wajib_hadir_teks','wajib_hadir_sanksi','delete_flag'],
  anggota:             ['id','nama','kelas','angkatan','status','no_hp','catatan','delete_flag'],
  pengurus:            ['jabatan_level','jabatan','nama','kelas','foto_url','bidang_nama','deskripsi_jabatan'],
  pencapaian:          ['id','nama','angkatan','pencapaian','emblem','poin','keterangan','waktu','delete_flag'],
  pengumuman:          ['id','judul','deskripsi','poster_url','tanggal_publish','tanggal_turun',
                         'target_audiens','persiapan','cara_daftar','link_pendaftaran',
                         'waktu_kegiatan','lokasi_kegiatan','narahubung_nama','narahubung_kontak',
                         'dokumen_judul','dokumen_url','tag','prioritas','efek_poster','aktif','delete_flag'],
};

/* ═══════ ID GENERATOR ═══════ */
// Buat id unik per baris berdasarkan field kunci sheet
function makeRowId(sh, obj) {
  switch(sh) {
    case 'proker_dokumentasi': return (obj.proker_id||'') + '_' + (obj.tanggal_sesi||'');
    case 'proker_jadwal':      return (obj.proker_id||'') + '_' + (obj.tanggal||'');
    case 'anggota':            return (obj.nama||'') + '_' + (obj.angkatan||'');
    case 'proker_detail':      return (obj.proker_id||'');
    case 'proker_notif_config':return (obj.proker_id||'');
    case 'pencapaian':          return obj.id || '';
    case 'pengumuman':         return (obj.id||'') || (obj.judul||'').slice(0,20)+'_'+(obj.tanggal_publish||'');
    default:                   return '';
  }
}

const PK = {
  '01':{n:'Pembelajaran Bhs. Jepang',i:'📚'},'02':{n:'Bidang Akademik',i:'🏫'},
  '03':{n:'Proyek Minat & Bakat',i:'🎨'},'04':{n:'Rapat Bulanan',i:'🤝'},
  '05':{n:'DIKLAT',i:'🔥'},'06':{n:'DEMOS/MPLS',i:'🌸'},
  '07':{n:'JCOSASI Tanjoubi',i:'🎊'},'08':{n:'Pelantikan Anggota',i:'🎌'},
  '09':{n:'Class Meeting',i:'🏆'},'10':{n:'Serah Terima Jabatan',i:'🙏'},
  '11':{n:'Lomba & Kompetisi',i:'💪'},'12':{n:'Konten Sosial Media',i:'📱'},
  '13':{n:'Kintore Bersama',i:'🏃'},'14':{n:'Sharing Alumni',i:'🎓'},
  '15':{n:'Kegiatan Lainnya',i:'📌'}
};

/* ═══════ STATE ═══════ */
const S = {
  dok:[], jad:[], det:[], notif:[], ang:[], peng:[], pgm:[], cap:[],
  changes:[],
  fp:'all',
  today: new Date().toISOString().split('T')[0]
};

/* ═══════ JSONP ═══════ */
let _n = 0;
function jsonp(p) {
  return new Promise((res, rej) => {
    const cb = '__jcb' + (++_n) + '_' + Date.now();
    const tid = setTimeout(() => { cl(); rej(new Error('Timeout')); }, 30000);
    function cl() { delete window[cb]; const s = document.getElementById(cb); if (s) s.remove(); }
    window[cb] = d => { clearTimeout(tid); cl(); d.status === 'ok' ? res(d) : rej(new Error(d.message || 'GAS error')); };
    // Inject token otomatis ke semua request write
    const params = { ...p, token: WRITE_TOKEN, callback: cb };
    const qs = Object.entries(params).map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
    const sc = document.createElement('script'); sc.id = cb; sc.src = API_WRITE + '?' + qs;
    sc.onerror = () => { clearTimeout(tid); cl(); rej(new Error('Script load error')); };
    document.head.appendChild(sc);
  });
}
// readSh pakai API_READ (read-only deployment), bukan API_WRITE
function readSh(s) {
  return new Promise((res, rej) => {
    const cb = '__jcb' + (++_n) + '_' + Date.now();
    const tid = setTimeout(() => { cl(); rej(new Error('Timeout')); }, 30000);
    function cl() { delete window[cb]; const sc = document.getElementById(cb); if (sc) sc.remove(); }
    window[cb] = d => { clearTimeout(tid); cl(); d.status === 'ok' ? res(d.data) : rej(new Error(d.message || 'GAS error')); };
    const qs = 'sheet=' + encodeURIComponent(s) + '&action=read&callback=' + encodeURIComponent(cb);
    const sc = document.createElement('script'); sc.id = cb;
    sc.src = API_READ + '?' + qs;
    sc.onerror = () => { clearTimeout(tid); cl(); rej(new Error('Script load error')); };
    document.head.appendChild(sc);
  });
}


/* ═══════ TOKEN GATE ═══════ */
// Tidak ada token tersimpan di client.
// Validasi dilakukan dengan mencoba write ke sheet 'login_confirm'.
// Jika GAS menerima request (token cocok di server) → akses diberikan.
// Jika GAS menolak (token salah / error) → akses ditolak.

// State: apakah data sudah selesai dimuat & token sudah dikonfirmasi
let _dataReady   = false;
let _tokenReady  = false;

// Cek apakah overlay boleh ditutup (keduanya harus true)
function _checkCanDismiss() {
  if (_dataReady && _tokenReady) {
    document.getElementById('lov').classList.add('hidden');
  }
}

// Update status teks di loading text area
function _setLtx(msg) {
  const el = document.getElementById('ltx');
  if (el) el.textContent = msg;
}

// Animasi goyang card (feedback error)
function _shakeCard() {
  const card = document.getElementById('lovTokenCard');
  if (!card) return;
  card.style.transition = 'transform .08s ease';
  card.style.transform = 'translateX(-7px)';
  setTimeout(() => { card.style.transform = 'translateX(7px)'; }, 80);
  setTimeout(() => { card.style.transform = 'translateX(-4px)'; }, 160);
  setTimeout(() => { card.style.transform = ''; card.style.transition = ''; }, 240);
}

// Dipanggil saat user klik Konfirmasi / tekan Enter
async function submitToken() {
  const inp  = document.getElementById('lovTokenInput');
  const btn  = document.getElementById('lovTokenBtn');
  const stat = document.getElementById('lovTokenStatus');
  const card = document.getElementById('lovTokenCard');
  if (!inp || !btn) return;

  const val = inp.value.trim();
  if (!val) {
    stat.className = 'lov-token-status err';
    stat.textContent = 'Token tidak boleh kosong';
    inp.focus();
    return;
  }

  // UI: loading state
  btn.disabled = true;
  stat.className = 'lov-token-status wait';
  stat.textContent = 'Memverifikasi…';

  try {
    // Validasi token dengan mencoba write ke sheet 'login_confirm'
    // menggunakan action 'replaceAll' yang sudah ada di GAS.
    // GAS menolak dengan "Unauthorized" jika token salah → akses ditolak.
    // GAS menerima jika token benar → status: 'ok' → akses diberikan.
    // Tidak ada token yang disimpan di client-side.
    const payload = JSON.stringify({
      headers: ['write_confirm', 'session', 'ts'],
      rows:    [['1', SESSION_ID, new Date().toISOString()]]
    });
    await new Promise((res, rej) => {
      const cb  = '__jcb_lc_' + Date.now();
      const tid = setTimeout(() => {
        delete window[cb];
        const sc = document.getElementById(cb); if (sc) sc.remove();
        rej(new Error('Timeout — cek koneksi internet'));
      }, 20000);
      window[cb] = d => {
        clearTimeout(tid);
        delete window[cb];
        const sc = document.getElementById(cb); if (sc) sc.remove();
        d.status === 'ok' ? res(d) : rej(new Error(d.message || 'Token ditolak'));
      };
      const params = {
        action:   'replaceAll',
        sheet:    'login_confirm',
        payload:  payload,
        token:    val,
        callback: cb
      };
      const qs = Object.entries(params)
        .map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
        .join('&');
      const sc = document.createElement('script');
      sc.id  = cb;
      sc.src = API_WRITE + '?' + qs;
      sc.onerror = () => {
        clearTimeout(tid);
        delete window[cb]; if (sc) sc.remove();
        rej(new Error('Gagal terhubung ke server'));
      };
      document.head.appendChild(sc);
    });

    // Write berhasil → token valid
    WRITE_TOKEN = val;
    _tokenReady = true;
    stat.className = 'lov-token-status ok';
    stat.textContent = '✓  Akses diberikan';
    card.classList.add('confirmed');
    _checkCanDismiss();

  } catch (e) {
    // Write ditolak → token salah atau error jaringan
    btn.disabled = false;
    stat.className = 'lov-token-status err';
    const msg = e.message || 'Token tidak valid';
    stat.textContent = '✕  ' + (msg === 'Unauthorized' ? 'Token salah, coba lagi' : msg);
    inp.value = '';
    inp.focus();
    _shakeCard();
  }
}

// Toggle password visibility
function toggleTokenVisibility() {
  const inp = document.getElementById('lovTokenInput');
  const eye = document.getElementById('lovTokenEye');
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    if (eye) eye.textContent = '🙈';
  } else {
    inp.type = 'password';
    if (eye) eye.textContent = '👁';
  }
}

/* ═══════ MOBILE SIDEBAR ═══════ */
function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sbOverlay');
  const btn      = document.getElementById('btnHam');
  const isOpen   = sidebar && sidebar.classList.contains('open');
  if (isOpen) closeSidebar();
  else {
    if (sidebar)  sidebar.classList.add('open');
    if (overlay)  overlay.classList.add('show');
    if (btn)      btn.classList.add('open');
  }
}
function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sbOverlay');
  const btn     = document.getElementById('btnHam');
  if (sidebar)  sidebar.classList.remove('open');
  if (overlay)  overlay.classList.remove('show');
  if (btn)      btn.classList.remove('open');
}
// Tutup sidebar saat swipe kiri (touch)
(function initSwipeClose() {
  let startX = 0;
  document.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (dx < -60) closeSidebar(); // swipe kiri
  }, { passive: true });
})();
/* ═══════ INIT ═══════ */
async function init() {
  setS('loading', 'Memuat…');
  // Aktifkan glow pada card setelah sebentar agar user tahu bisa input
  setTimeout(() => {
    const card = document.getElementById('lovTokenCard');
    if (card) card.classList.add('ready');
    const inp = document.getElementById('lovTokenInput');
    if (inp) inp.focus();
  }, 600);

  // Allow Enter key to submit token
  const inp = document.getElementById('lovTokenInput');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') submitToken(); });

  try {
    _setLtx('Memuat data dari server…');
    const [dok, jad, det, notif, ang, peng, pgm, cap, lockData] = await Promise.all([
      readSh('proker_dokumentasi'), readSh('proker_jadwal'), readSh('proker_detail'),
      readSh('proker_notif_config'), readSh('anggota').catch(() => []), readSh('pengurus'),
      readSh('pengumuman').catch(() => []),
      readSh('pencapaian').catch(() => []),
      readSh(LOCK_SHEET).catch(() => [])
    ]);
    // Simpan version dari sheet upload_confirm
    if (lockData && lockData.length > 0) {
      _localVersion = lockData[0].version || null;
    }
    // Filter baris deleted dari sheet (delete_flag=TRUE) sebelum masuk state
    S.dok   = dok.filter(d=>d.delete_flag!=='TRUE').map((d,i)  => ({...d, _i:i, _m:false, _n:false, _d:false}));
    S.jad   = jad.filter(d=>d.delete_flag!=='TRUE').map((d,i)  => ({...d, _i:i, _m:false, _n:false, _d:false}));
    S.det   = det.filter(d=>d.delete_flag!=='TRUE').map((d,i)  => ({...d, _i:i, _m:false}));
    S.notif = notif.filter(d=>d.delete_flag!=='TRUE').map((d,i)=> ({...d, _i:i, _m:false}));
    S.ang   = ang.filter(d=>d.delete_flag!=='TRUE').map((d,i)  => ({...d, _i:i, _m:false, _n:false, _d:false}));
    S.peng  = peng
      .filter(p => p.jabatan_level && !['Note:', ''].includes((p.jabatan_level||'').trim()))
      .map((d,i) => ({...d, _i:i, _m:false}));
    S.pgm   = pgm.filter(d=>d.delete_flag!=='TRUE').map((d,i) => ({...d, _i:i, _m:false, _n:false, _d:false}));
    S.cap   = cap.filter(d=>d.delete_flag!=='TRUE').map((d,i) => ({...d, _i:i, _m:false, _n:false, _d:false}));
    setS('ok', 'Tersinkron');
    _dataReady = true;
    _setLtx('Data siap — masukkan token untuk melanjutkan');
    _checkCanDismiss();
    renderAll();
  } catch(e) {
    setS('error', 'Gagal');
    _dataReady = true; // tetap buka overlay agar user bisa coba lagi
    _setLtx('Gagal memuat data — ' + e.message);
    _checkCanDismiss();
    toast('❌ Gagal: ' + e.message, 'error');
    console.error(e);
  }
}

/* ═══════ RENDER ALL ═══════ */
function renderAll() {
  renderOv(); renderDok(); renderJad(); renderDet();
  renderNotif(); renderAng(); renderPeng(); renderPgm(); renderCap(); updateBadges();
}

/* ═══════ OVERVIEW ═══════ */
function renderOv() {
  const biaya = S.dok.filter(d=>!d._d).reduce((a,d) => a + pBiaya(d.biaya_aktual), 0);
  const pend  = getPend();
  document.getElementById('st-sesi').textContent    = S.dok.filter(d=>!d._d).length;
  document.getElementById('st-biaya').textContent   = 'Rp ' + biaya.toLocaleString('id');
  document.getElementById('st-anggota').textContent = S.ang.filter(a=>!a._d).length;
  document.getElementById('st-jadwal').textContent  = S.jad.filter(j=>!j._d).length;
  document.getElementById('st-pending').textContent = pend.length;
  document.getElementById('st-changes').textContent = S.changes.length;

  const pp = document.getElementById('pendingPanel');
  if (pend.length) {
    pp.style.display = '';
    document.getElementById('pendingList').innerHTML = pend.map(j => {
      const info = PK[j.proker_id] || {n:'Proker '+j.proker_id, i:'📌'};
      return `<div class="pend-item"><span>${info.i}</span><div class="pend-txt"><strong>${info.n}</strong> — ${j.tanggal} pukul ${j.jam}</div><span class="pend-d">${dAgo(j.tanggal)} hari lalu</span><button class="btn-add" style="padding:4px 11px;font-size:.7rem" onclick="openSesiFromPend('${j.proker_id}','${j.tanggal}','${j.jam}')">Isi Sesi</button></div>`;
    }).join('');
  } else pp.style.display = 'none';

  renderAG();
  setTimeout(initPhSakura, 0);

  const bp = {};
  S.dok.filter(d=>!d._d).forEach(d => { if(!bp[d.proker_id]) bp[d.proker_id]=[]; bp[d.proker_id].push(d); });
  document.getElementById('rkCards').innerHTML = Object.entries(bp).map(([id,ss]) => {
    const info = PK[id] || {n:'Proker '+id, i:'📌'};
    const b = ss.reduce((a,d) => a + pBiaya(d.biaya_aktual), 0);
    const last = ss.map(s=>s.tanggal_sesi).sort().reverse()[0];
    return `<div class="rk-card" onclick="filterGo('${id}')"><div class="rk-bd"><div class="rk-ic">${info.i}</div><div class="rk-nm">${info.n}</div><div class="rk-sub">#${id} · ${fDate(last)}</div><div class="rk-num">${ss.length}</div><div class="rk-nl">sesi</div><div style="margin-top:5px;font-size:.73rem;color:var(--gm)">Biaya: <strong style="color:var(--ch)">Rp ${b.toLocaleString('id')}</strong></div></div></div>`;
  }).join('') || '<div class="empty"><div class="ei">📭</div><div class="et">Belum ada dokumentasi</div></div>';
}

function getPend() {
  const sd = new Set(S.dok.filter(d=>!d._d).map(d => d.proker_id+'_'+d.tanggal_sesi));
  return S.jad.filter(j => !j._d && j.tanggal < S.today && !sd.has(j.proker_id+'_'+j.tanggal));
}
function dAgo(s) { return Math.floor((new Date() - new Date(s+'T00:00:00')) / 86400000); }

/* ═══════ ACTIVITY GRAPH ═══════ */
function renderAG() {
  const sd = {}, jd = {};
  S.dok.filter(d=>!d._d).forEach(d => { if(!sd[d.tanggal_sesi]) sd[d.tanggal_sesi]=[]; sd[d.tanggal_sesi].push(PK[d.proker_id]?.n||'#'+d.proker_id); });
  S.jad.filter(j=>!j._d).forEach(j => { if(!jd[j.tanggal]) jd[j.tanggal]=[]; jd[j.tanggal].push({pid:j.proker_id,jam:j.jam}); });
  const pendSet = new Set(getPend().map(j=>j.tanggal));

  const start = new Date('2026-01-01');
  const dow = start.getDay();
  const first = new Date(start); first.setDate(first.getDate()-dow);
  const weeks = [], mLabels = []; let cur = new Date(first), lastM = -1;

  while(cur <= new Date('2027-01-31') || weeks.length < 54) {
    const wk = [];
    for(let d = 0; d < 7; d++) {
      const iso = toISO(cur);
      const hidden = cur < start || cur.getFullYear() > 2027;
      let st = 'future';
      if(!hidden) {
        if(iso === S.today) st = jd[iso] ? 'today-planned' : 'today';
        else if(iso < S.today) st = sd[iso] ? 'actual' : (pendSet.has(iso) ? 'pending' : 'past');
        else st = jd[iso] ? 'planned' : 'future';
      }
      if(d === 0) {
        const m = cur.getMonth();
        if(m !== lastM && cur >= start) { mLabels.push({wi:weeks.length, lb:['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'][m]}); lastM=m; }
        else mLabels.push({wi:weeks.length, lb:''});
      }
      wk.push({iso, st, hidden, sesis:sd[iso]||[], jads:jd[iso]||[], pend:pendSet.has(iso)});
      cur.setDate(cur.getDate()+1);
    }
    weeks.push(wk);
    if(weeks.length > 58) break;
  }

  document.getElementById('actMonths').innerHTML = weeks.map((_,wi) => {
    const ml = mLabels.find(m=>m.wi===wi);
    return `<div class="act-ml" style="width:14px">${ml?.lb||''}</div>`;
  }).join('');

  document.getElementById('actGraph').innerHTML = weeks.map(wk =>
    `<div class="act-week">${wk.map(day => {
      if(day.hidden) return `<div class="act-day" style="visibility:hidden"></div>`;
      const lines = [];
      if(day.sesis.length) lines.push('✅ '+day.sesis.join(', '));
      if(day.jads.length)  lines.push('📅 '+day.jads.map(j=>PK[j.pid]?.n||j.pid).join(', '));
      if(day.pend)         lines.push('⚠️ Belum ada dokumentasi!');
      const tipText = fDate(day.iso) + (lines.length ? '\n'+lines.join('\n') : '');
      return `<div class="act-day" data-state="${day.st}" data-tip="${esc(tipText)}" onmouseenter="showTip(event,this)" onmouseleave="hideTip()"></div>`;
    }).join('')}</div>`
  ).join('');

  const total = Object.keys(sd).length;
  const dur = S.dok.filter(d=>!d._d).reduce((a,d) => {
    if(d.waktu_mulai && d.waktu_selesai) {
      const [h1,m1]=d.waktu_mulai.split(':').map(Number), [h2,m2]=d.waktu_selesai.split(':').map(Number);
      return a + (h2*60+m2-h1*60-m1);
    }
    return a;
  }, 0);
  const biaya = S.dok.filter(d=>!d._d).reduce((a,d) => a + pBiaya(d.biaya_aktual), 0);
  document.getElementById('actStats').innerHTML =
    `<div class="as-i"><strong>${total}</strong> hari kegiatan</div>` +
    `<div class="as-i"><strong>${Math.round(dur/6)/10} jam</strong> total</div>` +
    `<div class="as-i"><strong>Rp ${biaya.toLocaleString('id')}</strong> biaya</div>` +
    `<div class="as-i"><strong>${pendSet.size}</strong> jadwal belum didok.</div>`;

  document.getElementById('actLeg').innerHTML = [
    {s:'actual',l:'Terlaksana'},{s:'pending',l:'Perlu dokumentasi'},{s:'today',l:'Hari ini'},
    {s:'planned',l:'Rencana'},{s:'past',l:'Hari lewat'},{s:'future',l:'Akan datang'}
  ].map(({s,l}) => `<div class="al-i"><div class="al-d" style="background:${aC(s)}"></div><span>${l}</span></div>`).join('');
}

function aC(s) { return {actual:'#16A34A',pending:'#DC2626',today:'#9B59D4','today-planned':'#6B34AF',planned:'rgba(107,52,175,.5)',past:'#D4CFF0',future:'#EDEAF6'}[s]||'#EEE'; }
function showTip(e, el) { const t=document.getElementById('actTip'); t.style.cssText=`opacity:1;left:${e.clientX+12}px;top:${e.clientY-10}px;white-space:pre`; t.textContent=el.dataset.tip||''; }
function hideTip() { document.getElementById('actTip').style.opacity='0'; }
function toISO(d) { return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
function p2(n) { return n < 10 ? '0'+n : ''+n; }

/* ═══════ DOKUMENTASI ═══════ */
function renderDok() {
  const list = S.fp==='all' ? S.dok : S.dok.filter(d=>d.proker_id===S.fp);
  const active  = list.filter(d=>!d._d).sort((a,b)=>b.tanggal_sesi>a.tanggal_sesi?1:-1);
  const deleted = list.filter(d=>d._d);
  const ids = [...new Set(S.dok.filter(d=>!d._d).map(d=>d.proker_id))].sort();

  document.getElementById('filterChips').innerHTML =
    `<div class="fc ${S.fp==='all'?'active':''}" onclick="setFP('all')">Semua (${S.dok.filter(d=>!d._d).length})</div>` +
    ids.map(id => {
      const info=PK[id]||{n:'#'+id,i:'📌'};
      const c=S.dok.filter(d=>d.proker_id===id&&!d._d).length;
      return `<div class="fc ${S.fp===id?'active':''}" onclick="setFP('${id}')">${info.i} #${id} (${c})</div>`;
    }).join('');

  const pend = S.dok.filter(d=>d._m||d._n||d._d).length;
  document.getElementById('dokBanner').classList.toggle('show', pend>0);
  document.getElementById('dokBannerN').textContent = pend;

  const cont = document.getElementById('sesiList');
  if(!active.length && !deleted.length) {
    cont.innerHTML='<div class="empty"><div class="ei">📂</div><div class="et">Tidak ada sesi</div><div class="ed">Klik + Tambah Sesi</div></div>';
    return;
  }
  cont.innerHTML = [...active, ...deleted].map(s => {
    const info = PK[s.proker_id]||{n:'Proker '+s.proker_id,i:'📌'};
    const cls  = s._d?'del':s._n?'newrow':s._m?'mod':'';
    const badge= s._d?'<span class="chg chg-d">Dihapus</span>':s._n?'<span class="chg chg-n">Baru</span>':s._m?'<span class="chg chg-m">Diubah</span>':'';
    const peserta = spl(s.hadir_peserta);
    const b = pBiaya(s.biaya_aktual);
    return `<div class="sc ${cls}" id="sc-${s._i}">
      <div class="sc-h" onclick="tgSc(${s._i})">
        <span style="font-size:.95rem">${info.i}</span>
        <span class="sc-date">${s.tanggal_sesi||'–'}</span>
        <span class="sc-pill">#${s.proker_id}</span>
        <span class="sc-tit">${s.keterangan||'(tanpa keterangan)'}</span>
        <span style="font-size:.7rem;color:var(--gm);font-family:var(--fm)">${s.waktu_mulai||''}${s.waktu_selesai?'–'+s.waktu_selesai:''}</span>
        ${badge}<span class="sc-chev">▼</span>
      </div>
      <div class="sc-body">
        <div class="ss-grid">
          <div class="ss-item"><div class="ss-l">Peserta</div><div class="ss-v">${peserta.length} orang</div></div>
          <div class="ss-item"><div class="ss-l">Materi</div><div class="ss-v" style="font-size:.73rem;font-weight:500">${(s.materi||'–').substring(0,55)}${(s.materi||'').length>55?'…':''}</div></div>
          <div class="ss-item"><div class="ss-l">Biaya Aktual</div><div class="ss-v">${b>0?'Rp '+b.toLocaleString('id'):'–'}</div></div>
        </div>
        ${s.kendala?`<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;padding:6px 10px;font-size:.75rem;margin-bottom:10px">⚠️ ${s.kendala}</div>`:''}
        <div style="display:flex;gap:7px;flex-wrap:wrap">
          ${s._d
            ? `<button class="btn-add" style="font-size:.73rem;padding:4px 11px" onclick="restDok(${s._i})">↩ Batalkan Hapus</button>`
            : `<button class="btn-esm" onclick="openSesi(${s._i})">✏️ Edit</button><button class="btn-del" onclick="delDok(${s._i})">🗑️ Hapus</button>`}
        </div>
      </div>
    </div>`;
  }).join('');
}

function setFP(id) { S.fp=id; renderDok(); }
function filterGo(id) { S.fp=id; showPage('dokumentasi'); }
function tgSc(i) { const el=document.getElementById('sc-'+i); if(el) el.classList.toggle('open'); }
function delDok(i) {
  if(!confirm('Tandai untuk dihapus?')) return;
  const idx = S.dok.findIndex(d=>d._i===i);
  if(idx>=0) { S.dok[idx]._d=true; S.dok[idx]._m=false; logC('del','dokumentasi',i,S.dok[idx].keterangan||'Sesi'); }
  renderAll(); toast('🗑️ Ditandai untuk dihapus','warning');
}
function restDok(i) {
  const idx = S.dok.findIndex(d=>d._i===i);
  if(idx>=0) { S.dok[idx]._d=false; S.changes=S.changes.filter(c=>!(c.sh==='dokumentasi'&&c.idx===i&&c.a==='del')); }
  renderAll(); toast('↩ Dibatalkan');
}

/* ═══════ SESI MODAL ═══════ */
let BR = [];

function openSesi(i) {
  const s = S.dok.find(d=>d._i===i); if(!s) return;
  document.getElementById('e_idx').value = i;
  document.getElementById('sesiMT').textContent = 'Edit: '+(s.keterangan||fDate(s.tanggal_sesi));
  document.getElementById('e_pid').innerHTML = pkOpts(s.proker_id);
  document.getElementById('e_tgl').value = s.tanggal_sesi||'';
  document.getElementById('e_mul').value = s.waktu_mulai||'';
  document.getElementById('e_sel').value = s.waktu_selesai||'';
  document.getElementById('e_ket').value = s.keterangan||'';
  document.getElementById('e_mat').value = s.materi||'';
  document.getElementById('e_kend').value = s.kendala||'';
  document.getElementById('e_foto').value = s.foto_url||'';
  initPck('peserta',s.hadir_peserta,s.kelas_peserta); initPck('panitia',s.hadir_panitia,s.kelas_panitia); initPck('narasumber',s.hadir_narasumber,s.kelas_narasumber);
  initBR(s); openModal('sesiModal');
}
function openNewSesiModal() {
  document.getElementById('e_idx').value = 'new';
  document.getElementById('sesiMT').textContent = 'Tambah Sesi Baru';
  document.getElementById('e_pid').innerHTML = pkOpts('01');
  document.getElementById('e_tgl').value = S.today;
  ['e_mul','e_sel','e_ket','e_mat','e_kend','e_foto'].forEach(id => document.getElementById(id).value='');
  initPck('peserta',''); initPck('panitia',''); initPck('narasumber','');
  initBR({}); openModal('sesiModal');
}
function openSesiFromPend(pid, tgl, jam) {
  openNewSesiModal();
  document.getElementById('e_pid').value = pid;
  document.getElementById('e_tgl').value = tgl;
  document.getElementById('e_mul').value = jam;
  showPage('dokumentasi'); openModal('sesiModal');
}
async function saveSesi() {
  // Resolve UID foto yang pending dari Google Form sebelum simpan
  await resolveFotoUids('e_foto');

  const i  = document.getElementById('e_idx').value;
  const nd = {
    proker_id:      document.getElementById('e_pid').value,
    tanggal_sesi:   document.getElementById('e_tgl').value,
    waktu_mulai:    document.getElementById('e_mul').value,
    waktu_selesai:  document.getElementById('e_sel').value,
    keterangan:     document.getElementById('e_ket').value,
    materi:         document.getElementById('e_mat').value,
    kendala:        document.getElementById('e_kend').value,
    foto_url:       document.getElementById('e_foto').value,
    hadir_peserta:    getPckVal('peserta'),
    kelas_peserta:    getPckKelas('peserta'),
    hadir_panitia:    getPckVal('panitia'),
    kelas_panitia:    getPckKelas('panitia'),
    hadir_narasumber: getPckVal('narasumber'),
    kelas_narasumber: getPckKelas('narasumber'),
    ...getBR()
  };
  if(i==='new') {
    const ni = Date.now();
    S.dok.push({...nd, _i:ni, _m:false, _n:true, _d:false});
    logC('add','dokumentasi',ni,nd.keterangan||'Sesi baru');
    toast('✅ Sesi ditambahkan','success');
  } else {
    const idx = S.dok.findIndex(d=>d._i===+i);
    if(idx>=0) { S.dok[idx]={...S.dok[idx],...nd,_m:true}; logC('edit','dokumentasi',+i,nd.keterangan); }
    toast('✅ Sesi disimpan','success');
  }
  closeModal('sesiModal'); renderAll();
}

/* ═══════ PICKER KEHADIRAN (checkbox + angkatan accordion + manual) ═══════
   PCK menyimpan Map: nama → kelas  (kelas bisa '' jika tidak diketahui)
   - getPckVal(key)   → "Nama1,Nama2,..."
   - getPckKelas(key) → "Kelas1,Kelas2,..." (urutan sama dengan nama)
═══════ */
const PCK = {};   // key → Map<nama, kelas>

/* Lookup kelas dari data anggota */
function getKelasFor(nama) {
  const a = S.ang.find(x => !x._d && x.nama === nama);
  return a ? (a.kelas || '') : '';
}

function initPck(key, namaStr, kelasStr) {
  const names  = spl(namaStr);
  const klases = spl(kelasStr);
  const m = new Map();
  names.forEach((n, i) => {
    // Prioritaskan kelas dari sheet; fallback ke data anggota
    const kls = (klases[i] && klases[i].trim()) ? klases[i].trim() : getKelasFor(n);
    m.set(n, kls);
  });
  PCK[key] = m;
  renderPckTags(key);
  renderPckCheckboxes(key);
}

function renderPckTags(key) {
  const el = document.getElementById('tg-' + key); if (!el) return;
  const entries = [...PCK[key].entries()];
  el.innerHTML = entries.map(([n, kls], i) =>
    '<div class="htag">'
      + esc(n)
      + (kls ? '<span class="htag-kelas">' + esc(kls) + '</span>' : '')
      + '<button class="htag-del" onclick="pckRemoveIdx(\'' + key + '\',' + i + ')">×</button>'
    + '</div>'
  ).join('');
}

function pckRemoveIdx(key, idx) {
  const keys = [...PCK[key].keys()];
  if (idx < keys.length) { PCK[key].delete(keys[idx]); renderPckTags(key); renderPckCheckboxes(key); }
}

function pckToggleEl(el) {
  const key  = el.dataset.key;
  const name = el.dataset.name;
  if (!key || !name) return;
  if (el.checked) {
    PCK[key].set(name, getKelasFor(name));
  } else {
    PCK[key].delete(name);
  }
  renderPckTags(key);
  updatePckCount(key);
}

function updatePckCount(key) {
  const el = document.getElementById('pck-count-' + key);
  if (el) el.textContent = PCK[key].size + ' dipilih';
}

/* Input manual:
   Field nama : "Asep, Ucup, Mulyo"   (pisah koma)
   Field kelas: "XII IPA A, , XI IPA A" (pisah koma, posisi harus sesuai nama;
                 kosongkan entri jika orang tersebut tidak ada kelasnya)
   Bisa juga format inline di field nama: "Asep|XII IPA A, Ucup, Mulyo|XI IPA A"
   Keduanya bisa dikombinasikan — field kelas menimpa jika ada.
*/
function addManualPck(key) {
  const inp  = document.getElementById('pck-manual-inp-' + key); if (!inp) return;
  const inp2 = document.getElementById('pck-manual-cls-' + key);
  const rawNama  = inp.value.trim();
  if (!rawNama) return;

  // Pisah nama dan kelas masing-masing per koma
  // Koma di field kelas bisa menghasilkan string kosong '' yang berarti "tidak ada kelas"
  const namaList  = rawNama.split(',').map(v => v.trim()).filter(Boolean);
  const kelasRaw  = inp2 ? inp2.value.split(',').map(v => v.trim()) : [];
  // kelasRaw boleh lebih pendek dari namaList — entri yang tidak ada = ''

  namaList.forEach((entry, i) => {
    // Deteksi format inline "Nama|Kelas" — diproses dulu
    const pipeIdx = entry.indexOf('|');
    let nama, kelasInline;
    if (pipeIdx !== -1) {
      nama        = entry.slice(0, pipeIdx).trim();
      kelasInline = entry.slice(pipeIdx + 1).trim();
    } else {
      nama        = entry;
      kelasInline = '';
    }
    if (!nama) return;

    // Prioritas kelas: field kelas UI (posisi i) > inline > data anggota
    let kelas = '';
    if (kelasRaw.length > 0) {
      // Field kelas diisi (meski sebagian kosong) — pakai posisi i
      // Jika posisi i tidak ada, anggap kosong (bukan fallback anggota)
      kelas = (kelasRaw[i] !== undefined ? kelasRaw[i] : '').trim();
      // Jika entri kelas pada posisi ini kosong DAN ada kelasInline, pakai inline
      if (!kelas && kelasInline) kelas = kelasInline;
      // Jika masih kosong, tidak fallback ke anggota karena user sengaja mengosongkan
    } else {
      // Field kelas tidak diisi sama sekali → gunakan inline atau fallback anggota
      kelas = kelasInline || getKelasFor(nama);
    }

    PCK[key].set(nama, kelas);
  });

  inp.value  = '';
  if (inp2) inp2.value = '';
  renderPckTags(key);
  renderPckCheckboxes(key);
}

function getPckVal(key)   { return [...PCK[key].keys()].join(','); }
function getPckKelas(key) { return [...PCK[key].values()].join(','); }

function renderPckCheckboxes(key) {
  const wrap = document.getElementById('pck-cls-' + key); if (!wrap) return;
  // Kategorikan per angkatan
  const byAngkatan = {};
  S.ang.filter(a => !a._d).forEach(a => {
    const kat = a.angkatan ? 'Angkatan ' + a.angkatan : 'Lainnya';
    if (!byAngkatan[kat]) byAngkatan[kat] = [];
    byAngkatan[kat].push({ nama: a.nama, kelas: a.kelas || '' });
  });
  // Anggota manual (tidak ada di S.ang)
  const known = new Set(S.ang.map(a => a.nama));
  [...PCK[key].keys()].forEach(n => {
    if (!known.has(n)) {
      if (!byAngkatan['Manual']) byAngkatan['Manual'] = [];
      if (!byAngkatan['Manual'].find(x => x.nama === n))
        byAngkatan['Manual'].push({ nama: n, kelas: PCK[key].get(n) || '' });
    }
  });
  const sortedKeys = Object.keys(byAngkatan).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g,'')), nb = parseInt(b.replace(/\D/g,''));
    if (!isNaN(na) && !isNaN(nb)) return nb - na;
    if (!isNaN(na)) return -1; if (!isNaN(nb)) return 1;
    return a.localeCompare(b);
  });
  if (!sortedKeys.length) {
    wrap.innerHTML = '<div style="padding:12px;font-size:.78rem;color:var(--gm);text-align:center">Belum ada data anggota</div>';
    updatePckCount(key); return;
  }
  wrap.innerHTML = sortedKeys.map(kat => {
    const members = byAngkatan[kat];
    const clsId   = 'pckcls-' + key + '-' + kat.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9-]/g,'');
    const items   = members.map(({ nama, kelas }) => {
      const checked = PCK[key].has(nama) ? 'checked' : '';
      const safeId  = 'pckchk-' + key + '-' + (Math.abs(Array.from(nama).reduce((h,c)=>Math.imul(31,h)+c.charCodeAt(0)|0,0))).toString(36);
      return '<div class="pck-item">'
        + '<input type="checkbox" id="' + safeId + '" ' + checked
        + ' data-key="' + key + '" data-name="' + esc(nama) + '" onchange="pckToggleEl(this)"/>'
        + '<label for="' + safeId + '">'
        + esc(nama)
        + (kelas ? '<span class="pck-item-kelas">' + esc(kelas) + '</span>' : '')
        + '</label>'
        + '</div>';
    }).join('');
    return '<div class="pck-cls open" id="' + clsId + '">'
      + '<div class="pck-cls-h" onclick="tgPckCls(\'' + clsId + '\')">'
      + '<span>' + kat + '</span>'
      + '<span style="font-size:.67rem;color:var(--gm);font-weight:400;margin-left:4px">(' + members.length + ')</span>'
      + '<span class="pck-cls-chev">▼</span></div>'
      + '<div class="pck-cls-body">' + items + '</div></div>';
  }).join('');
  updatePckCount(key);
}

function pckSearch(key, q) {
  const wrap = document.getElementById('pck-cls-' + key); if (!wrap) return;
  const qLow = q.toLowerCase();
  wrap.querySelectorAll('.pck-item').forEach(item => {
    const lbl = item.querySelector('label')?.textContent || '';
    item.style.display = lbl.toLowerCase().includes(qLow) || !q ? '' : 'none';
  });
  wrap.querySelectorAll('.pck-cls').forEach(cls => {
    const vis = [...cls.querySelectorAll('.pck-item')].some(i => i.style.display !== 'none');
    cls.style.display = vis || !q ? '' : 'none';
    if (q) cls.classList.add('open');
  });
}

function tgPckCls(id) { const el = document.getElementById(id); if (el) el.classList.toggle('open'); }

/* ═══════ BIAYA ═══════ */
function initBR(s) {
  const it=spl(s.item_biaya), es=spl(s.estimasi_biaya_item), ak=spl(s.biaya_aktual);
  BR = it.map((item,i) => ({item:item.trim(), est:es[i]||'', aktual:ak[i]||''}));
  if(!BR.length) BR=[{item:'',est:'',aktual:''}];
  renderBR();
}
function renderBR() {
  document.getElementById('biaya-tbody').innerHTML = BR.map((r,i) =>
    `<tr><td><input type="text" class="fi" value="${esc(r.item)}" oninput="BR[${i}].item=this.value" placeholder="Nama item…"/></td><td><input type="number" class="fi" value="${r.est}" oninput="BR[${i}].est=this.value" placeholder="0"/></td><td><input type="number" class="fi" value="${r.aktual}" oninput="BR[${i}].aktual=this.value" placeholder="0"/></td><td><button class="btn-dr" onclick="BR.splice(${i},1);renderBR()">✕</button></td></tr>`
  ).join('');
}
function addBiayaRow() { BR.push({item:'',est:'',aktual:''}); renderBR(); }
function pasteBiayaSesi(e) {
  const raw = (e.clipboardData||window.clipboardData).getData('text');
  if (!raw || !raw.includes('\n') && !raw.includes('\t')) return;
  e.preventDefault();
  _applyPasteBiayaSesi(raw);
}
function openPasteBiayaSesi() {
  showPasteDialog(
    'Paste Biaya Sesi',
    'Kolom: Item &nbsp;|&nbsp; Estimasi Biaya &nbsp;|&nbsp; Biaya Aktual<br>Contoh: Konsumsi&nbsp;&nbsp;&nbsp;50000&nbsp;&nbsp;&nbsp;48000',
    raw => _applyPasteBiayaSesi(raw)
  );
}
function _applyPasteBiayaSesi(raw) {
  const rows = parsePasteText(raw);
  let added = 0;
  rows.forEach(r => {
    const item = r[0]||'', est = r[1]||'', akt = r[2]||'';
    if (item||est||akt) { BR.push({item, est, aktual: akt}); added++; }
  });
  renderBR();
  toast('📋 '+added+' baris biaya ditempel','success');
}

function getBR() { return {item_biaya:BR.map(r=>r.item).join(','), estimasi_biaya_item:BR.map(r=>r.est).join(','), biaya_aktual:BR.map(r=>r.aktual).join(',')}; }

/* ═══════ JADWAL ═══════ */
function renderJad() {
  const pend = S.jad.filter(j=>j._m||j._n||j._d).length;
  document.getElementById('jadwalBanner').classList.toggle('show',pend>0);
  document.getElementById('jadwalBannerN').textContent = pend;
  const bp = {};
  S.jad.forEach(j => { if(!bp[j.proker_id]) bp[j.proker_id]=[]; bp[j.proker_id].push(j); });
  document.getElementById('jadwalContent').innerHTML = Object.entries(bp).sort(([a],[b])=>a>b?1:-1).map(([id,jads]) => {
    const info = PK[id]||{n:'Proker '+id,i:'📌'};
    const up = jads.filter(j=>!j._d&&j.tanggal>=S.today).length;
    return `<div class="panel"><div class="ph2"><span class="ph2-i">${info.i}</span><span class="ph2-t">#${id} ${info.n}</span><span class="ph2-s">${jads.filter(j=>!j._d).length} jadwal · ${up} upcoming</span><button class="btn-add" style="padding:4px 10px;font-size:.7rem;margin-left:8px" onclick="openNewJadwalModal('${id}')">+</button><button class="btn-ar" style="padding:3px 9px;font-size:.68rem;margin-left:4px" onclick="pasteJadwal('${id}')" title="Paste jadwal dari Excel/Sheets">📋 Paste</button><button class="btn-ar" style="padding:3px 9px;font-size:.68rem;margin-left:4px" onclick="printJadwalProker('${id}')" title="Cetak jadwal proker ini">🖨️ Print</button></div><div class="pb" style="padding:10px 13px"><div class="jchips">${jads.sort((a,b)=>a.tanggal>b.tanggal?1:-1).map(j => {
      const cls = j._d?'del':j._n?'newrow':j._m?'mod':j.tanggal<S.today?'past':'';
      const chipInfo = [j.tanggal, j.jam ? '<span style="opacity:.6">'+j.jam+'</span>' : '', j.penanggung_jawab ? '<span style="opacity:.7;font-size:.82em">👤'+j.penanggung_jawab+'</span>' : '', j.catatan ? '<span style="opacity:.6;font-size:.8em;font-style:italic">📝'+j.catatan+'</span>' : ''].filter(Boolean).join(' ');
      return `<div class="jchip ${cls}"><span onclick="openEditJad(${j._i})" style="cursor:pointer">${chipInfo} ${j._d?'🗑️':j._n?'✨':j._m?'✏️':''}</span>${j._d  ? `<button class="jchip-del" onclick="event.stopPropagation();restJad(${j._i})" title="Batalkan hapus">↩</button>`  : `<button class="jchip-del" onclick="event.stopPropagation();delJad(${j._i})" title="Hapus jadwal">×</button>`}</div>`;
    }).join('')}</div></div></div>`;
  }).join('');
}
function openNewJadwalModal(pid='01') {
  document.getElementById('ej_idx').value='new';
  document.getElementById('jadMT').textContent='Tambah Jadwal';
  document.getElementById('ej_pid').innerHTML=pkOpts(pid);
  document.getElementById('ej_tgl').value=S.today;
  document.getElementById('ej_jam').value='14:00';
  openModal('jadwalModal');
}
function openEditJad(i) {
  const j = S.jad.find(j=>j._i===i); if(!j) return;
  document.getElementById('ej_idx').value=i;
  document.getElementById('jadMT').textContent='Edit Jadwal';
  document.getElementById('ej_pid').innerHTML=pkOpts(j.proker_id);
  document.getElementById('ej_tgl').value=j.tanggal;
  document.getElementById('ej_jam').value=j.jam;
  const elCat = document.getElementById('ej_catatan');
  const elPj  = document.getElementById('ej_pj');
  if(elCat) elCat.value = j.catatan||'';
  if(elPj)  elPj.value  = j.penanggung_jawab||'';
  openModal('jadwalModal');
}
function pasteJadwal(pid){
  // Buka modal paste khusus jadwal
  const raw = prompt(
    'Paste jadwal dari Excel/Sheets/CSV:\n'
    +'Kolom: tanggal (YYYY-MM-DD) | jam (HH:MM)\n'
    +'Contoh:\n2026-03-15\t14:00\n2026-04-05\t09:00'
  );
  if(!raw) return;
  const rows=parsePasteText(raw);
  let added=0;
  rows.forEach(r=>{
    const tgl=(r[0]||'').trim();
    const jam=(r[1]||'14:00').trim();
    // Validasi format tanggal minimal ada angka
    if(!/\d{4}/.test(tgl)) return;
    // Normalisasi: DD/MM/YYYY → YYYY-MM-DD
    let normTgl=tgl;
    const dmy=tgl.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if(dmy) normTgl=dmy[3]+'-'+dmy[2].padStart(2,'0')+'-'+dmy[1].padStart(2,'0');
    const ni=Date.now()+added;
    S.jad.push({proker_id:pid,tanggal:normTgl,jam:jam||'14:00',_i:ni,_m:false,_n:true,_d:false});
    logC('add','jadwal',ni,pid+' '+normTgl);
    added++;
  });
  if(added){ renderAll(); toast('📋 '+added+' jadwal ditambahkan','success'); }
  else toast('Tidak ada jadwal valid yang ditemukan','warning');
}
function saveJadwal() {
  const i  = document.getElementById('ej_idx').value;
  const elCat = document.getElementById('ej_catatan');
  const elPj  = document.getElementById('ej_pj');
  const nd = {
    proker_id:        document.getElementById('ej_pid').value,
    tanggal:          document.getElementById('ej_tgl').value,
    jam:              document.getElementById('ej_jam').value,
    catatan:          elCat ? elCat.value.trim() : '',
    penanggung_jawab: elPj  ? elPj.value.trim()  : '',
  };
  if(i==='new') {
    const ni = Date.now(); S.jad.push({...nd,_i:ni,_m:false,_n:true,_d:false});
    logC('add','jadwal',ni,nd.proker_id+' '+nd.tanggal);
  } else {
    const idx = S.jad.findIndex(j=>j._i===+i);
    if(idx>=0) { S.jad[idx]={...S.jad[idx],...nd,_m:true}; logC('edit','jadwal',+i,nd.proker_id+' '+nd.tanggal); }
  }
  closeModal('jadwalModal'); renderAll(); toast('✅ Jadwal disimpan','success');
}
function delJad(i){
  const idx=S.jad.findIndex(j=>j._i===i); if(idx<0) return;
  if(S.jad[idx]._n) S.jad.splice(idx,1);
  else { S.jad[idx]._d=true; logC('del','jadwal',i,S.jad[idx].tanggal||'Jadwal'); }
  renderAll(); toast('🗑️ Jadwal dihapus','warning');
}
function restJad(i){
  const idx=S.jad.findIndex(j=>j._i===i); if(idx<0) return;
  S.jad[idx]._d=false;
  S.changes=S.changes.filter(c=>!(c.sh==='jadwal'&&c.idx===i&&c.a==='del'));
  renderAll(); toast('↩ Jadwal dipulihkan');
}

/* ═══════ PROKER DETAIL ═══════ */
const BR_DET={};
function initDetBiaya(d){
  const it=spl(d.item_biaya),es=spl(d.estimasi_biaya_item),ak=spl(d.biaya_aktual);
  const len=Math.max(it.length,es.length,ak.length,1);
  BR_DET[d._i]=[];
  for(let i=0;i<len;i++) BR_DET[d._i].push({item:(it[i]||'').trim(),est:es[i]||'',aktual:ak[i]||''});
}
function renderDet(){
  const pend=S.det.filter(d=>d._m).length;
  document.getElementById('detailBanner').classList.toggle('show',pend>0);
  document.getElementById('detailBannerN').textContent=pend;
  document.getElementById('detailContent').innerHTML=[...S.det].sort((a,b)=>a.proker_id>b.proker_id?1:-1).map(d=>{
    const info=PK[d.proker_id]||{n:'Proker '+d.proker_id,i:'📌'};
    if(!d._m) initDetBiaya(d);
    else if(!BR_DET[d._i]) initDetBiaya(d);
    const totalEst=BR_DET[d._i].reduce((a,r)=>a+(parseFloat(r.est)||0),0);
    const totalAkt=BR_DET[d._i].reduce((a,r)=>a+(parseFloat(r.aktual)||0),0);
    const biayaBadge=totalEst>0
      ?'<span style="font-size:.7rem;color:var(--gm);margin-left:auto">Est: <strong style="color:var(--ch)">Rp '+fNum(totalEst)+'</strong>'+(totalAkt>0?' · Aktual: <strong style="color:var(--ok)">Rp '+fNum(totalAkt)+'</strong>':'')+'</span>'
      :'';
    const di=d._i;
    return '<div class="panel" id="det-panel-'+di+'" style="'+(d._m?'border-color:var(--warn)':'')+'">'+'<div class="ph2" style="'+(d._m?'background:linear-gradient(90deg,#FFFBEB,var(--ow));border-bottom-color:#FDE68A':'')+'">'+'<span class="ph2-i">'+info.i+'</span>'+'<span class="ph2-t">#'+d.proker_id+' '+info.n+'</span>'+biayaBadge+(d._m?'<span class="chg chg-m" style="margin-left:6px">Diubah</span>':'')+'</div>'
      +'<div class="pb"><div class="det-g">'
      +'<div class="fg"><div class="fl">Tujuan</div><textarea class="fta" oninput="updDet('+di+',\'tujuan\',this.value)">'+esc(d.tujuan||'')+'</textarea></div>'+'<div class="fg"><div class="fl">Deskripsi Kegiatan</div><textarea class="fta" rows="4" placeholder="Deskripsi singkat kegiatan..." oninput="updDet('+di+',\'deskripsi_kegiatan\',this.value)">'+esc(d.deskripsi_kegiatan||'')+'</textarea></div>'
      +'<div class="fg"><div class="fl">Waktu (teks)</div><input type="text" class="fi" value="'+esc(d.waktu_teks||'')+'" oninput="updDet('+di+',\'waktu_teks\',this.value)"/></div>'
      +'<div class="fg"><div class="fl">Est. Tanggal</div><input type="date" class="fi" value="'+(d.estimasi_tanggal||'')+'" oninput="updDet('+di+',\'estimasi_tanggal\',this.value)"/></div>'
      +'<div class="fg"><div class="fl">Lokasi</div><input type="text" class="fi" value="'+esc(d.lokasi||'')+'" oninput="updDet('+di+',\'lokasi\',this.value)"/></div>'
      +'<div class="fg"><div class="fl">Sasaran</div><input type="text" class="fi" value="'+esc(d.sasaran||'')+'" oninput="updDet('+di+',\'sasaran\',this.value)"/></div>'
      +'</div>'
      +'<div class="fg"><div class="fl">Pemateri</div><input type="text" class="fi" value="'+esc(d.pemateri||'')+'" oninput="updDet('+di+',\'pemateri\',this.value)"/></div>'
      +'<div class="fg"><div class="fl">Panitia</div><input type="text" class="fi" value="'+esc(d.panitia||'')+'" oninput="updDet('+di+',\'panitia\',this.value)"/></div>'
      +'<div class="fg" style="margin-top:4px"><div class="fl">Rincian Biaya <span class="flb">RAB</span></div>'
      +'<table class="btbl" onpaste="pasteDetBiaya(event,'+di+')"><thead><tr><th style="width:40%">Item / Keterangan</th><th style="width:22%">Est. Biaya (Rp)</th><th style="width:22%">Biaya Aktual (Rp)</th><th style="width:16%">Selisih</th><th></th></tr></thead>'
      +'<tbody id="det-biaya-tbody-'+di+'"></tbody><tfoot id="det-biaya-tfoot-'+di+'"></tfoot></table>'
      +'<div style="display:flex;gap:6px">'+'<button class="btn-ar" onclick="addDetBiaya('+di+')">+ Tambah Item</button>'+'<button class="btn-ar" style="color:var(--gm)" title="Paste dari Excel/Sheets: Item | Est. Biaya | Aktual" onclick="openPasteDetBiaya('+di+')">📋 Paste Tabel</button>'+'</div></div>'
      +'</div></div>';
  }).join('')||'<div class="empty"><div class="ei">📌</div><div class="et">Tidak ada data detail proker</div></div>';
  S.det.forEach(d=>{renderDetBiaya(d._i);});
}
function renderDetBiaya(di){
  const tbody=document.getElementById('det-biaya-tbody-'+di);if(!tbody)return;
  if(!BR_DET[di]||!BR_DET[di].length)BR_DET[di]=[{item:'',est:'',aktual:''}];
  tbody.innerHTML=BR_DET[di].map((r,i)=>{
    const est=parseFloat(r.est)||0,akt=parseFloat(r.aktual)||0;
    const sel=est&&akt?akt-est:null;
    const selHtml=sel!==null
      ?'<span style="font-size:.76rem;font-weight:700;color:'+(sel<=0?'var(--ok)':'var(--err)')+'">'+(sel<=0?'':'+')+fNum(sel)+'</span>'
      :'–';
    return'<tr>'      +'<td><input type="text" class="fi" value="'+esc(r.item)+'" oninput="BR_DET['+di+']['+i+'].item=this.value;syncDetBiaya('+di+')" placeholder="Nama item/keterangan…"/></td>'      +'<td><input type="number" class="fi" value="'+r.est+'" oninput="BR_DET['+di+']['+i+'].est=this.value;syncDetBiaya('+di+');renderDetBiaya('+di+')" placeholder="0"/></td>'      +'<td><input type="number" class="fi" value="'+r.aktual+'" oninput="BR_DET['+di+']['+i+'].aktual=this.value;syncDetBiaya('+di+');renderDetBiaya('+di+')" placeholder="0"/></td>'      +'<td style="text-align:center;min-width:70px">'+selHtml+'</td>'      +'<td><button class="btn-dr" onclick="BR_DET['+di+'].splice('+i+',1);renderDetBiaya('+di+');syncDetBiaya('+di+')">✕</button></td>'    +'</tr>';
  }).join('');
  const tfoot=document.getElementById('det-biaya-tfoot-'+di);if(!tfoot)return;
  const rows=BR_DET[di];
  const sumEst=rows.reduce((a,r)=>a+(parseFloat(r.est)||0),0);
  const sumAkt=rows.reduce((a,r)=>a+(parseFloat(r.aktual)||0),0);
  const hasAny=rows.some(r=>r.est||r.aktual);
  if(!hasAny){tfoot.innerHTML='';return;}
  const sumSel=sumAkt-sumEst;
  tfoot.innerHTML='<tr style="background:var(--ow);font-weight:700;font-size:.78rem">'    +'<td style="padding:6px 8px;color:var(--gm)">Total</td>'    +'<td style="padding:6px 4px">Rp '+fNum(sumEst)+'</td>'    +'<td style="padding:6px 4px">Rp '+fNum(sumAkt)+'</td>'    +'<td style="padding:6px 4px;text-align:center"><span style="color:'+(sumSel<=0?'var(--ok)':'var(--err)')+'">'+(sumSel<=0?'':'+')+'Rp '+fNum(Math.abs(sumSel))+'</span></td>'    +'<td></td>'  +'</tr>';
}

function addDetBiaya(di){
  if(!BR_DET[di])BR_DET[di]=[];
  BR_DET[di].push({item:'',est:'',aktual:''});
  renderDetBiaya(di);
  const tbody=document.getElementById('det-biaya-tbody-'+di);
  if(tbody){const inp=tbody.querySelectorAll('input[type=text]');if(inp.length)inp[inp.length-1].focus();}
}
function pasteDetBiaya(e, di){
  const raw=(e.clipboardData||window.clipboardData).getData('text');
  if(!raw||!raw.includes('\n')&&!raw.includes('\t')) return;
  e.preventDefault();
  _applyPasteDetBiaya(raw, di);
}
function openPasteDetBiaya(di){
  showPasteDialog(
    'Paste Biaya Detail Proker',
    'Kolom: Item &nbsp;|&nbsp; Estimasi Biaya &nbsp;|&nbsp; Biaya Aktual<br>Contoh: Konsumsi&nbsp;&nbsp;&nbsp;200000&nbsp;&nbsp;&nbsp;195000',
    raw => _applyPasteDetBiaya(raw, di)
  );
}
function _applyPasteDetBiaya(raw, di){
  if(!BR_DET[di])BR_DET[di]=[];
  const rows=parsePasteText(raw);
  let added=0;
  rows.forEach(r=>{
    const item=r[0]||'',est=r[1]||'',akt=r[2]||'';
    if(item||est||akt){ BR_DET[di].push({item,est,aktual:akt}); added++; }
  });
  syncDetBiaya(di); renderDetBiaya(di);
  toast('📋 '+added+' baris biaya ditempel','success');
}

function syncDetBiaya(di){
  const idx=S.det.findIndex(d=>d._i===di);if(idx<0)return;
  S.det[idx].item_biaya=BR_DET[di].map(r=>r.item).join(',');
  S.det[idx].estimasi_biaya_item=BR_DET[di].map(r=>r.est).join(',');
  S.det[idx].biaya_aktual=BR_DET[di].map(r=>r.aktual).join(',');
  markDetMod(di);
}

function markDetMod(di){
  const idx=S.det.findIndex(d=>d._i===di);if(idx<0)return;
  if(!S.det[idx]._m){S.det[idx]._m=true;logC('edit','proker_detail',di,'Detail '+S.det[idx].proker_id);}
  updateBadges();
  document.getElementById('detailBanner').classList.add('show');
  document.getElementById('detailBannerN').textContent=S.det.filter(d=>d._m).length;
  const panel=document.getElementById('det-panel-'+di);
  if(panel){panel.style.borderColor='var(--warn)';const h=panel.querySelector('.ph2');if(h)h.style.cssText='background:linear-gradient(90deg,#FFFBEB,var(--ow));border-bottom-color:#FDE68A';}
}

function updDet(i,k,v){const idx=S.det.findIndex(d=>d._i===i);if(idx>=0){S.det[idx][k]=v;markDetMod(i);}}

/* ═══════ NOTIF CONFIG ═══════ */
function renderNotif() {
  const pend = S.notif.filter(d=>d._m).length;
  document.getElementById('notifBanner').classList.toggle('show',pend>0);
  document.getElementById('notifBannerN').textContent = pend;
  document.getElementById('notifTbody').innerHTML = S.notif.map(n => {
    const info = PK[n.proker_id]||{n:'#'+n.proker_id,i:'📌'};
    const ck = v => (v==='true'||v===true) ? 'checked' : '';
    return `<tr style="${n._m?'background:#FFFBEB':''}">
      <td><strong>${info.i} ${n.proker_id}</strong><br><span style="font-size:.68rem;color:var(--gm)">${info.n}</span></td>
      <td><input type="checkbox" class="tsw" ${ck(n.countdown_aktif)} onchange="updNotif(${n._i},'countdown_aktif',this.checked?'true':'false')"/></td>
      <td><input type="checkbox" class="tsw" ${ck(n.ajakan)} onchange="updNotif(${n._i},'ajakan',this.checked?'true':'false')"/></td>
      <td><input type="text" class="fi" value="${esc(n.ajakan_teks||'')}" oninput="updNotif(${n._i},'ajakan_teks',this.value)" style="min-width:175px"/></td>
      <td><input type="text" class="fi" value="${esc(n.ajakan_sub||'')}" oninput="updNotif(${n._i},'ajakan_sub',this.value)" style="min-width:175px"/></td>
      <td><input type="checkbox" class="tsw" ${ck(n.wajib_hadir)} onchange="updNotif(${n._i},'wajib_hadir',this.checked?'true':'false')"/></td>
      <td><input type="text" class="fi" value="${esc(n.wajib_hadir_teks||'')}" oninput="updNotif(${n._i},'wajib_hadir_teks',this.value)" style="min-width:130px"/></td>
      <td><input type="text" class="fi" value="${esc(n.wajib_hadir_sanksi||'')}" oninput="updNotif(${n._i},'wajib_hadir_sanksi',this.value)" style="min-width:175px"/></td>
    </tr>`;
  }).join('');
}
function updNotif(i, k, v) {
  const idx = S.notif.findIndex(d=>d._i===i);
  if(idx>=0) { S.notif[idx][k]=v; if(!S.notif[idx]._m){S.notif[idx]._m=true; logC('edit','notif_config',i,'Notif #'+S.notif[idx].proker_id);} }
  updateBadges();
  document.getElementById('notifBanner').classList.add('show');
  document.getElementById('notifBannerN').textContent = S.notif.filter(d=>d._m).length;
}

/* ═══════ ANGGOTA ═══════ */
function renderAng() {
  const pend = S.ang.filter(a=>a._m||a._n||a._d).length;
  document.getElementById('anggotaBanner').classList.toggle('show',pend>0);
  document.getElementById('anggotaBannerN').textContent = pend;
  const F = ['nama','kelas','angkatan','status','no_hp','catatan'];
  document.getElementById('anggotaTbody').innerHTML = S.ang.map(a => {
    const cls = a._d?'del':a._n?'newrow':a._m?'mod':'';
    return `<tr class="${cls}">${F.map(f =>
      `<td><input type="${f==='no_hp'?'tel':'text'}" class="fi" value="${esc(a[f]||'')}" oninput="updAng(${a._i},'${f}',this.value)" style="min-width:${f==='nama'?115:f==='catatan'?155:75}px"/></td>`
    ).join('')}<td style="white-space:nowrap">${a._d
      ? `<button class="btn-add" style="padding:3px 9px;font-size:.68rem" onclick="restAng(${a._i})">↩</button>`
      : `<button class="btn-del" onclick="delAng(${a._i})">🗑️</button>
         <button class="btn-ar" style="padding:3px 7px;font-size:.68rem;margin-left:3px" title="Cetak laporan kehadiran" onclick="printLaporanSatuAnggota(${a._i})">🖨️</button>`
    }</td></tr>`;
  }).join('');
}
function updAng(i, k, v) {
  const idx = S.ang.findIndex(a=>a._i===i);
  if(idx>=0) { S.ang[idx][k]=v; if(!S.ang[idx]._n&&!S.ang[idx]._m){S.ang[idx]._m=true; logC('edit','anggota',i,S.ang[idx].nama||'Anggota');} }
  updateBadges();
  document.getElementById('anggotaBanner').classList.add('show');
  document.getElementById('anggotaBannerN').textContent = S.ang.filter(a=>a._m||a._n||a._d).length;
}
function pasteAnggota(e){
  const raw=(e.clipboardData||window.clipboardData).getData('text');
  if(!raw||(!raw.includes('\n')&&!raw.includes('\t'))) return;
  e.preventDefault();
  _applyPasteAnggota(raw);
}
function openPasteAnggota(){
  showPasteDialog(
    'Paste Data Anggota',
    'Kolom: Nama &nbsp;|&nbsp; Kelas &nbsp;|&nbsp; Angkatan &nbsp;|&nbsp; Status &nbsp;|&nbsp; No HP &nbsp;|&nbsp; Catatan<br>Kolom wajib: Nama. Kolom lain opsional.',
    raw => _applyPasteAnggota(raw)
  );
}
function _applyPasteAnggota(raw){
  const rows=parsePasteText(raw);
  const F=['nama','kelas','angkatan','status','no_hp','catatan'];
  let added=0;
  rows.forEach(r=>{
    if(!r[0]) return;
    const ni=Date.now()+added;
    const obj={_i:ni,_n:true,_m:false,_d:false};
    F.forEach((f,i)=>{ obj[f]=r[i]||''; });
    S.ang.push(obj);
    logC('add','anggota',ni,obj.nama||'Anggota baru');
    added++;
  });
  if(added){ renderAll(); toast('📋 '+added+' anggota ditambahkan','success'); }
}
function addAnggotaRow() {
  const ni = Date.now();
  S.ang.push({nama:'',kelas:'',angkatan:'',status:'',no_hp:'',catatan:'',_i:ni,_n:true,_m:false,_d:false});
  logC('add','anggota',ni,'Anggota baru'); renderAll();
}
function delAng(i) {
  const idx = S.ang.findIndex(a=>a._i===i);
  if(idx>=0) {
    if(S.ang[idx]._n) S.ang.splice(idx,1);
    else { S.ang[idx]._d=true; logC('del','anggota',i,S.ang[idx].nama||'Anggota'); }
  }
  renderAll(); toast('🗑️ Ditandai untuk dihapus','warning');
}
function restAng(i) {
  const idx = S.ang.findIndex(a=>a._i===i);
  if(idx>=0) { S.ang[idx]._d=false; S.changes=S.changes.filter(c=>!(c.sh==='anggota'&&c.idx===i&&c.a==='del')); }
  renderAll(); toast('↩ Dipulihkan');
}

/* ═══════ PENGURUS ═══════ */
function renderPeng() {
  const pend = S.peng.filter(p=>p._m).length;
  document.getElementById('pengurusBanner').classList.toggle('show', pend>0);
  document.getElementById('pengurusBannerN').textContent = pend;
  document.getElementById('pengurusGrid').innerHTML = S.peng.map(p => {
    const th = exPhoto(p.photo || p['link photo'] || p.foto_url || '');
    const pHtml = th
      ? `<img src="${th}" onerror="this.style.display='none';this.nextSibling.style.display='flex'" loading="lazy"/><div class="peng-plc" style="display:none">${p.icon||'👤'}</div>`
      : `<div class="peng-plc">${p.icon||'👤'}</div>`;
    const modStyle = p._m ? 'border-color:var(--warn)' : '';
    return `<div class="peng-card" style="${modStyle}">
      <div class="peng-ph">${pHtml}</div>
      <div class="peng-bd">
        <div class="peng-pill">${p.jabatan_level||''}</div>
        <div class="peng-nm">${p.nama||'–'}</div>
        <div class="peng-kl">Kelas ${p.kelas||'–'}</div>
        <div style="font-size:.68rem;color:var(--gm);line-height:1.4;margin-bottom:8px">${p.deskripsi_jabatan||p.jabatan||''}</div>
        ${p._m?'<span class="chg chg-m" style="margin-bottom:6px;display:inline-block">Diubah</span>':''}
        <button class="btn-esm" onclick="openPengModal(${p._i})">✏️ Edit</button>
      </div>
    </div>`;
  }).join('') || '<div class="empty"><div class="ei">👤</div><div class="et">Tidak ada data pengurus</div></div>';
}

function openPengModal(i) {
  const p = S.peng.find(x=>x._i===i); if(!p) return;
  document.getElementById('ep_idx').value = i;
  document.getElementById('ep_level').value = p.jabatan_level||'';
  document.getElementById('ep_jabatan').value = p.jabatan||'';
  document.getElementById('ep_nama').value = p.nama||'';
  document.getElementById('ep_kelas').value = p.kelas||'';
  document.getElementById('ep_foto').value = p['link photo']||p.foto_url||p.photo||'';
  document.getElementById('ep_desc').value = p.deskripsi_jabatan||'';
  openModal('pengurusModal');
}
function savePengurus() {
  const i = +document.getElementById('ep_idx').value;
  const idx = S.peng.findIndex(x=>x._i===i); if(idx<0) return;
  const fotoRaw = document.getElementById('ep_foto').value.trim();
  const fotoThumb = exPhoto(fotoRaw);
  S.peng[idx] = {
    ...S.peng[idx],
    jabatan_level: document.getElementById('ep_level').value,
    jabatan:       document.getElementById('ep_jabatan').value,
    nama:          document.getElementById('ep_nama').value,
    kelas:         document.getElementById('ep_kelas').value,
    'link photo':  fotoRaw,
    foto_url:      fotoThumb,
    photo:         fotoThumb,
    deskripsi_jabatan: document.getElementById('ep_desc').value,
    _m: true
  };
  if(!S.changes.find(c=>c.sh==='pengurus'&&c.idx===i))
    logC('edit','pengurus',i,S.peng[idx].nama||'Pengurus');
  closeModal('pengurusModal'); renderAll(); toast('✅ Pengurus disimpan','success');
}

/* ═══════ BADGES & LOG ═══════ */
function updateBadges() {
  const dokN  = S.dok.filter(d=>d._m||d._n||d._d).length;
  const jadN  = S.jad.filter(j=>j._m||j._n||j._d).length;
  const detN  = S.det.filter(d=>d._m).length;
  const notN  = S.notif.filter(d=>d._m).length;
  const angN  = S.ang.filter(a=>a._m||a._n||a._d).length;
  const pengN = S.peng.filter(p=>p._m).length;
  const pgmN  = S.pgm ? S.pgm.filter(p=>p._m||p._n||p._d).length : 0;
  document.getElementById('badge-dokumentasi').textContent = dokN;
  document.getElementById('badge-jadwal').textContent      = jadN;
  document.getElementById('badge-detail').textContent      = detN;
  document.getElementById('badge-notif').textContent       = notN;
  document.getElementById('badge-anggota').textContent     = angN;
  document.getElementById('badge-pengurus').textContent    = pengN;
  const pgmBadgeEl = document.getElementById('badge-pengumuman');
  if (pgmBadgeEl) pgmBadgeEl.textContent = pgmN;
  const capN       = S.cap ? S.cap.filter(c=>c._m||c._n||c._d).length : 0;
  const capBadgeEl = document.getElementById('badge-pencapaian');
  if (capBadgeEl) capBadgeEl.textContent = capN;
  document.getElementById('badge-changelog').textContent   = S.changes.length;
  document.getElementById('st-changes').textContent        = S.changes.length;
  document.getElementById('btnUpload').disabled = S.changes.length === 0;
}

function logC(a, sh, idx, lbl) {
  S.changes = S.changes.filter(c => !(c.idx===idx && c.sh===sh && c.a!=='del'));
  S.changes.push({a, sh, idx, lbl, t: new Date().toLocaleTimeString('id',{hour:'2-digit',minute:'2-digit'})});
  renderChangelog(); updateBadges();
}

function renderChangelog() {
  const el = document.getElementById('changelogContent');
  if(!S.changes.length) {
    el.innerHTML='<div class="empty"><div class="ei">✅</div><div class="et">Tidak ada perubahan</div><div class="ed">Semua tersinkron</div></div>';
    return;
  }
  const ic  = {add:'➕',edit:'✏️',del:'🗑️',upload:'☁️'};
  const shl = {dokumentasi:'📋 Dokumentasi',jadwal:'📅 Jadwal',proker_detail:'📌 Detail',notif_config:'🔔 Notif',anggota:'👥 Anggota',pengurus:'🎌 Pengurus'};
  el.innerHTML = '<div class="clog">' + [...S.changes].reverse().map(c =>
    `<div class="cl-i ${c.a==='add'?'add':c.a==='edit'?'edit':c.a==='del'?'del':'upload'}"><span>${ic[c.a]||'?'}</span><div><div class="cl-lb">${c.lbl}</div><div class="cl-sub">${shl[c.sh]||c.sh}</div></div><span class="cl-t">${c.t}</span></div>`
  ).join('') + '</div>';
}

/* ═══════════════════════════════════════════════════════════
   UPLOAD — DELTA APPEND + DEDUP
   Strategi baru:
   • Penghapusan  → set delete_flag=TRUE di state, baris tetap ada
   • Edit / Tambah → append baris baru ke sheet (baris lama tetap)
   • GAS action 'dedup' → hapus rows dengan delete_flag=TRUE
     dan duplikat id (sisakan baris terbawah = terbaru)
   • Silent reload setelah selesai
══════════════════════════════════════════════════════════ */
function handleUpload() {
  if(!S.changes.length) { toast('Tidak ada perubahan','warning'); return; }
  const sheets = [...new Set(S.changes.map(c => c.sh))];
  const label  = {
    dokumentasi:   '📋 Dokumentasi Sesi (proker_dokumentasi)',
    jadwal:        '📅 Jadwal Proker (proker_jadwal)',
    proker_detail: '📌 Detail Proker (proker_detail)',
    notif_config:  '🔔 Notif Config (proker_notif_config)',
    anggota:       '👥 Anggota (anggota)',
    pengurus:      '🎌 Pengurus (pengurus)',
  };
  document.getElementById('upSummary').innerHTML =
    `<div style="font-weight:700;margin-bottom:8px">Sheet yang akan diperbarui:</div>` +
    sheets.map(s => `<div style="padding:3px 0">• <strong>${label[s]||s}</strong></div>`).join('') +
    `<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--gl);color:var(--gm);font-size:.73rem">ℹ️ Hanya baris yang berubah yang dikirim. Sheet lain tidak terpengaruh.</div>`;
  openModal('uploadModal');
}

/* ═══════ LOCK HELPERS ═══════ */

/** Baca satu baris dari upload_confirm via API_WRITE (bukan read-only) */
async function fetchLockRow() {
  return new Promise((res, rej) => {
    const cb = '__jcb_lk_' + Date.now();
    const tid = setTimeout(() => { cl(); rej(new Error('Timeout')); }, 15000);
    function cl() { delete window[cb]; document.getElementById(cb)?.remove(); }
    window[cb] = d => { clearTimeout(tid); cl(); d.status === 'ok' ? res(d.data) : rej(new Error(d.message)); };
    const qs = 'sheet=' + encodeURIComponent(LOCK_SHEET) + '&action=read&token='
      + encodeURIComponent(WRITE_TOKEN) + '&callback=' + encodeURIComponent(cb);
    const sc = document.createElement('script'); sc.id = cb;
    sc.src = API_WRITE + '?' + qs;
    sc.onerror = () => { clearTimeout(tid); cl(); rej(new Error('Script load error')); };
    document.head.appendChild(sc);
  }).then(rows => (rows && rows.length > 0) ? rows[0] : null);
}

/** Tulis baris fresh ke upload_confirm */
async function setLockRow(version, status, lockedBy, lockExpires) {
  const headers = ['version','status','locked_by','lock_expires'];
  const rows    = [[version, status, lockedBy || '', lockExpires || '']];
  return jsonp({
    sheet:   LOCK_SHEET,
    action:  'replaceAll',
    payload: JSON.stringify({ headers, rows })
  });
}

/** Tunggu lock bebas — polling tiap 5 detik, max 10 kali (50 detik) */
async function waitForLockFree(step) {
  const MAX_WAIT = 10;
  for (let i = 0; i < MAX_WAIT; i++) {
    const row = await fetchLockRow();
    if (!row) return true;
    const isUploading = row.status === 'uploading';
    const isStale     = row.lock_expires && Date.now() > new Date(row.lock_expires).getTime();
    if (!isUploading || isStale) return true;
    const sisa = MAX_WAIT - i - 1;
    if (step) step(`⏳ Pengguna lain sedang mengupload, menunggu… (${sisa * 5}d lagi)`);
    toast(`⏳ Pengguna lain sedang upload. Menunggu 5 detik…`, 'warning');
    await new Promise(r => setTimeout(r, 5000));
  }
  return false;
}

/* ═══════════════════════════════════════════════════════════════
   MERGE HELPER — dipakai saat deteksi konflik versi
================================================================ */
async function fetchAndMerge(sheets, onStep) {
  const shMap = {
    dokumentasi:   { gas: 'proker_dokumentasi', key: 'dok'   },
    jadwal:        { gas: 'proker_jadwal',       key: 'jad'   },
    proker_detail: { gas: 'proker_detail',       key: 'det'   },
    pencapaian:    { gas: 'pencapaian',           key: 'cap'   },
    pengumuman:    { gas: 'pengumuman',           key: 'pgm'   },
    notif_config:  { gas: 'proker_notif_config', key: 'notif' },
    anggota:       { gas: 'anggota',             key: 'ang'   },
    pengurus:      { gas: 'pengurus',            key: 'peng'  },
  };

  for (const sh of sheets) {
    const info = shMap[sh];
    if (!info) continue;
    if (onStep) onStep('Sinkronisasi data terbaru: ' + sh + '…');

    let remoteRows = [];
    try {
      remoteRows = (await readSh(info.gas)).filter(d => d.delete_flag !== 'TRUE');
    } catch(e) {
      console.warn('[MERGE] Gagal fetch ' + sh + ', skip merge:', e.message);
      continue;
    }

    const local = S[info.key];
    const touchedIdx = new Set(local.filter(r => r._m || r._n || r._d).map(r => r._i));

    if (touchedIdx.size === 0) {
      S[info.key] = remoteRows.map((r, i) => ({...r, _i: i, _m: false, _n: false, _d: false}));
      continue;
    }

    const newRows = [];
    remoteRows.forEach((remoteR, pos) => {
      const localMatch = local.find(l => l._i === pos);
      if (!localMatch) {
        newRows.push({ ...remoteR, _i: pos, _m: false, _n: false, _d: false });
      } else if (touchedIdx.has(localMatch._i)) {
        newRows.push(localMatch);
      } else {
        newRows.push({ ...remoteR, _i: pos, _m: false, _n: false, _d: false });
      }
    });
    local.filter(l => l._n).forEach(newRow => {
      if (!newRows.find(r => r._i === newRow._i)) newRows.push(newRow);
    });

    S[info.key] = newRows;
    console.log('[MERGE] ' + sh + ': ' + remoteRows.length + ' remote, '
      + touchedIdx.size + ' lokal disentuh → ' + newRows.length + ' hasil merge');
  }
}

/* ═══════ UPLOAD OVERLAY — sakura naik diagonal ═══════ */
(function initUploadSakura() {
  // Keyframe inject sekali
  if (!document.getElementById('ulov-sakura-style')) {
    const ss = document.createElement('style');
    ss.id = 'ulov-sakura-style';
    // Animasi didefine di CSS (sakuraRise) — inject CSS vars per petal via JS
    document.head.appendChild(ss);
  }
})();

function spawnUploadPetal() {
  const container = document.getElementById('ulovSakura');
  if (!container) return;
  const ulov = document.getElementById('ulov');
  if (!ulov || !ulov.classList.contains('show')) return;

  const W = window.innerWidth, H = window.innerHeight;
  const sz     = 4 + Math.random() * 9;
  const alpha  = .25 + Math.random() * .4;
  const radius = Math.random() > .5 ? '50% 0 50% 0' : '0 50% 0 50%';

  // Spawn dari 3 sisi agar merata termasuk pojok kiri atas
  const side = Math.random();
  let x, y, vx, vy;
  if (side < 0.6) {
    x  = Math.random() * (W + 100) - 50;
    y  = H + sz;
    vx = 60  + Math.random() * 100;
    vy = -(120 + Math.random() * 100);
  } else if (side < 0.8) {
    x  = -sz;
    y  = H * (0.2 + Math.random() * 0.8);
    vx = 80  + Math.random() * 100;
    vy = -(100 + Math.random() * 120);
  } else {
    x  = W * (0.5 + Math.random() * 0.6);
    y  = H + sz;
    vx = 40  + Math.random() * 70;
    vy = -(130 + Math.random() * 90);
  }

  const wobbleAmp   = 18 + Math.random() * 28;
  const wobbleFreq  = .8  + Math.random() * 1.4;
  const wobblePhase = Math.random() * Math.PI * 2;
  let   angle       = Math.random() * 360;
  const spinSpeed   = (140 + Math.random() * 200) * (Math.random() > .5 ? 1 : -1);
  const spinAccel   = (Math.random() * 60 - 30);
  let   opacity     = 0;

  const totalDur = 3500 + Math.random() * 4000;
  const startTs  = performance.now();
  let   lastTs   = startTs;
  let   curSpin  = spinSpeed;

  const el = document.createElement('div');
  el.style.cssText = [
    'position:absolute',
    'width:'  + sz + 'px',
    'height:' + sz + 'px',
    'background:rgba(255,180,210,' + alpha + ')',
    'border-radius:' + radius,
    'pointer-events:none',
    'z-index:2',
    'will-change:transform',
    'left:0', 'top:0',
  ].join(';');
  container.appendChild(el);

  function frame(ts) {
    const elapsed = ts - startTs;
    const dt      = Math.min((ts - lastTs) / 1000, .05);
    lastTs = ts;
    if (!ulov.classList.contains('show') || elapsed > totalDur) { el.remove(); return; }

    const t      = elapsed / 1000;
    const wobble = Math.sin(wobbleFreq * t * Math.PI * 2 + wobblePhase) * wobbleAmp;
    x += (vx + wobble * .05) * dt;
    y += vy * dt;
    curSpin += spinAccel * dt;
    angle   += curSpin * dt;

    if (elapsed < 200)               opacity = elapsed / 200;
    else if (elapsed > totalDur-300) opacity = Math.max(0, (totalDur - elapsed) / 300);
    else                             opacity = 1;

    el.style.opacity   = opacity;
    el.style.transform = 'translate(' + (x - sz/2) + 'px,' + (y - sz/2) + 'px) rotate(' + angle + 'deg)';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

let _ulovPetalInterval = null;

function showUploadOverlay(msg) {
  const ol = document.getElementById('ulov');
  const st = document.getElementById('ulovStep');
  if (!ol) return;
  if (st && msg) st.textContent = msg;
  ol.classList.add('show');

  // Spawn awal langsung
  for (let i = 0; i < 12; i++) setTimeout(spawnUploadPetal, i * 120);
  // Interval berkelanjutan
  _ulovPetalInterval = setInterval(spawnUploadPetal, 350);
}

function hideUploadOverlay() {
  const ol = document.getElementById('ulov');
  if (ol) ol.classList.remove('show');
  if (_ulovPetalInterval) { clearInterval(_ulovPetalInterval); _ulovPetalInterval = null; }
}

function setUploadStep(msg) {
  const st = document.getElementById('ulovStep');
  if (st) st.textContent = msg;
}

async function confirmUpload() {
  closeModal('uploadModal');
  const btn  = document.getElementById('btnCU'); btn.disabled = true;
  const prog = document.getElementById('upProgress');
  const bar  = document.getElementById('upBar');
  const step = document.getElementById('upStep');
  prog.classList.add('show'); bar.style.width = '0%';
  setS('loading', 'Memeriksa…');

  // Tampilkan overlay loading upload
  showUploadOverlay('Mempersiapkan upload…');

  const sheets = [...new Set(S.changes.map(c => c.sh))];

  /* ── LANGKAH 1: Cek dan tunggu lock ── */
  step.textContent = 'Memeriksa lock…';
  let lockRow = null;
  try { lockRow = await fetchLockRow(); } catch(e) { /* degraded mode */ }

  const isLocked = lockRow && lockRow.status === 'uploading'
    && lockRow.lock_expires
    && Date.now() < new Date(lockRow.lock_expires).getTime();

  if (isLocked) {
    step.textContent = '⏳ Menunggu giliran upload…';
    let canProceed = false;
    try {
      canProceed = await waitForLockFree(msg => { step.textContent = msg; });
    } catch(e) { canProceed = true; }

    if (!canProceed) {
      prog.classList.remove('show'); btn.disabled = false;
      setS('error', 'Timeout lock');
      toast('❌ Upload lain tidak kunjung selesai. Coba lagi nanti.', 'error');
      return;
    }
    try { lockRow = await fetchLockRow(); } catch(e) {}
  }

  /* ── LANGKAH 2: Ambil lock ── */
  step.textContent = 'Mengambil giliran…';
  const newVersion  = new Date().toLocaleString('id-ID');
  const lockExpires = new Date(Date.now() + LOCK_TTL_MS).toISOString();
  try {
    await setLockRow(newVersion, 'uploading', SESSION_ID, lockExpires);
  } catch(e) { console.warn('[LOCK] Gagal set lock:', e.message); }

  /* ── LANGKAH 3: Merge jika versi berbeda ── */
  const currentRemoteVersion = lockRow ? lockRow.version : null;
  const needsMerge = currentRemoteVersion && _localVersion
    && currentRemoteVersion !== _localVersion;

  if (needsMerge) {
    step.textContent = 'Menggabungkan data…';
    bar.style.width = '10%';
    try {
      await fetchAndMerge(sheets, msg => { step.textContent = msg; });
      toast('🔀 Data digabungkan dengan versi terbaru', 'warning');
    } catch(e) { console.warn('[MERGE] Gagal merge:', e.message); }
  }

  /* ── LANGKAH 4: Kirim delta ke sheet ── */
  setS('loading', 'Mengupload…');
  let ok = 0, fail = 0;

  for (let si = 0; si < sheets.length; si++) {
    const sh = sheets[si];
    step.textContent = 'Mengupload ' + sh + ' (' + (si+1) + '/' + sheets.length + ')…';
    bar.style.width  = Math.round(10 + (si / sheets.length) * 75) + '%';
    try {
      await uploadShDelta(sh, (msg) => { step.textContent = msg; setUploadStep(msg); });
      ok++;
    } catch(e) {
      fail++;
      toast('❌ Gagal ' + sh + ': ' + e.message, 'error');
      console.error(sh, e);
    }
  }

  /* ── LANGKAH 5: Dedup semua sheet yang diupload ── */
  if (!fail) {
    for (let si = 0; si < sheets.length; si++) {
      const sh  = sheets[si];
      const gas = _shToGas(sh);
      if (!gas || sh === 'pengurus') continue;
      step.textContent = 'Membersihkan duplikat: ' + sh + '…';
      bar.style.width  = Math.round(85 + (si / sheets.length) * 10) + '%';
      try {
        await jsonp({ sheet: gas, action: 'dedup' });
      } catch(e) { console.warn('[DEDUP] ' + sh + ':', e.message); }
    }
  }

  bar.style.width = '100%';

  /* ── LANGKAH 6: Lepas lock ── */
  try {
    await setLockRow(newVersion, 'free', '', '');
    _localVersion = newVersion;
  } catch(e) {
    console.warn('[LOCK] Gagal release lock:', e.message);
    try { await setLockRow(_localVersion || newVersion, 'free', '', ''); } catch(_) {}
  }

  step.textContent = ok + ' berhasil' + (fail > 0 ? ', ' + fail + ' gagal' : '') + '!';
  setTimeout(() => prog.classList.remove('show'), 2000);

  if (!fail) {
    S.dok.forEach(d=>{d._m=false;d._n=false;}); S.dok=S.dok.filter(d=>!d._d);
    S.jad.forEach(j=>{j._m=false;j._n=false;}); S.jad=S.jad.filter(j=>!j._d);
    S.det.forEach(d=>d._m=false); Object.keys(BR_DET).forEach(k=>delete BR_DET[k]);
    S.notif.forEach(d=>d._m=false);
    S.ang.forEach(a=>{a._m=false;a._n=false;}); S.ang=S.ang.filter(a=>!a._d);
    S.peng.forEach(p=>p._m=false);
    if(S.pgm){S.pgm.forEach(p=>{p._m=false;p._n=false;});S.pgm=S.pgm.filter(p=>!p._d);}
    if(S.cap){S.cap.forEach(c=>{c._m=false;c._n=false;});S.cap=S.cap.filter(c=>!c._d);}
    S.changes = [];
    setS('ok', 'Tersinkron ✓');
    setUploadStep('✅ Upload selesai!');
    setTimeout(() => hideUploadOverlay(), 800);
    toast('🎉 Upload berhasil!', 'success');
    renderAll(); renderChangelog();
    setTimeout(() => silentReload(), 3000); // beri GAS waktu proses sebelum re-fetch
  } else {
    try { await setLockRow(_localVersion || newVersion, 'free', '', ''); } catch(_) {}
    setS('error', 'Sebagian gagal');
    hideUploadOverlay();
    toast('⚠️ ' + ok + ' berhasil, ' + fail + ' gagal', 'error');
  }
  btn.disabled = false;
}

/** Konversi nama sheet internal ke nama sheet GAS */
function _shToGas(sh) {
  return {
    dokumentasi:   'proker_dokumentasi',
    jadwal:        'proker_jadwal',
    proker_detail: 'proker_detail',
    pencapaian:    'pencapaian',
    pengumuman:    'pengumuman',
    notif_config:  'proker_notif_config',
    anggota:       'anggota',
    pengurus:      'pengurus',
  }[sh] || null;
}

/**
 * uploadShDelta — kirim hanya baris yang berubah (delta).
 *
 * Logika per jenis perubahan:
 *   _d = true  → append baris dengan delete_flag='TRUE' (tandai mati di sheet)
 *   _n = true  → append baris baru
 *   _m = true  → append baris dengan data terbaru (baris lama di-dedup oleh GAS)
 *
 * GAS action 'dedup' kemudian:
 *   1. Hapus semua baris ber-delete_flag=TRUE
 *   2. Dari sisa baris ber-id sama, hapus semua kecuali yang paling bawah (terbaru)
 */
async function uploadShDelta(sh, onStep) {
  const gas = _shToGas(sh);
  if (!gas) throw new Error('Unknown sheet: ' + sh);

  const hdr = SH[gas];
  const shLabel = { dokumentasi:'Dokumentasi', jadwal:'Jadwal', proker_detail:'Detail Proker', notif_config:'Notif Config', anggota:'Anggota', pengurus:'Pengurus', pencapaian:'Pencapaian', pengumuman:'Pengumuman' };
  const lbl = shLabel[sh] || sh;

  if (sh === 'pengurus') {
    // Pengurus tidak pakai sistem delta — tetap replaceAll
    const rows = S.peng.map(obj => hdr.map(h => obj[h] != null ? String(obj[h]) : ''));
    const fullJson = JSON.stringify({ headers: hdr, rows });
    if (onStep) onStep('Upload ' + lbl + '…');
    await jsonp({ sheet: gas, action: 'replaceAll', payload: fullJson });
    return;
  }

  let srcArr;
  if      (sh==='dokumentasi')   srcArr = S.dok;
  else if (sh==='jadwal')        srcArr = S.jad;
  else if (sh==='proker_detail') srcArr = S.det;
  else if (sh==='notif_config')  srcArr = S.notif;
  else if (sh==='anggota')       srcArr = S.ang;
  else if (sh==='pencapaian')    srcArr = S.cap;
  else if (sh==='pengumuman')    srcArr = S.pgm;
  else throw new Error('Unknown sheet: ' + sh);

  // Hanya baris yang benar-benar berubah
  const changed = srcArr.filter(r => r._m || r._n || r._d);
  if (!changed.length) return;

  // Bangun baris delta — inject id dan delete_flag
  const deltaRows = changed.map(obj => {
    const rowId = makeRowId(gas, obj);
    return hdr.map(h => {
      if (h === 'id')          return rowId;
      if (h === 'delete_flag') return obj._d ? 'TRUE' : '';
      return obj[h] != null ? String(obj[h]) : '';
    });
  });

  if (onStep) onStep('Append delta ' + lbl + ' (' + deltaRows.length + ' baris)…');

  // Chunking agar URL tidak terlalu panjang
  const sample = encodeURIComponent(JSON.stringify({ headers: hdr, rows: [deltaRows[0]] })).length;
  const cs = Math.max(1, Math.floor(3200 / sample));

  for (let i = 0; i < deltaRows.length; i += cs) {
    const chunk = deltaRows.slice(i, i + cs);
    const objRows = chunk.map(r => { const o = {}; hdr.forEach((h, j) => { o[h] = r[j] || ''; }); return o; });
    await jsonp({ sheet: gas, action: 'insert', payload: JSON.stringify({ rows: objRows }) });
  }
}

/* ═══════ PASTE PARSER (Excel / CSV / Google Sheets) ═══════
   Terima teks tab-separated (Excel/Sheets) atau comma-separated (CSV)
   Kembalikan array of arrays (rows x cols)
*/
function parsePasteText(raw) {
  if (!raw || !raw.trim()) return [];
  const lines = raw.trim().split(/\r?\n/);
  return lines.map(line => {
    // Deteksi delimiter: tab (Excel/Sheets) lebih prioritas dari koma (CSV)
    const delim = line.includes('\t') ? '\t' : ',';
    if (delim === ',') {
      // CSV: perlu handle quoted fields dengan koma di dalamnya
      const cols = []; let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      cols.push(cur.trim());
      return cols;
    }
    return line.split('\t').map(c => c.trim().replace(/^"|"$/g, ''));
  }).filter(row => row.some(c => c !== ''));
}

/* ═══════ PASTE DIALOG ═══════
   Tampilkan modal textarea agar user bisa paste dari Excel/Sheets/CSV
   onConfirm(rawText) dipanggil saat klik Proses
*/
function showPasteDialog(title, hint, onConfirm) {
  // Hapus dialog lama jika ada
  const old = document.getElementById('pasteDialog');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pasteDialog';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(30,26,46,.55);'
    + 'backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px';

  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;padding:22px;width:100%;max-width:520px;'
    + 'box-shadow:0 16px 48px rgba(74,30,140,.18)">'
    + '<div style="display:flex;align-items:center;gap:9px;margin-bottom:14px">'
    + '<span style="font-size:1.1rem">📋</span>'
    + '<span style="font-weight:800;font-size:.98rem;flex:1">' + title + '</span>'
    + '<button onclick="closePasteDialog()" '
    + 'style="width:26px;height:26px;border-radius:7px;border:1.5px solid var(--gl);'
    + 'background:transparent;cursor:pointer;font-size:.88rem;color:var(--gm)">✕</button>'
    + '</div>'
    + '<div style="font-size:.75rem;color:var(--gm);margin-bottom:8px;'
    + 'background:var(--ow);border-radius:7px;padding:7px 10px;font-family:var(--fm)">'
    + hint + '</div>'
    + '<textarea id="pasteDialogTA" placeholder="Paste di sini (Ctrl+V / Cmd+V)…" '
    + 'style="width:100%;height:160px;border:1.5px solid var(--gl);border-radius:8px;'
    + 'padding:9px 11px;font-family:var(--fm);font-size:.8rem;resize:vertical;outline:none;'
    + 'transition:border-color .18s ease" '
    + 'onfocus="this.style.borderColor=&quot;var(--pm)&quot;" '
    + 'onblur="this.style.borderColor=&quot;var(--gl)&quot;"></textarea>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">'
    + '<button onclick="closePasteDialog()" '
    + 'style="padding:7px 15px;border-radius:99px;border:1.5px solid var(--gl);'
    + 'background:transparent;font-family:var(--fb);font-size:.8rem;font-weight:600;'
    + 'color:var(--gd);cursor:pointer">Batal</button>'
    + '<button onclick="_confirmPasteDialog()" '
    + 'style="padding:7px 20px;border-radius:99px;border:none;'
    + 'background:linear-gradient(135deg,var(--pd),var(--pm));color:#fff;'
    + 'font-family:var(--fb);font-size:.8rem;font-weight:700;cursor:pointer;'
    + 'box-shadow:0 3px 10px rgba(74,30,140,.25)">🚀 Proses</button>'
    + '</div>'
    + '</div>';

  // Simpan callback
  overlay._onConfirm = onConfirm;
  document.body.appendChild(overlay);

  // Tutup saat klik overlay
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Auto focus textarea
  setTimeout(() => {
    const ta = document.getElementById('pasteDialogTA');
    if (ta) ta.focus();
  }, 50);
}

function closePasteDialog() {
  const d = document.getElementById('pasteDialog');
  if (d) d.remove();
}
function _confirmPasteDialog() {
  const overlay = document.getElementById('pasteDialog');
  const ta = document.getElementById('pasteDialogTA');
  if (!overlay || !ta) return;
  const raw = ta.value;
  if (!raw.trim()) { toast('Tidak ada teks yang di-paste', 'warning'); return; }
  overlay._onConfirm(raw);
  overlay.remove();
}

/* ═══════ HELPERS ═══════ */
function fNum(n){return(+n||0).toLocaleString('id-ID');}
function spl(s) { if(!s) return []; return s.split(',').map(v=>v.trim()).filter(Boolean); }
function pBiaya(s) { if(!s) return 0; return s.split(',').reduce((a,v)=>a+(parseFloat(v.trim())||0),0); }
function fDate(s) { if(!s) return '–'; const d=new Date(s+'T00:00:00'); return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}); }
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function exPhoto(l) { if(!l) return ''; const m=l.match(/\/d\/([a-zA-Z0-9_-]+)/); return m?`https://lh3.googleusercontent.com/d/${m[1]}`:l; }
function pkOpts(sel) { return Object.entries(PK).map(([id,info])=>`<option value="${id}" ${id===sel?'selected':''}>${info.i} #${id} — ${info.n}</option>`).join(''); }

function setS(type, text) {
  const d = document.getElementById('statusDot'); d.className='tb-d '+type;
  document.getElementById('statusTxt').textContent = text;
}
function showPage(p) {
  document.querySelectorAll('.ps').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.sb-i').forEach(e=>e.classList.remove('active'));
  document.getElementById('page-'+p)?.classList.add('active');
  document.getElementById('nav-'+p)?.classList.add('active');
}
function openModal(id)  { document.getElementById(id).classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow=''; }
document.querySelectorAll('.mov').forEach(o => o.addEventListener('click', e => { if(e.target===o) closeModal(o.id); }));
document.addEventListener('keydown', e => { if(e.key==='Escape') document.querySelectorAll('.mov.open').forEach(m=>closeModal(m.id)); });

function toast(msg, type='') {
  const w=document.getElementById('tw'); const t=document.createElement('div');
  t.className='toast '+type; t.textContent=msg; w.appendChild(t);
  requestAnimationFrame(()=>requestAnimationFrame(()=>t.classList.add('show')));
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),400); }, 3500);
}

init();


/* ═══════ SILENT RELOAD ═══════
   Re-fetch semua data dari Sheets di background setelah upload
   tanpa menampilkan loading screen — user tidak sadar
*/
async function silentReload() {
  try {
    const [dok, jad, det, notif, ang, peng, pgm, cap] = await Promise.all([
      readSh('proker_dokumentasi'), readSh('proker_jadwal'), readSh('proker_detail'),
      readSh('proker_notif_config'), readSh('anggota').catch(() => []), readSh('pengurus'),
      readSh('pengumuman').catch(() => []), readSh('pencapaian').catch(() => [])
    ]);
    S.dok   = dok.filter(d=>d.delete_flag!=='TRUE').map((d,i)  => ({...d, _i:i, _m:false, _n:false, _d:false}));
    S.jad   = jad.filter(d=>d.delete_flag!=='TRUE').map((d,i)  => ({...d, _i:i, _m:false, _n:false, _d:false}));
    S.det   = det.filter(d=>d.delete_flag!=='TRUE').map((d,i)  => ({...d, _i:i, _m:false}));
    S.notif = notif.filter(d=>d.delete_flag!=='TRUE').map((d,i)=> ({...d, _i:i, _m:false}));
    S.ang   = ang.filter(d=>d.delete_flag!=='TRUE').map((d,i)  => ({...d, _i:i, _m:false, _n:false, _d:false}));
    S.peng  = peng
      .filter(p => p.jabatan_level && !['Note:', ''].includes((p.jabatan_level||'').trim()))
      .map((d,i) => ({...d, _i:i, _m:false}));
    S.pgm   = pgm.filter(d=>d.delete_flag!=='TRUE').map((d,i)  => ({...d, _i:i, _m:false, _n:false, _d:false}));
    S.cap   = cap.filter(d=>d.delete_flag!=='TRUE').map((d,i)  => ({...d, _i:i, _m:false, _n:false, _d:false}));
    // Refresh version lock
    const lockData = await readSh(LOCK_SHEET).catch(() => []);
    if (lockData && lockData.length > 0) _localVersion = lockData[0].version || _localVersion;
    renderAll();
    console.log('[JCOSASI] Silent reload selesai, data sinkron.');
  } catch(e) {
    console.warn('[JCOSASI] Silent reload gagal (tidak kritis):', e.message);
  }
}

/* ═══════ PH SAKURA (Overview Hero) ═══════ */
// Interval disimpan di luar fungsi agar tidak pernah dibuat dua kali
let _phSakuraIv = null;

function initPhSakura() {
  const ph = document.querySelector('.ph');
  if (!ph) return;

  // Gunakan .ph-sakura-wrap yang sudah ada di HTML
  const wrap = ph.querySelector('.ph-sakura-wrap') || ph;

  function spawnPhPetal() {
    if (!document.querySelector('#page-rekap.active')) return;
    const phW = ph.offsetWidth  || 300;
    const phH = ph.offsetHeight || 160;
    const sz  = 4 + Math.random() * 7;

    let x = Math.random() * (phW + 20) - 10;
    let y = -sz;
    let angle = Math.random() * 360;

    const dur      = 2500 + Math.random() * 2500;
    const xDrift   = (Math.random() > .5 ? 1 : -1) * (10 + Math.random() * 18);
    const vyMin    = 30 + Math.random() * 15;
    const vyMax    = 90 + Math.random() * 40;
    const totalSpin= (360 + Math.random() * 180) * (Math.random() > .5 ? 1 : -1);
    const alpha    = .25 + Math.random() * .4;
    const radius   = Math.random() > .5 ? '50% 0 50% 0' : '0 50% 0 50%';

    const startTs = performance.now();
    let   lastTs  = startTs;

    const el = document.createElement('div');
    el.style.cssText = [
      'position:absolute',
      'width:'  + sz + 'px',
      'height:' + sz + 'px',
      'background:rgba(255,180,210,' + alpha + ')',
      'border-radius:' + radius,
      'pointer-events:none',
      'z-index:0',
      'will-change:transform,opacity',
      'transform:translateZ(0)',
      'backface-visibility:hidden',
      'left:0', 'top:0',
    ].join(';');
    wrap.appendChild(el);

    function frame(ts) {
      const elapsed = ts - startTs;
      const dt = Math.min((ts - lastTs) / 1000, .05);
      lastTs = ts;
      if (elapsed > dur || y > phH + sz + 10 || !document.body.contains(el)) {
        el.remove(); return;
      }
      const p = Math.min(elapsed / dur, 1);
      const vx   = xDrift * Math.cos(p * Math.PI * 2) * (Math.PI * 2 / (dur / 1000));
      const ease = p * p * (3 - 2 * p);
      const vy   = vyMin + (vyMax - vyMin) * ease
                 - 12 * Math.abs(Math.sin(p * Math.PI * 2));
      x += vx * dt;
      y += Math.max(5, vy) * dt;
      const curSpin = (totalSpin / (dur / 1000)) * (0.7 + 0.3 * Math.abs(Math.cos(p * Math.PI)));
      angle += curSpin * dt;
      let opacity;
      if      (elapsed < 200) opacity = elapsed / 200;
      else if (p > 0.8)       opacity = Math.max(0, (1 - p) / 0.2);
      else                    opacity = 1;
      el.style.opacity   = opacity;
      el.style.transform = 'translate(' + (x - sz/2) + 'px,' + (y - sz/2) + 'px) rotate(' + angle + 'deg)';
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  for (let i = 0; i < 10; i++) setTimeout(spawnPhPetal, i * 100);
  if (!_phSakuraIv) {
    _phSakuraIv = setInterval(spawnPhPetal, 500);
  }
}
/* ═══════ LOADING SAKURA — identik dengan hero landing page ═══════ */
(function initLoadingSakura() {
  const container = document.getElementById('lovSakura');
  if (!container) return;

  function spawnPetal() {
    const lov = document.getElementById('lov');
    if (!lov || lov.classList.contains('hidden')) return;

    const W   = window.innerWidth;
    const H   = window.innerHeight;
    const sz  = 4 + Math.random() * 6;

    // Posisi awal: acak di atas, sedikit di luar batas kiri/kanan
    let x = Math.random() * (W + 40) - 20;
    let y = -(sz);

    // Ikuti pola keyframe asli:
    // kelopak jatuh sambil geser ke satu arah (mis kanan), lalu berbalik (kiri)
    // Perubahan arah terjadi smooth — menggunakan sin SATU siklus penuh selama hidup kelopak
    // sin(0→π) = 0→0 lewat puncak → geser kanan lalu balik ke tengah
    // sin(π→2π) = 0→0 lewat lembah → geser kiri lalu balik ke tengah
    // Arah geser: acak kanan-dulu atau kiri-dulu

    const dur       = 4500 + Math.random() * 3500; // ms total hidup kelopak
    const xDrift    = (Math.random() > .5 ? 1 : -1) // arah pertama: kanan atau kiri
                      * (14 + Math.random() * 20);  // px geser maks di tengah perjalanan
    // Kecepatan Y: ease-in (makin cepat) tapi dengan sedikit perlambatan di tengah
    // untuk mensimulasikan hambatan udara saat berputar
    const vyMin     = 40 + Math.random() * 20;  // px/s paling lambat (awal & tengah)
    const vyMax     = 130 + Math.random() * 60; // px/s paling cepat (akhir)

    // Rotasi: satu putaran penuh selama hidup (seperti keyframe 0°→360°)
    let   angle     = Math.random() * 360;
    const totalSpin = (360 + Math.random() * 180) * (Math.random() > .5 ? 1 : -1);

    const alpha  = .2 + Math.random() * .35;
    const radius = Math.random() > .5 ? '50% 0 50% 0' : '0 50% 0 50%';

    const startTs   = performance.now();
    let   lastTs    = startTs;

    const el = document.createElement('div');
    el.style.cssText = [
      'position:absolute',
      'width:'  + sz + 'px',
      'height:' + sz + 'px',
      'background:rgba(255,180,210,' + alpha + ')',
      'border-radius:' + radius,
      'pointer-events:none',
      'z-index:1',
      'will-change:transform,opacity',
      'left:0', 'top:0',
    ].join(';');
    container.appendChild(el);

    function frame(ts) {
      const elapsed = ts - startTs;
      const dt      = Math.min((ts - lastTs) / 1000, .05);
      lastTs = ts;

      if (lov.classList.contains('hidden') || elapsed > dur || y > H + sz + 10) {
        el.remove(); return;
      }

      // progress 0→1 selama hidup kelopak
      const p  = Math.min(elapsed / dur, 1);

      // X: sin(p × 2π) → satu siklus penuh: 0 → geser satu arah → kembali → geser arah lain → kembali
      // Hasilnya: geser kanan (atau kiri) dulu, lalu berbalik arah, smooth tanpa mendadak
      const xOffset = xDrift * Math.sin(p * Math.PI * 2);
      // Kecepatan horizontal = turunan xOffset terhadap waktu
      const vx = xDrift * Math.cos(p * Math.PI * 2) * (Math.PI * 2 / (dur / 1000));

      // Y: ease-in-out dengan lembah di tengah (sedikit melambat saat berayun maksimal)
      // pakai gabungan ease-in kuadrat + modulasi kecil dari sin X
      const ease    = p * p * (3 - 2 * p);           // smoothstep 0→1
      const vy      = vyMin + (vyMax - vyMin) * ease  // makin cepat seiring waktu
                    - 18 * Math.abs(Math.sin(p * Math.PI * 2)); // sedikit melambat saat ayun maks

      x += vx * dt;
      y += Math.max(8, vy) * dt;

      // Rotasi: proporsional terhadap progress — persis seperti keyframe 0°→totalSpin
      // turunan = kecepatan konstan tapi dimodulasi sedikit agar tidak kaku
      const curSpin = (totalSpin / (dur / 1000)) * (0.7 + 0.3 * Math.abs(Math.cos(p * Math.PI)));
      angle += curSpin * dt;

      // Opacity: fade in 400ms, penuh, fade out di 20% terakhir
      let opacity;
      if      (elapsed < 400)          opacity = elapsed / 400;
      else if (p > 0.8)                opacity = Math.max(0, (1 - p) / 0.2);
      else                             opacity = 1;

      el.style.opacity   = opacity;
      el.style.transform = 'translate(' + (x - sz/2) + 'px,' + (y - sz/2) + 'px) rotate(' + angle + 'deg)';

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  const iv = setInterval(() => {
    if (document.getElementById('lov').classList.contains('hidden')) {
      clearInterval(iv); return;
    }
    spawnPetal();
  }, 700);

  for (let i = 0; i < 10; i++) setTimeout(spawnPetal, i * 180);
})();



/* ═══════════════════════════════════════════════════════════
   CETAK JADWAL PROKER
   Menghasilkan laporan jadwal per proker dalam format A4,
   berisi tabel lengkap dengan kolom catatan & penanggung jawab
═══════════════════════════════════════════════════════════ */
function printJadwalProker(pid) {
  const info   = PK[pid] || { n: 'Proker ' + pid, i: '📌' };
  const jads   = S.jad
    .filter(j => j.proker_id === pid && !j._d)
    .sort((a, b) => a.tanggal > b.tanggal ? 1 : -1);

  const org    = (typeof CONTENT !== 'undefined' && CONTENT.org) ? CONTENT.org : {};
  const now    = new Date();
  const tglCetak = now.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  // Helper format tanggal panjang
  const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function fmtTgl(str) {
    if (!str) return '–';
    const d = new Date(str + 'T00:00:00');
    return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  }

  const today = S.today;
  const upcoming = jads.filter(j => j.tanggal >= today).length;
  const lewat    = jads.filter(j => j.tanggal <  today).length;

  // Bangun baris tabel
  const rows = jads.map((j, i) => {
    const isLewat = j.tanggal < today;
    const isHariIni = j.tanggal === today;
    const rowBg = isHariIni ? '#EDE9FE' : isLewat ? '#F9FAFB' : '#FFFFFF';
    const tglColor = isHariIni ? '#6D28D9' : isLewat ? '#9CA3AF' : '#111827';
    const badge = isHariIni
      ? `<span style="display:inline-block;background:#6D28D9;color:#fff;border-radius:99px;font-size:7pt;padding:1px 7px;margin-left:6px;vertical-align:middle">HARI INI</span>`
      : isLewat
      ? `<span style="display:inline-block;background:#F3F4F6;color:#9CA3AF;border-radius:99px;font-size:7pt;padding:1px 7px;margin-left:6px;vertical-align:middle">LEWAT</span>`
      : `<span style="display:inline-block;background:#D1FAE5;color:#065F46;border-radius:99px;font-size:7pt;padding:1px 7px;margin-left:6px;vertical-align:middle">UPCOMING</span>`;

    return `<tr style="background:${rowBg}">
      <td style="text-align:center;color:#6B7280;font-size:9pt">${i + 1}</td>
      <td style="color:${tglColor};font-weight:${isLewat?'400':'600'}">
        ${fmtTgl(j.tanggal)}${badge}
      </td>
      <td style="text-align:center;font-weight:600;color:#374151">${j.jam || '–'}</td>
      <td style="color:#374151">${j.penanggung_jawab || '<span style="color:#D1D5DB">–</span>'}</td>
      <td style="color:#6B7280;font-style:${j.catatan?'normal':'italic'}">${j.catatan || '<span style="color:#D1D5DB">–</span>'}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Jadwal — #${pid} ${info.n}</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 210mm; min-height: 297mm; }
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  font-size: 10.5pt;
  color: #111827;
  line-height: 1.55;
  padding: 16mm 18mm 14mm;
}

/* KOP */
.kop {
  display: flex; align-items: center; gap: 14px;
  border-bottom: 3px solid #3D1A5E;
  padding-bottom: 10px; margin-bottom: 4px;
}
.kop-logo {
  width: 50px; height: 50px; flex-shrink: 0;
  border-radius: 8px; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  font-size: 22pt;
}
.kop-logo img { width: 100%; height: 100%; object-fit: contain; }
.kop-org  { font-size: 13pt; font-weight: 800; color: #3D1A5E; letter-spacing: .3px; }
.kop-sub  { font-size: 8.5pt; color: #6B7280; }
.kop-right { margin-left: auto; text-align: right; font-size: 8pt; color: #9CA3AF; }

/* JUDUL */
.lap-title {
  text-align: center; margin: 12px 0 2px;
  font-size: 13pt; font-weight: 800;
  color: #2c0a4a; text-transform: uppercase; letter-spacing: .5px;
}
.lap-sub {
  text-align: center; font-size: 9.5pt; color: #6B7280; margin-bottom: 14px;
}
.divider { border: none; border-top: 1px solid #E5E7EB; margin: 10px 0; }

/* INFO BOX */
.info-box {
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  gap: 0; margin-bottom: 16px;
  border: 1px solid #DDD6FE; border-radius: 8px; overflow: hidden;
}
.ib-item {
  padding: 10px 14px; text-align: center;
  border-right: 1px solid #DDD6FE;
}
.ib-item:last-child { border-right: none; }
.ib-num {
  display: block; font-size: 18pt; font-weight: 800;
  color: #3D1A5E; line-height: 1;
}
.ib-label {
  display: block; font-size: 7.5pt; color: #9CA3AF;
  text-transform: uppercase; letter-spacing: .05em; margin-top: 3px;
}

/* TABEL */
h3 {
  font-size: 9.5pt; color: #3D1A5E;
  border-left: 3px solid #3D1A5E;
  padding-left: 8px; margin-bottom: 8px;
  text-transform: uppercase; letter-spacing: .4px;
}
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
thead tr th {
  background: #3D1A5E; color: #fff;
  padding: 7px 10px; text-align: left; font-weight: 600;
  font-size: 8.5pt; letter-spacing: .04em;
}
thead tr th:first-child { text-align: center; width: 32px; border-radius: 0; }
tbody tr td {
  padding: 7px 10px;
  border-bottom: 1px solid #F3F4F6;
  vertical-align: middle;
}
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover td { background: #F5F3FF !important; }
tfoot tr td {
  padding: 6px 10px; font-size: 8.5pt; color: #6B7280;
  border-top: 1.5px solid #E5E7EB;
  font-style: italic;
}

/* PRINT */
.print-btn {
  position: fixed; bottom: 20px; right: 20px;
  background: #3D1A5E; color: #fff;
  border: none; border-radius: 99px;
  padding: 10px 22px; font-size: 10pt; font-weight: 600;
  cursor: pointer; box-shadow: 0 4px 16px rgba(61,26,94,.35);
  font-family: 'Segoe UI', Arial, sans-serif;
}
.print-btn:hover { background: #6B34AF; }
@media print {
  body { padding: 12mm 14mm; }
  .print-btn { display: none; }
  tbody tr:hover td { background: inherit !important; }
}

/* Save guide overlay */
.sg-overlay{position:fixed;inset:0;z-index:9999;background:rgba(20,10,40,.72);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px;animation:sgFi .25s ease}
@keyframes sgFi{from{opacity:0}to{opacity:1}}
.sg-box{background:#fff;border-radius:16px;padding:28px 32px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(20,10,40,.35);text-align:center;font-family:'Segoe UI',Arial,sans-serif}
.sg-icon{font-size:2.4rem;margin-bottom:8px}
.sg-title{font-size:14pt;font-weight:700;color:#3D1A5E;margin-bottom:6px}
.sg-fname{display:inline-block;background:#f5eeff;color:#3D1A5E;border-radius:7px;padding:4px 14px;font-family:'Courier New',monospace;font-size:8.5pt;margin-bottom:16px;word-break:break-all}
.sg-steps{text-align:left;font-size:9pt;color:#333;line-height:1.9;padding-left:18px;margin-bottom:14px}
.sg-steps li strong{color:#3D1A5E}
.sg-tip{font-size:8pt;color:#777;background:#fffbea;border:1px solid #ffe082;border-radius:7px;padding:7px 12px;margin-bottom:16px}
.sg-btn{background:#3D1A5E;color:#fff;border:none;border-radius:99px;padding:10px 28px;font-size:10pt;font-weight:600;cursor:pointer;font-family:'Segoe UI',Arial,sans-serif}
.sg-btn:hover{background:#6B34AF}
@media print{.sg-overlay{display:none!important}}
</style>
</head>
<body>

<!-- KOP -->
<div class="kop">
  <div class="kop-logo">
    <img src="${window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/logo-jcosasi.png')}"
         alt="JCOSASI"
         onerror="this.style.display='none';this.parentElement.textContent='🎌'"/>
  </div>
  <div>
    <div class="kop-org">${org.nama_lengkap || 'JCOSASI'}</div>
    <div class="kop-sub">${org.sekolah || 'SMKN 1 Cikarang Barat'} · Periode 2026–2027</div>
  </div>
  <div class="kop-right">Dicetak: ${tglCetak}</div>
</div>

<div class="lap-title">Jadwal Program Kerja</div>
<div class="lap-sub">${info.i} #${pid} — ${info.n}</div>
<hr class="divider"/>

<!-- INFO BOX -->
<div class="info-box">
  <div class="ib-item">
    <span class="ib-num">${jads.length}</span>
    <span class="ib-label">Total Jadwal</span>
  </div>
  <div class="ib-item">
    <span class="ib-num" style="color:#065F46">${upcoming}</span>
    <span class="ib-label">Upcoming</span>
  </div>
  <div class="ib-item">
    <span class="ib-num" style="color:#9CA3AF">${lewat}</span>
    <span class="ib-label">Sudah Lewat</span>
  </div>
</div>

<!-- TABEL JADWAL -->
<h3>📅 Daftar Jadwal</h3>
${jads.length ? `
<table>
  <thead>
    <tr>
      <th>No</th>
      <th>Tanggal</th>
      <th style="width:70px;text-align:center">Jam</th>
      <th style="width:150px">Penanggung Jawab</th>
      <th>Catatan</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr>
      <td colspan="5">
        📌 ${upcoming} jadwal upcoming · ${lewat} sudah lewat · Total ${jads.length} jadwal
      </td>
    </tr>
  </tfoot>
</table>` : `<p style="color:#9CA3AF;font-style:italic;padding:12px 0">Belum ada jadwal untuk proker ini.</p>`}

<button class="print-btn"
  onclick="showGuide('Jadwal-${pid}-${info.n.replace(/[^a-zA-Z0-9]/g,'-')}.pdf')">
  🖨️ Cetak / Simpan PDF
</button>

<script>
function showGuide(fn) {
  var old = document.getElementById('sgOverlay'); if(old) old.remove();
  var o = document.createElement('div'); o.id='sgOverlay'; o.className='sg-overlay';
  o.innerHTML='<div class="sg-box">'
    +'<div class="sg-icon">🖨️</div>'
    +'<div class="sg-title">Simpan sebagai PDF</div>'
    +'<div class="sg-fname">'+fn+'</div>'
    +'<ol class="sg-steps">'
    +'<li>Klik <strong>Lanjut Cetak</strong> di bawah</li>'
    +'<li>Ubah <strong>Destination</strong> → <strong>Save as PDF</strong></li>'
    +'<li>Ubah nama file sesuai di atas ↑</li>'
    +'<li>Klik <strong>Save</strong></li>'
    +'</ol>'
    +'<div class="sg-tip">💡 Gunakan <strong>Landscape</strong> jika tabel terpotong</div>'
    +'<button class="sg-btn" onclick="doPrint()">🖨️ Lanjut Cetak</button>'
    +'</div>';
  document.body.appendChild(o);
  o.addEventListener('click', function(e){if(e.target===o)o.remove();});
}
function doPrint(){
  var el=document.getElementById('sgOverlay'); if(el)el.remove();
  setTimeout(function(){window.print();},150);
}
</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini.'); return; }
  win.document.write(html);
  win.document.close();
}

/* ═══════════════════════════════════════════════════════════
   CETAK SEMUA JADWAL (semua proker, dikelompokkan per proker)
═══════════════════════════════════════════════════════════ */
function printSemuaJadwal() {
  const org    = (typeof CONTENT !== 'undefined' && CONTENT.org) ? CONTENT.org : {};
  const now    = new Date();
  const tglCetak = now.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function fmtTgl(str) {
    if (!str) return '–';
    const d = new Date(str + 'T00:00:00');
    return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  }

  const today = S.today;
  const allJad = S.jad.filter(j => !j._d).sort((a,b) => a.tanggal > b.tanggal ? 1 : -1);
  const totalUpcoming = allJad.filter(j => j.tanggal >= today).length;
  const totalLewat    = allJad.filter(j => j.tanggal <  today).length;

  // Kelompokkan per proker, urutkan per proker_id
  const byProker = {};
  allJad.forEach(j => {
    if (!byProker[j.proker_id]) byProker[j.proker_id] = [];
    byProker[j.proker_id].push(j);
  });
  const prokerIds = Object.keys(byProker).sort();

  // Bangun tabel per proker
  const sections = prokerIds.map(pid => {
    const info = PK[pid] || { n: 'Proker ' + pid, i: '📌' };
    const jads = byProker[pid];
    const up   = jads.filter(j => j.tanggal >= today).length;
    const lw   = jads.filter(j => j.tanggal <  today).length;

    const rows = jads.map((j, i) => {
      const isLewat   = j.tanggal < today;
      const isHariIni = j.tanggal === today;
      const rowBg     = isHariIni ? '#EDE9FE' : isLewat ? '#F9FAFB' : '#FFFFFF';
      const tglColor  = isHariIni ? '#6D28D9' : isLewat ? '#9CA3AF' : '#111827';
      const badge = isHariIni
        ? `<span class="badge b-today">HARI INI</span>`
        : isLewat
        ? `<span class="badge b-lewat">LEWAT</span>`
        : `<span class="badge b-up">UPCOMING</span>`;
      return `<tr style="background:${rowBg}">
        <td class="tc">${i + 1}</td>
        <td style="color:${tglColor};font-weight:${isLewat?'400':'600'}">${fmtTgl(j.tanggal)} ${badge}</td>
        <td class="tc fw">${j.jam || '–'}</td>
        <td>${j.penanggung_jawab || '<span class="nil">–</span>'}</td>
        <td class="note">${j.catatan || '<span class="nil">–</span>'}</td>
      </tr>`;
    }).join('');

    return `
      <div class="proker-section">
        <div class="ps-header">
          <span class="ps-icon">${info.i}</span>
          <span class="ps-num">#${pid}</span>
          <span class="ps-name">${info.n}</span>
          <span class="ps-stats">${jads.length} jadwal &nbsp;·&nbsp; <span style="color:#6EE7B7">${up} upcoming</span> &nbsp;·&nbsp; <span style="color:rgba(255,255,255,.5)">${lw} lewat</span></span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:32px;text-align:center">No</th>
              <th>Tanggal</th>
              <th style="width:65px;text-align:center">Jam</th>
              <th style="width:145px">Penanggung Jawab</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Rekap Jadwal Semua Proker — JCOSASI</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 210mm; min-height: 297mm; }
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  font-size: 10pt; color: #111827; line-height: 1.55;
  padding: 16mm 18mm 14mm;
}

/* KOP */
.kop { display:flex; align-items:center; gap:14px; border-bottom:3px solid #3D1A5E; padding-bottom:10px; margin-bottom:4px; }
.kop-logo { width:48px; height:48px; flex-shrink:0; border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:20pt; }
.kop-logo img { width:100%; height:100%; object-fit:contain; }
.kop-org  { font-size:12.5pt; font-weight:800; color:#3D1A5E; }
.kop-sub  { font-size:8pt; color:#6B7280; }
.kop-right { margin-left:auto; text-align:right; font-size:7.5pt; color:#9CA3AF; }

/* JUDUL */
.lap-title { text-align:center; margin:10px 0 2px; font-size:13pt; font-weight:800; color:#2c0a4a; text-transform:uppercase; letter-spacing:.5px; }
.lap-sub   { text-align:center; font-size:9pt; color:#6B7280; margin-bottom:12px; }
hr { border:none; border-top:1px solid #E5E7EB; margin:10px 0; }

/* SUMMARY BOX */
.sum-box { display:grid; grid-template-columns:repeat(4,1fr); gap:0; border:1px solid #DDD6FE; border-radius:8px; overflow:hidden; margin-bottom:18px; }
.sb-item { padding:9px 12px; text-align:center; border-right:1px solid #DDD6FE; }
.sb-item:last-child { border-right:none; }
.sb-num   { display:block; font-size:16pt; font-weight:800; color:#3D1A5E; line-height:1; }
.sb-label { display:block; font-size:7pt; color:#9CA3AF; text-transform:uppercase; letter-spacing:.05em; margin-top:3px; }

/* PROKER SECTION */
.proker-section { margin-bottom:20px; page-break-inside: avoid; }
.ps-header {
  display:flex; align-items:center; gap:6px;
  background: linear-gradient(90deg,#3D1A5E,#6B34AF);
  color:#fff; padding:7px 12px; border-radius:6px 6px 0 0;
  font-size:9.5pt;
}
.ps-icon { font-size:11pt; flex-shrink:0; }
.ps-num  { background:rgba(255,255,255,.2); border-radius:99px; padding:1px 8px; font-size:8pt; font-weight:700; flex-shrink:0; }
.ps-name { font-weight:700; flex:1; }
.ps-stats { font-size:8pt; opacity:.85; flex-shrink:0; }

/* TABEL */
table { width:100%; border-collapse:collapse; font-size:9.5pt; }
thead tr th { background:#3D1A5E; color:#fff; padding:6px 9px; text-align:left; font-weight:600; font-size:8.5pt; }
tbody tr td { padding:6px 9px; border-bottom:1px solid #F3F4F6; vertical-align:middle; }
tbody tr:last-child td { border-bottom:none; }
.tc   { text-align:center; }
.fw   { font-weight:600; }
.note { color:#6B7280; font-style:italic; font-size:9pt; }
.nil  { color:#D1D5DB; }

/* BADGE */
.badge { display:inline-block; border-radius:99px; font-size:7pt; padding:1px 7px; margin-left:5px; vertical-align:middle; font-weight:600; font-style:normal; }
.b-today { background:#6D28D9; color:#fff; }
.b-lewat { background:#F3F4F6; color:#9CA3AF; }
.b-up    { background:#D1FAE5; color:#065F46; }

/* PRINT */
.print-btn { position:fixed; bottom:20px; right:20px; background:#3D1A5E; color:#fff; border:none; border-radius:99px; padding:10px 22px; font-size:10pt; font-weight:600; cursor:pointer; box-shadow:0 4px 16px rgba(61,26,94,.35); font-family:'Segoe UI',Arial,sans-serif; }
.print-btn:hover { background:#6B34AF; }
@media print {
  body { padding:10mm 13mm; }
  .print-btn { display:none; }
  .proker-section { page-break-inside:avoid; }
}

/* Save guide */
.sg-overlay{position:fixed;inset:0;z-index:9999;background:rgba(20,10,40,.72);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px;animation:sgFi .25s ease}
@keyframes sgFi{from{opacity:0}to{opacity:1}}
.sg-box{background:#fff;border-radius:16px;padding:28px 32px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(20,10,40,.35);text-align:center;font-family:'Segoe UI',Arial,sans-serif}
.sg-icon{font-size:2.4rem;margin-bottom:8px}
.sg-title{font-size:14pt;font-weight:700;color:#3D1A5E;margin-bottom:6px}
.sg-fname{display:inline-block;background:#f5eeff;color:#3D1A5E;border-radius:7px;padding:4px 14px;font-family:'Courier New',monospace;font-size:8.5pt;margin-bottom:16px;word-break:break-all}
.sg-steps{text-align:left;font-size:9pt;color:#333;line-height:1.9;padding-left:18px;margin-bottom:14px}
.sg-steps li strong{color:#3D1A5E}
.sg-tip{font-size:8pt;color:#777;background:#fffbea;border:1px solid #ffe082;border-radius:7px;padding:7px 12px;margin-bottom:16px}
.sg-btn{background:#3D1A5E;color:#fff;border:none;border-radius:99px;padding:10px 28px;font-size:10pt;font-weight:600;cursor:pointer;font-family:'Segoe UI',Arial,sans-serif}
.sg-btn:hover{background:#6B34AF}
@media print{.sg-overlay{display:none!important}}
</style>
</head>
<body>

<div class="kop">
  <div class="kop-logo">
    <img src="${window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/logo-jcosasi.png')}"
         alt="JCOSASI"
         onerror="this.style.display='none';this.parentElement.textContent='🎌'"/>
  </div>
  <div>
    <div class="kop-org">${org.nama_lengkap || 'JCOSASI'}</div>
    <div class="kop-sub">${org.sekolah || 'SMKN 1 Cikarang Barat'} · Periode 2026–2027</div>
  </div>
  <div class="kop-right">Dicetak: ${tglCetak}</div>
</div>

<div class="lap-title">Rekap Jadwal Semua Program Kerja</div>
<div class="lap-sub">JCOSASI 2026–2027 · ${prokerIds.length} Program Kerja</div>
<hr/>

<div class="sum-box">
  <div class="sb-item">
    <span class="sb-num">${allJad.length}</span>
    <span class="sb-label">Total Jadwal</span>
  </div>
  <div class="sb-item">
    <span class="sb-num" style="color:#065F46">${totalUpcoming}</span>
    <span class="sb-label">Upcoming</span>
  </div>
  <div class="sb-item">
    <span class="sb-num" style="color:#9CA3AF">${totalLewat}</span>
    <span class="sb-label">Sudah Lewat</span>
  </div>
  <div class="sb-item">
    <span class="sb-num" style="color:#6D28D9">${prokerIds.length}</span>
    <span class="sb-label">Proker Aktif</span>
  </div>
</div>

${sections || '<p style="color:#9CA3AF;font-style:italic">Belum ada jadwal.</p>'}

<button class="print-btn" onclick="showGuide('Rekap-Jadwal-JCOSASI-2026-2027.pdf')">🖨️ Cetak / Simpan PDF</button>

<script>
function showGuide(fn) {
  var old=document.getElementById('sgOverlay');if(old)old.remove();
  var o=document.createElement('div');o.id='sgOverlay';o.className='sg-overlay';
  o.innerHTML='<div class="sg-box"><div class="sg-icon">🖨️</div>'
    +'<div class="sg-title">Simpan sebagai PDF</div>'
    +'<div class="sg-fname">'+fn+'</div>'
    +'<ol class="sg-steps"><li>Klik <strong>Lanjut Cetak</strong></li>'
    +'<li>Ubah <strong>Destination</strong> → <strong>Save as PDF</strong></li>'
    +'<li>Sesuaikan nama file ↑</li><li>Klik <strong>Save</strong></li></ol>'
    +'<div class="sg-tip">💡 Gunakan orientasi <strong>Portrait</strong> untuk hasil terbaik</div>'
    +'<button class="sg-btn" onclick="doPrint()">🖨️ Lanjut Cetak</button></div>';
  document.body.appendChild(o);
  o.addEventListener('click',function(e){if(e.target===o)o.remove();});
}
function doPrint(){var el=document.getElementById('sgOverlay');if(el)el.remove();setTimeout(function(){window.print();},150);}
</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini.'); return; }
  win.document.write(html);
  win.document.close();
}

/* ═══════════════════════════════════════════════════════════
   CETAK LAPORAN SEMUA DETAIL PROKER
═══════════════════════════════════════════════════════════ */
function printSemuaDetail() {
  const org      = (typeof CONTENT !== 'undefined' && CONTENT.org) ? CONTENT.org : {};
  const now      = new Date();
  const tglCetak = now.toLocaleDateString('id-ID', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });
  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  function fmtTgl(str) {
    if (!str) return '–';
    const d = new Date(str + 'T00:00:00');
    return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  }
  function rupiah(n) {
    return 'Rp ' + (+n||0).toLocaleString('id-ID');
  }

  const dets = [...S.det].sort((a,b) => a.proker_id > b.proker_id ? 1 : -1);

  const sections = dets.map(d => {
    const info = PK[d.proker_id] || { n:'Proker '+d.proker_id, i:'📌' };

    // RAB
    const items   = (d.item_biaya||'').split(',').map(s=>s.trim()).filter(Boolean);
    const estList = (d.estimasi_biaya_item||'').split(',').map(s=>s.trim());
    const aktList = (d.biaya_aktual||'').split(',').map(s=>s.trim());
    const rabItems = items.map((item,i) => ({
      item,
      est:   parseFloat(estList[i])||0,
      aktual:parseFloat(aktList[i])||0,
    }));
    const totEst = rabItems.reduce((s,r)=>s+r.est,0);
    const totAkt = rabItems.reduce((s,r)=>s+r.aktual,0);

    const rabRows = rabItems.map(r => {
      const selisih = r.aktual - r.est;
      const selColor = selisih > 0 ? '#DC2626' : selisih < 0 ? '#16A34A' : '#6B7280';
      return `<tr>
        <td>${r.item}</td>
        <td class="num">${r.est ? rupiah(r.est) : '<span class="nil">–</span>'}</td>
        <td class="num">${r.aktual ? rupiah(r.aktual) : '<span class="nil">–</span>'}</td>
        <td class="num" style="color:${selColor}">${r.est&&r.aktual ? (selisih>0?'+':'')+rupiah(selisih) : '<span class="nil">–</span>'}</td>
      </tr>`;
    }).join('');

    // Info rows
    const infoRows = [
      d.waktu_teks       ? ['⏰ Waktu',         d.waktu_teks] : null,
      d.estimasi_tanggal ? ['📅 Est. Tanggal',   fmtTgl(d.estimasi_tanggal)] : null,
      d.lokasi           ? ['📍 Lokasi',          d.lokasi] : null,
      d.sasaran          ? ['👥 Target Peserta',  d.sasaran] : null,
      d.pemateri         ? ['🎤 Pemateri',        d.pemateri] : null,
      d.panitia          ? ['🤝 Panitia / PJ',    d.panitia] : null,
    ].filter(Boolean).map(([label, val]) =>
      `<tr><td class="info-label">${label}</td><td>${val}</td></tr>`
    ).join('');

    return `
    <div class="det-section">
      <div class="det-header">
        <span class="det-icon">${info.i}</span>
        <span class="det-num">#${d.proker_id}</span>
        <span class="det-name">${info.n}</span>
        ${totEst > 0 ? `<span class="det-budget">RAB: ${rupiah(totEst)}</span>` : ''}
      </div>

      ${d.tujuan ? `
      <div class="field-block">
        <div class="field-label">🎯 Tujuan &amp; Manfaat</div>
        <div class="field-val">${d.tujuan}</div>
      </div>` : ''}

      ${d.deskripsi_kegiatan ? `
      <div class="field-block deskripsi">
        <div class="field-label">📋 Deskripsi Kegiatan</div>
        <div class="field-val">${d.deskripsi_kegiatan}</div>
      </div>` : ''}

      ${infoRows ? `
      <table class="info-tbl">
        <tbody>${infoRows}</tbody>
      </table>` : ''}

      ${rabItems.length ? `
      <div class="field-label" style="margin-top:10px">💰 Rencana Anggaran Biaya (RAB)</div>
      <table class="rab-tbl">
        <thead>
          <tr>
            <th>Item / Keterangan</th>
            <th class="num">Estimasi</th>
            <th class="num">Aktual</th>
            <th class="num">Selisih</th>
          </tr>
        </thead>
        <tbody>${rabRows}</tbody>
        <tfoot>
          <tr>
            <td><strong>Total</strong></td>
            <td class="num"><strong>${totEst ? rupiah(totEst) : '–'}</strong></td>
            <td class="num"><strong>${totAkt ? rupiah(totAkt) : '–'}</strong></td>
            <td class="num" style="color:${totAkt>totEst&&totEst?'#DC2626':totAkt?'#16A34A':'#6B7280'}">
              <strong>${totEst&&totAkt?(totAkt-totEst>0?'+':'')+rupiah(totAkt-totEst):'–'}</strong>
            </td>
          </tr>
        </tfoot>
      </table>` : ''}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Detail Semua Program Kerja — JCOSASI</title>
<style>
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
html, body { width:210mm; min-height:297mm; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:10pt; color:#111827; line-height:1.6; padding:16mm 18mm 14mm; }

/* KOP */
.kop { display:flex; align-items:center; gap:14px; border-bottom:3px solid #3D1A5E; padding-bottom:10px; margin-bottom:4px; }
.kop-logo { width:48px; height:48px; flex-shrink:0; border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:20pt; }
.kop-logo img { width:100%; height:100%; object-fit:contain; }
.kop-org { font-size:12.5pt; font-weight:800; color:#3D1A5E; }
.kop-sub { font-size:8pt; color:#6B7280; }
.kop-right { margin-left:auto; text-align:right; font-size:7.5pt; color:#9CA3AF; }
.lap-title { text-align:center; margin:10px 0 2px; font-size:13pt; font-weight:800; color:#2c0a4a; text-transform:uppercase; letter-spacing:.5px; }
.lap-sub   { text-align:center; font-size:9pt; color:#6B7280; margin-bottom:14px; }
hr { border:none; border-top:1px solid #E5E7EB; margin:10px 0; }

/* SECTION */
.det-section { margin-bottom:22px; page-break-inside:avoid; border:1px solid #E5E7EB; border-radius:8px; overflow:hidden; }
.det-header {
  display:flex; align-items:center; gap:7px;
  background:linear-gradient(90deg,#3D1A5E,#6B34AF);
  color:#fff; padding:8px 14px;
  font-size:9.5pt;
}
.det-icon { font-size:11pt; flex-shrink:0; }
.det-num  { background:rgba(255,255,255,.2); border-radius:99px; padding:1px 8px; font-size:8pt; font-weight:700; flex-shrink:0; }
.det-name { font-weight:700; flex:1; }
.det-budget { font-size:8pt; opacity:.85; background:rgba(255,255,255,.15); border-radius:99px; padding:1px 10px; flex-shrink:0; }

/* FIELDS */
.field-block { padding:8px 14px; border-bottom:1px solid #F3F4F6; }
.field-block.deskripsi { background:#F0F7FF; border-left:3px solid #3B82F6; border-bottom:1px solid #DBEAFE; }
.field-label { font-size:7.5pt; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; }
.field-val { font-size:9.5pt; color:#1F2937; white-space:pre-wrap; }

/* INFO TABLE */
.info-tbl { width:100%; border-collapse:collapse; font-size:9pt; border-bottom:1px solid #F3F4F6; }
.info-tbl td { padding:5px 14px; vertical-align:top; }
.info-tbl tr:nth-child(even) td { background:#F9FAFB; }
.info-label { color:#6B7280; width:140px; font-weight:600; flex-shrink:0; }

/* RAB TABLE */
.rab-tbl { width:100%; border-collapse:collapse; font-size:9pt; margin:0; }
.rab-tbl thead th { background:#3D1A5E; color:#fff; padding:5px 14px; text-align:left; font-size:8.5pt; }
.rab-tbl tbody td { padding:5px 14px; border-bottom:1px solid #F3F4F6; }
.rab-tbl tfoot td { padding:6px 14px; font-size:9pt; background:#EDE9FE; border-top:2px solid #C4B5FD; }
.rab-tbl tbody tr:nth-child(even) td { background:#FAFAFA; }
.num { text-align:right; font-variant-numeric:tabular-nums; }
.nil { color:#D1D5DB; font-style:italic; }

/* PRINT */
.print-btn { position:fixed; bottom:20px; right:20px; background:#3D1A5E; color:#fff; border:none; border-radius:99px; padding:10px 22px; font-size:10pt; font-weight:600; cursor:pointer; box-shadow:0 4px 16px rgba(61,26,94,.35); font-family:'Segoe UI',Arial,sans-serif; }
.print-btn:hover { background:#6B34AF; }
@media print {
  body { padding:10mm 13mm; }
  .print-btn { display:none; }
  .det-section { page-break-inside:avoid; }
}
.sg-overlay{position:fixed;inset:0;z-index:9999;background:rgba(20,10,40,.72);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px;}
.sg-box{background:#fff;border-radius:16px;padding:28px 32px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(20,10,40,.35);text-align:center;font-family:'Segoe UI',Arial,sans-serif}
.sg-icon{font-size:2.4rem;margin-bottom:8px}.sg-title{font-size:14pt;font-weight:700;color:#3D1A5E;margin-bottom:6px}
.sg-fname{display:inline-block;background:#f5eeff;color:#3D1A5E;border-radius:7px;padding:4px 14px;font-family:'Courier New',monospace;font-size:8.5pt;margin-bottom:16px;word-break:break-all}
.sg-steps{text-align:left;font-size:9pt;color:#333;line-height:1.9;padding-left:18px;margin-bottom:14px}.sg-steps li strong{color:#3D1A5E}
.sg-tip{font-size:8pt;color:#777;background:#fffbea;border:1px solid #ffe082;border-radius:7px;padding:7px 12px;margin-bottom:16px}
.sg-btn{background:#3D1A5E;color:#fff;border:none;border-radius:99px;padding:10px 28px;font-size:10pt;font-weight:600;cursor:pointer;}
.sg-btn:hover{background:#6B34AF}
@media print{.sg-overlay{display:none!important}}
</style>
</head>
<body>

<div class="kop">
  <div class="kop-logo">
    <img src="${window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/logo-jcosasi.png')}"
         alt="JCOSASI" onerror="this.style.display='none';this.parentElement.textContent='🎌'"/>
  </div>
  <div>
    <div class="kop-org">${org.nama_lengkap || 'JCOSASI'}</div>
    <div class="kop-sub">${org.sekolah || 'SMKN 1 Cikarang Barat'} · Periode 2026–2027</div>
  </div>
  <div class="kop-right">Dicetak: ${tglCetak}</div>
</div>

<div class="lap-title">Detail Semua Program Kerja</div>
<div class="lap-sub">JCOSASI 2026–2027 · ${dets.length} Program Kerja</div>
<hr/>

${sections || '<p style="color:#9CA3AF;font-style:italic">Belum ada data detail proker.</p>'}

<button class="print-btn" onclick="showGuide('Detail-Proker-JCOSASI-2026-2027.pdf')">🖨️ Cetak / Simpan PDF</button>

<script>
function showGuide(fn){
  var old=document.getElementById('sgOv');if(old)old.remove();
  var o=document.createElement('div');o.id='sgOv';o.className='sg-overlay';
  o.innerHTML='<div class="sg-box"><div class="sg-icon">🖨️</div>'
    +'<div class="sg-title">Simpan sebagai PDF</div>'
    +'<div class="sg-fname">'+fn+'</div>'
    +'<ol class="sg-steps"><li>Klik <strong>Lanjut Cetak</strong></li>'
    +'<li>Ubah <strong>Destination</strong> → <strong>Save as PDF</strong></li>'
    +'<li>Sesuaikan nama file ↑</li><li>Klik <strong>Save</strong></li></ol>'
    +'<div class="sg-tip">💡 Orientasi <strong>Portrait</strong> untuk hasil terbaik</div>'
    +'<button class="sg-btn" onclick="doPrint()">🖨️ Lanjut Cetak</button></div>';
  document.body.appendChild(o);
  o.addEventListener('click',function(e){if(e.target===o)o.remove();});
}
function doPrint(){var el=document.getElementById('sgOv');if(el)el.remove();setTimeout(function(){window.print();},150);}
</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini.'); return; }
  win.document.write(html);
  win.document.close();
}

/* ═══════════════════════════════════════════════════════════
   PENGUMUMAN — render, CRUD, modal
═══════════════════════════════════════════════════════════ */

/* Format tanggal untuk pengumuman — handle YYYY-MM-DD dan Date string dari GAS */
function fmtTglPgm(str) {
  if (!str) return '';
  // Coba parse YYYY-MM-DD manual dulu
  const ymd = typeof str === 'string' && str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = ymd ? new Date(+ymd[1], +ymd[2]-1, +ymd[3]) : new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'][d.getMonth()] + ' ' + d.getFullYear();
}

const PGM_FIELDS = [
  'judul','deskripsi','poster_url','tanggal_publish','tanggal_turun',
  'target_audiens','persiapan','cara_daftar','link_pendaftaran',
  'waktu_kegiatan','lokasi_kegiatan','narahubung_nama','narahubung_kontak',
  'dokumen_judul','dokumen_url','tag','prioritas','efek_poster','aktif'
];

function renderPgm() {
  if (!S.pgm) return;
  const pend = S.pgm.filter(p=>p._m||p._n||p._d).length;
  const banner = document.getElementById('pgmBanner');
  if (banner) banner.classList.toggle('show', pend > 0);
  const bannerN = document.getElementById('pgmBannerN');
  if (bannerN) bannerN.textContent = pend;

  const container = document.getElementById('pgmContent');
  if (!container) return;

  const sorted = [...S.pgm].sort((a,b) => {
    // Urutkan: aktif dulu, lalu tanggal_publish terbaru
    if (a._d !== b._d) return a._d ? 1 : -1;
    return (b.tanggal_publish||'') > (a.tanggal_publish||'') ? 1 : -1;
  });

  if (!sorted.length) {
    container.innerHTML = '<div class="empty"><div class="ei">📣</div><div class="et">Belum ada pengumuman. Klik + Tambah untuk membuat.</div></div>';
    return;
  }

  const prioBg = { urgent:'#FEE2E2', penting:'#FEF3C7', normal:'#D1FAE5' };
  const prioColor = { urgent:'#B91C1C', penting:'#92400E', normal:'#065F46' };

  container.innerHTML = sorted.map(p => {
    const cls = p._d ? 'del' : p._n ? 'newrow' : p._m ? 'mod' : '';
    const isAktif = p.aktif !== 'FALSE';
    const prio = p.prioritas || 'normal';
    const prioBadge = `<span style="background:${prioBg[prio]||'#f3f4f6'};color:${prioColor[prio]||'#374151'};border-radius:99px;font-size:.68rem;font-weight:700;padding:2px 8px">${prio}</span>`;
    const aktifBadge = isAktif
      ? `<span style="background:#D1FAE5;color:#065F46;border-radius:99px;font-size:.68rem;font-weight:700;padding:2px 8px">✅ Aktif</span>`
      : `<span style="background:#F3F4F6;color:#9CA3AF;border-radius:99px;font-size:.68rem;font-weight:700;padding:2px 8px">⛔ Nonaktif</span>`;
    const tglStr = [p.tanggal_publish, p.tanggal_turun].filter(Boolean).map(fmtTglPgm).join(' → ');
    const changeBadge = p._d?'<span class="chg chg-d">Hapus</span>':p._n?'<span class="chg chg-a">Baru</span>':p._m?'<span class="chg chg-m">Diubah</span>':'';

    return `<div class="panel ${cls}" id="pgm-panel-${p._i}">
      <div class="ph2">
        <span class="ph2-i">📣</span>
        <span class="ph2-t">${esc(p.judul||'(tanpa judul)')}</span>
        <span class="ph2-s">${tglStr ? '📅 '+tglStr : ''}</span>
        ${prioBadge} ${aktifBadge} ${changeBadge}
        <div style="margin-left:auto;display:flex;gap:5px">
          ${!p._d
            ? `<button class="btn-ar" onclick="openEditPgmModal(${p._i})" style="padding:3px 9px;font-size:.68rem">✏️ Edit</button>
               <button class="btn-ar" onclick="delPgm(${p._i})" style="padding:3px 9px;font-size:.68rem;color:var(--rd)">🗑️ Hapus</button>`
            : `<button class="btn-ar" onclick="restPgm(${p._i})" style="padding:3px 9px;font-size:.68rem">↩ Batalkan Hapus</button>`}
        </div>
      </div>
      <div class="pb" style="padding:10px 16px;font-size:.82rem;color:var(--gd)">
        ${p.deskripsi ? `<p style="margin-bottom:4px">${esc(p.deskripsi).substring(0,120)}${p.deskripsi.length>120?'…':''}</p>` : ''}
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;font-size:.75rem;color:var(--gm)">
          ${p.waktu_kegiatan  ? `<span>⏰ ${p.waktu_kegiatan}</span>` : ''}
          ${p.lokasi_kegiatan ? `<span>📍 ${p.lokasi_kegiatan}</span>` : ''}
          ${p.tag             ? `<span>🏷️ ${p.tag}</span>` : ''}
          ${p.efek_poster && p.efek_poster !== 'none' ? `<span>✨ Efek: ${p.efek_poster}</span>` : ''}
          ${p.poster_url      ? `<span>🖼️ Ada poster</span>` : ''}
          <a href="pengumuman.html?id=${encodeURIComponent(p.id||p.judul||'')}" target="_blank" style="color:var(--pm);font-weight:600">🔗 Lihat di publik →</a>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openNewPgmModal() {
  document.getElementById('pgm_idx').value = 'new';
  document.getElementById('pgmModalTitle').textContent = 'Tambah Pengumuman';
  PGM_FIELDS.forEach(f => {
    const el = document.getElementById('pgm_'+f);
    if (!el) return;
    if (el.tagName === 'SELECT') el.value = f==='aktif' ? 'TRUE' : f==='prioritas' ? 'normal' : 'none';
    else el.value = '';
  });
  // Default tanggal publish = hari ini
  const tplEl = document.getElementById('pgm_tanggal_publish');
  if (tplEl) tplEl.value = S.today;
  openModal('pgmModal');
}

function openEditPgmModal(i) {
  const p = S.pgm.find(p=>p._i===i); if(!p) return;
  document.getElementById('pgm_idx').value = i;
  document.getElementById('pgmModalTitle').textContent = 'Edit Pengumuman';
  PGM_FIELDS.forEach(f => {
    const el = document.getElementById('pgm_'+f);
    if (!el) return;
    el.value = p[f] || (f==='aktif'?'TRUE':f==='prioritas'?'normal':f==='efek_poster'?'none':'');
  });
  openModal('pgmModal');
}

function savePgm() {
  const idx = document.getElementById('pgm_idx').value;
  const judul = (document.getElementById('pgm_judul')?.value||'').trim();
  if (!judul) { toast('Judul pengumuman wajib diisi', 'error'); return; }

  const nd = {};
  PGM_FIELDS.forEach(f => {
    const el = document.getElementById('pgm_'+f);
    nd[f] = el ? el.value.trim() : '';
  });

  if (idx === 'new') {
    const ni = Date.now();
    // Buat id unik: judul_tanggalPublish
    nd.id = (nd.judul||'pgm').replace(/[^a-zA-Z0-9]/g,'_').substring(0,20) + '_' + (nd.tanggal_publish||S.today);
    S.pgm.push({...nd, _i:ni, _m:false, _n:true, _d:false});
    logC('add', 'pengumuman', ni, nd.judul);
  } else {
    const pidx = S.pgm.findIndex(p=>p._i===+idx);
    if (pidx >= 0) {
      S.pgm[pidx] = {...S.pgm[pidx], ...nd, _m:true};
      logC('edit', 'pengumuman', +idx, nd.judul);
    }
  }
  closeModal('pgmModal');
  renderPgm(); updateBadges();
  toast('✅ Pengumuman disimpan', 'success');
}

function delPgm(i) {
  const idx = S.pgm.findIndex(p=>p._i===i); if(idx<0) return;
  if (S.pgm[idx]._n) { S.pgm.splice(idx,1); }
  else { S.pgm[idx]._d = true; logC('del','pengumuman',i, S.pgm[idx].judul||'Pengumuman'); }
  renderPgm(); updateBadges();
  toast('🗑️ Ditandai untuk dihapus', 'warning');
}

function restPgm(i) {
  const idx = S.pgm.findIndex(p=>p._i===i); if(idx<0) return;
  S.pgm[idx]._d = false;
  S.changes = S.changes.filter(c=>!(c.sh==='pengumuman'&&c.idx===i&&c.a==='del'));
  renderPgm(); updateBadges();
  toast('↩ Pengumuman dipulihkan');
}

/* ═══════════════════════════════════════════════════════════
   LAPORAN KEHADIRAN ANGGOTA
   Sumber: S.ang (anggota) + S.dok (dokumentasi sesi)
   Kolom: Nama | Kelas | Angkatan | Proker | Keterangan Sesi | Materi | Tanggal | Waktu
═══════════════════════════════════════════════════════════ */
function printLaporanAnggota() {
  const org      = (typeof CONTENT !== 'undefined' && CONTENT.org) ? CONTENT.org : {};
  const now      = new Date();
  const tglCetak = now.toLocaleDateString('id-ID', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });

  const BULAN_P = ['Januari','Februari','Maret','April','Mei','Juni',
                   'Juli','Agustus','September','Oktober','November','Desember'];
  function fmtTglPanjang(str) {
    if (!str) return '–';
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return str;
    const d = new Date(+m[1], +m[2]-1, +m[3]);
    const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN_P[d.getMonth()]} ${d.getFullYear()}`;
  }

  // Anggota aktif, urutkan nama
  const anggota = S.ang
    .filter(a => !a._d)
    .sort((a,b) => {
      const ak = a.angkatan || '', bk = b.angkatan || '';
      if (ak !== bk) return ak.localeCompare(bk, undefined, { numeric: true });
      return (a.nama||'').localeCompare(b.nama||'', 'id');
    });

  // Sesi dokumentasi yang aktif
  const sesiList = S.dok.filter(d => !d._d);

  // Helper: cek apakah nama ada di string CSV (hadir_peserta/panitia/narasumber)
  function namaHadir(csvStr, nama) {
    if (!csvStr || !nama) return false;
    const lower = nama.toLowerCase().trim();
    return csvStr.split(',').some(n => n.trim().toLowerCase() === lower);
  }

  // Bangun baris tabel per anggota
  let noGlobal = 0;
  const rows = [];

  anggota.forEach(a => {
    // Cari semua sesi yang dihadiri anggota ini
    const sesiHadir = sesiList.filter(d =>
      namaHadir(d.hadir_peserta,    a.nama) ||
      namaHadir(d.hadir_panitia,    a.nama) ||
      namaHadir(d.hadir_narasumber, a.nama)
    ).sort((a,b) => (a.tanggal_sesi > b.tanggal_sesi ? 1 : -1));

    if (sesiHadir.length === 0) {
      // Anggota tanpa kehadiran — tampilkan satu baris kosong
      noGlobal++;
      rows.push(`<tr>
        <td class="num">${noGlobal}</td>
        <td class="bold">${a.nama || '–'}</td>
        <td>${a.kelas || '–'}</td>
        <td>${a.angkatan || '–'}</td>
        <td colspan="5" class="nil" style="text-align:center;font-style:italic">Belum ada kehadiran tercatat</td>
      </tr>`);
      return;
    }

    sesiHadir.forEach((d, si) => {
      noGlobal++;
      const prokerInfo = PK[d.proker_id] || { n:'Proker '+d.proker_id, i:'📌' };
      const namaProker = `${prokerInfo.i} #${d.proker_id} ${prokerInfo.n}`;
      const waktu      = d.waktu_mulai
        ? d.waktu_mulai + (d.waktu_selesai ? ' – ' + d.waktu_selesai : '')
        : '–';
      const isFirst    = si === 0;
      const spanAttr   = isFirst ? ` rowspan="${sesiHadir.length}"` : '';

      rows.push(`<tr${si > 0 ? ' class="cont"' : ''}>
        <td class="num">${noGlobal}</td>
        ${isFirst ? `
        <td class="bold"${spanAttr}>${a.nama || '–'}</td>
        <td${spanAttr}>${a.kelas || '–'}</td>
        <td${spanAttr}>${a.angkatan || '–'}</td>` : ''}
        <td class="proker-cell">${namaProker}</td>
        <td>${d.keterangan || '–'}</td>
        <td class="materi-cell">${d.materi || '–'}</td>
        <td class="tgl-cell">${fmtTglPanjang(d.tanggal_sesi)}</td>
        <td class="waktu-cell">${waktu}</td>
      </tr>`);
    });
  });

  // Ringkasan stats
  const totalAnggota  = anggota.length;
  const totalHadir    = anggota.filter(a =>
    sesiList.some(d =>
      namaHadir(d.hadir_peserta,a.nama) ||
      namaHadir(d.hadir_panitia,a.nama) ||
      namaHadir(d.hadir_narasumber,a.nama)
    )
  ).length;
  const totalKehadiran = rows.filter(r => !r.includes('Belum ada')).length;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Laporan Kehadiran Anggota — JCOSASI</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:297mm;min-height:210mm}
body{
  font-family:'Segoe UI',Arial,sans-serif;
  font-size:9.5pt; color:#111827; line-height:1.5;
  padding:12mm 14mm 12mm;
}

/* KOP */
.kop{display:flex;align-items:center;gap:14px;border-bottom:3px solid #3D1A5E;padding-bottom:10px;margin-bottom:4px}
.kop-logo{width:46px;height:46px;flex-shrink:0;border-radius:7px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:20pt}
.kop-logo img{width:100%;height:100%;object-fit:contain}
.kop-org{font-size:12pt;font-weight:800;color:#3D1A5E}
.kop-sub{font-size:7.5pt;color:#6B7280}
.kop-right{margin-left:auto;text-align:right;font-size:7pt;color:#9CA3AF}

/* JUDUL */
.lap-title{text-align:center;margin:10px 0 2px;font-size:12pt;font-weight:800;color:#2c0a4a;text-transform:uppercase;letter-spacing:.5px}
.lap-sub{text-align:center;font-size:8.5pt;color:#6B7280;margin-bottom:10px}
hr{border:none;border-top:1px solid #E5E7EB;margin:8px 0}

/* SUMMARY */
.sum-box{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid #DDD6FE;border-radius:7px;overflow:hidden;margin-bottom:14px}
.sb-item{padding:8px 12px;text-align:center;border-right:1px solid #DDD6FE}
.sb-item:last-child{border-right:none}
.sb-num{display:block;font-size:15pt;font-weight:800;color:#3D1A5E;line-height:1}
.sb-label{display:block;font-size:6.5pt;color:#9CA3AF;text-transform:uppercase;letter-spacing:.05em;margin-top:2px}

/* TABEL */
table{width:100%;border-collapse:collapse;font-size:8.5pt}
thead tr th{
  background:#3D1A5E;color:#fff;
  padding:6px 7px;text-align:left;font-weight:600;font-size:7.5pt;
  letter-spacing:.03em;white-space:nowrap;
}
tbody tr td{padding:5px 7px;border-bottom:1px solid #F3F4F6;vertical-align:top}
tbody tr.cont td{border-top:none}
tbody tr:last-child td{border-bottom:none}
tbody tr:nth-child(odd) td{background:#FAFAFA}
tbody tr.cont:nth-child(odd) td{background:#FAFAFA}

/* Kolom khusus */
.num{text-align:center;color:#9CA3AF;font-size:7.5pt;width:28px;white-space:nowrap}
.bold{font-weight:700;color:#111827}
.proker-cell{font-size:8pt;color:#3D1A5E;font-weight:600}
.materi-cell{font-size:7.5pt;color:#4B5563;font-style:italic;max-width:160px}
.tgl-cell{white-space:nowrap;font-size:8pt}
.waktu-cell{white-space:nowrap;font-size:8pt;text-align:center}
.nil{color:#D1D5DB}

/* Garis pemisah anggota */
tbody tr:not(.cont) td{border-top:2px solid #E5E7EB}
tbody tr:first-child td{border-top:none}

/* PRINT */
.print-btn{position:fixed;bottom:20px;right:20px;background:#3D1A5E;color:#fff;border:none;border-radius:99px;padding:9px 20px;font-size:9.5pt;font-weight:600;cursor:pointer;font-family:'Segoe UI',Arial,sans-serif;box-shadow:0 4px 14px rgba(61,26,94,.35)}
.print-btn:hover{background:#6B34AF}
@media print{
  html,body{width:297mm}
  body{padding:8mm 10mm}
  .print-btn{display:none}
  tbody tr{page-break-inside:avoid}
}
.sg-overlay{position:fixed;inset:0;z-index:9999;background:rgba(20,10,40,.72);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px}
.sg-box{background:#fff;border-radius:14px;padding:26px 30px;max-width:400px;width:100%;text-align:center;font-family:'Segoe UI',Arial,sans-serif}
.sg-icon{font-size:2.2rem;margin-bottom:8px}.sg-title{font-size:13pt;font-weight:700;color:#3D1A5E;margin-bottom:6px}
.sg-fname{display:inline-block;background:#f5eeff;color:#3D1A5E;border-radius:6px;padding:3px 12px;font-family:'Courier New',monospace;font-size:8pt;margin-bottom:14px;word-break:break-all}
.sg-steps{text-align:left;font-size:8.5pt;color:#333;line-height:1.9;padding-left:16px;margin-bottom:12px}.sg-steps li strong{color:#3D1A5E}
.sg-tip{font-size:7.5pt;color:#777;background:#fffbea;border:1px solid #ffe082;border-radius:6px;padding:6px 10px;margin-bottom:14px}
.sg-btn{background:#3D1A5E;color:#fff;border:none;border-radius:99px;padding:9px 26px;font-size:9.5pt;font-weight:600;cursor:pointer}
.sg-btn:hover{background:#6B34AF}
@media print{.sg-overlay{display:none!important}}
</style>
</head>
<body>

<div class="kop">
  <div class="kop-logo">
    <img src="${window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/logo-jcosasi.png')}"
         alt="J" onerror="this.style.display='none';this.parentElement.textContent='🎌'"/>
  </div>
  <div>
    <div class="kop-org">${org.nama_lengkap || 'JCOSASI'}</div>
    <div class="kop-sub">${org.sekolah || 'SMKN 1 Cikarang Barat'} · Periode 2026–2027</div>
  </div>
  <div class="kop-right">Dicetak: ${tglCetak}</div>
</div>

<div class="lap-title">Laporan Kehadiran Anggota</div>
<div class="lap-sub">Rekap keikutsertaan anggota dalam kegiatan JCOSASI · ${totalAnggota} anggota</div>
<hr/>

<div class="sum-box">
  <div class="sb-item">
    <span class="sb-num">${totalAnggota}</span>
    <span class="sb-label">Total Anggota</span>
  </div>
  <div class="sb-item">
    <span class="sb-num" style="color:#065F46">${totalHadir}</span>
    <span class="sb-label">Pernah Hadir</span>
  </div>
  <div class="sb-item">
    <span class="sb-num" style="color:#6D28D9">${totalKehadiran}</span>
    <span class="sb-label">Total Kehadiran</span>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:28px">No</th>
      <th style="width:130px">Nama</th>
      <th style="width:70px">Kelas</th>
      <th style="width:60px">Angkatan</th>
      <th style="width:160px">Nama Proker</th>
      <th>Keterangan Sesi</th>
      <th style="width:160px">Materi</th>
      <th style="width:130px">Tanggal</th>
      <th style="width:80px;text-align:center">Waktu</th>
    </tr>
  </thead>
  <tbody>
    ${rows.join('')}
  </tbody>
</table>

<button class="print-btn" onclick="showGuide('Laporan-Kehadiran-Anggota-JCOSASI.pdf')">🖨️ Cetak / Simpan PDF</button>

<script>
function showGuide(fn){
  var o=document.createElement('div');o.className='sg-overlay';
  o.innerHTML='<div class="sg-box"><div class="sg-icon">🖨️</div>'
    +'<div class="sg-title">Simpan sebagai PDF</div>'
    +'<div class="sg-fname">'+fn+'</div>'
    +'<ol class="sg-steps"><li>Klik <strong>Lanjut Cetak</strong></li>'
    +'<li>Ubah <strong>Destination</strong> → <strong>Save as PDF</strong></li>'
    +'<li>Pilih orientasi <strong>Landscape</strong></li>'
    +'<li>Klik <strong>Save</strong></li></ol>'
    +'<div class="sg-tip">💡 Orientasi <strong>Landscape (Mendatar)</strong> agar semua kolom muat</div>'
    +'<button class="sg-btn" onclick="doPrint()">🖨️ Lanjut Cetak</button></div>';
  document.body.appendChild(o);
  o.addEventListener('click',function(e){if(e.target===o)o.remove();});
}
function doPrint(){var el=document.querySelector('.sg-overlay');if(el)el.remove();setTimeout(function(){window.print();},150);}
</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini.'); return; }
  win.document.write(html);
  win.document.close();
}

/* ═══════════════════════════════════════════════════════════
   LAPORAN KEHADIRAN SATU ANGGOTA
   Tanpa kolom Nama — header menampilkan identitas anggota
═══════════════════════════════════════════════════════════ */
function printLaporanSatuAnggota(idx) {
  const a = S.ang.find(a => a._i === idx);
  if (!a) return;

  const org      = (typeof CONTENT !== 'undefined' && CONTENT.org) ? CONTENT.org : {};
  const now      = new Date();
  const tglCetak = now.toLocaleDateString('id-ID', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });
  const BULAN_P  = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];
  function fmtTglPanjang(str) {
    if (!str) return '–';
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return str;
    const d = new Date(+m[1], +m[2]-1, +m[3]);
    const H = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    return `${H[d.getDay()]}, ${d.getDate()} ${BULAN_P[d.getMonth()]} ${d.getFullYear()}`;
  }
  function namaHadir(csv, nama) {
    if (!csv || !nama) return false;
    const lo = nama.toLowerCase().trim();
    return csv.split(',').some(n => n.trim().toLowerCase() === lo);
  }

  const sesiHadir = S.dok
    .filter(d => !d._d && (
      namaHadir(d.hadir_peserta,    a.nama) ||
      namaHadir(d.hadir_panitia,    a.nama) ||
      namaHadir(d.hadir_narasumber, a.nama)
    ))
    .sort((a,b) => (a.tanggal_sesi > b.tanggal_sesi ? 1 : -1));

  const rows = sesiHadir.length === 0
    ? `<tr><td colspan="6" style="text-align:center;font-style:italic;color:#9CA3AF;padding:20px">Belum ada kehadiran tercatat</td></tr>`
    : sesiHadir.map((d, i) => {
        const prokerInfo = PK[d.proker_id] || { n:'Proker '+d.proker_id, i:'📌' };
        const waktu = d.waktu_mulai
          ? d.waktu_mulai + (d.waktu_selesai ? ' – ' + d.waktu_selesai : '')
          : '–';
        return `<tr>
          <td class="num">${i + 1}</td>
          <td class="proker-cell">${prokerInfo.i} #${d.proker_id} ${prokerInfo.n}</td>
          <td>${d.keterangan || '–'}</td>
          <td class="materi-cell">${d.materi || '–'}</td>
          <td class="tgl-cell">${fmtTglPanjang(d.tanggal_sesi)}</td>
          <td class="waktu-cell">${waktu}</td>
        </tr>`;
      }).join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>Laporan Kehadiran — ${a.nama || 'Anggota'}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:210mm;min-height:297mm}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:10pt;color:#111827;line-height:1.55;padding:16mm 18mm 14mm}

/* KOP */
.kop{display:flex;align-items:center;gap:14px;border-bottom:3px solid #3D1A5E;padding-bottom:10px;margin-bottom:4px}
.kop-logo{width:48px;height:48px;flex-shrink:0;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:20pt}
.kop-logo img{width:100%;height:100%;object-fit:contain}
.kop-org{font-size:12.5pt;font-weight:800;color:#3D1A5E}
.kop-sub{font-size:8pt;color:#6B7280}
.kop-right{margin-left:auto;text-align:right;font-size:7.5pt;color:#9CA3AF}
.lap-title{text-align:center;margin:10px 0 2px;font-size:13pt;font-weight:800;color:#2c0a4a;text-transform:uppercase;letter-spacing:.5px}
.lap-sub{text-align:center;font-size:9pt;color:#6B7280;margin-bottom:12px}
hr{border:none;border-top:1px solid #E5E7EB;margin:8px 0}

/* KARTU IDENTITAS */
.id-card{
  display:grid;grid-template-columns:1fr 1fr 1fr;
  gap:0;border:1.5px solid #DDD6FE;border-radius:8px;
  overflow:hidden;margin-bottom:16px;
}
.id-item{padding:10px 16px;border-right:1px solid #DDD6FE}
.id-item:last-child{border-right:none}
.id-label{font-size:7pt;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
.id-val{font-size:10.5pt;font-weight:700;color:#1F2937}
.id-val.name{font-size:13pt;color:#3D1A5E;font-family:'Segoe UI',Arial,sans-serif}

/* STATS */
.stat-row{display:flex;gap:10px;margin-bottom:14px}
.stat-box{flex:1;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:7px;padding:8px 14px;text-align:center}
.stat-num{display:block;font-size:18pt;font-weight:800;color:#3D1A5E;line-height:1}
.stat-lbl{display:block;font-size:7pt;color:#9CA3AF;text-transform:uppercase;letter-spacing:.05em;margin-top:2px}

/* TABEL */
table{width:100%;border-collapse:collapse;font-size:9.5pt}
thead tr th{background:#3D1A5E;color:#fff;padding:6px 9px;text-align:left;font-weight:600;font-size:8.5pt;letter-spacing:.03em}
tbody tr td{padding:6px 9px;border-bottom:1px solid #F3F4F6;vertical-align:top}
tbody tr:nth-child(even) td{background:#FAFAFA}
tbody tr:last-child td{border-bottom:none}
.num{text-align:center;color:#9CA3AF;font-size:8pt;width:30px}
.proker-cell{font-size:8.5pt;color:#3D1A5E;font-weight:600}
.materi-cell{font-size:8pt;color:#4B5563;font-style:italic}
.tgl-cell{white-space:nowrap;font-size:8.5pt}
.waktu-cell{white-space:nowrap;text-align:center;font-size:8.5pt}

/* TTD */
.ttd-area{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:28px}
.ttd-box{text-align:center;border:1px solid #ddd;border-radius:6px;padding:8px 12px}
.ttd-role{font-size:8.5pt;font-weight:700;color:#3D1A5E;margin-bottom:44px}
.ttd-line{border-top:1px solid #555}
.ttd-name{font-size:8pt;color:#555;margin-top:4px}

/* PRINT */
.print-btn{position:fixed;bottom:20px;right:20px;background:#3D1A5E;color:#fff;border:none;border-radius:99px;padding:10px 22px;font-size:10pt;font-weight:600;cursor:pointer;font-family:'Segoe UI',Arial,sans-serif;box-shadow:0 4px 14px rgba(61,26,94,.3)}
.print-btn:hover{background:#6B34AF}
@media print{body{padding:10mm 13mm}.print-btn{display:none}}
.sg-overlay{position:fixed;inset:0;z-index:9999;background:rgba(20,10,40,.72);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px}
.sg-box{background:#fff;border-radius:14px;padding:26px 30px;max-width:400px;width:100%;text-align:center;font-family:'Segoe UI',Arial,sans-serif}
.sg-icon{font-size:2.2rem;margin-bottom:8px}.sg-title{font-size:13pt;font-weight:700;color:#3D1A5E;margin-bottom:6px}
.sg-fname{display:inline-block;background:#f5eeff;color:#3D1A5E;border-radius:6px;padding:3px 12px;font-family:'Courier New',monospace;font-size:8pt;margin-bottom:14px;word-break:break-all}
.sg-steps{text-align:left;font-size:8.5pt;color:#333;line-height:1.9;padding-left:16px;margin-bottom:12px}.sg-steps li strong{color:#3D1A5E}
.sg-tip{font-size:7.5pt;color:#777;background:#fffbea;border:1px solid #ffe082;border-radius:6px;padding:6px 10px;margin-bottom:14px}
.sg-btn{background:#3D1A5E;color:#fff;border:none;border-radius:99px;padding:9px 26px;font-size:9.5pt;font-weight:600;cursor:pointer}
.sg-btn:hover{background:#6B34AF}
@media print{.sg-overlay{display:none!important}}
</style>
</head>
<body>

<div class="kop">
  <div class="kop-logo">
    <img src="${window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/logo-jcosasi.png')}"
         alt="J" onerror="this.style.display='none';this.parentElement.textContent='🎌'"/>
  </div>
  <div>
    <div class="kop-org">${org.nama_lengkap || 'JCOSASI'}</div>
    <div class="kop-sub">${org.sekolah || 'SMKN 1 Cikarang Barat'} · Periode 2026–2027</div>
  </div>
  <div class="kop-right">Dicetak: ${tglCetak}</div>
</div>

<div class="lap-title">Laporan Kehadiran Anggota</div>
<div class="lap-sub">Rekap keikutsertaan dalam kegiatan JCOSASI</div>
<hr/>

<div class="id-card">
  <div class="id-item" style="grid-column:1/-1;border-bottom:1px solid #DDD6FE">
    <div class="id-label">Nama Lengkap</div>
    <div class="id-val name">${a.nama || '–'}</div>
  </div>
  <div class="id-item">
    <div class="id-label">Kelas</div>
    <div class="id-val">${a.kelas || '–'}</div>
  </div>
  <div class="id-item">
    <div class="id-label">Angkatan</div>
    <div class="id-val">${a.angkatan || '–'}</div>
  </div>
  <div class="id-item">
    <div class="id-label">Status</div>
    <div class="id-val">${a.status || '–'}</div>
  </div>
</div>

<div class="stat-row">
  <div class="stat-box">
    <span class="stat-num" style="color:#065F46">${sesiHadir.length}</span>
    <span class="stat-lbl">Kegiatan Dihadiri</span>
  </div>
  <div class="stat-box">
    <span class="stat-num" style="color:#6D28D9">${[...new Set(sesiHadir.map(d=>d.proker_id))].length}</span>
    <span class="stat-lbl">Proker Diikuti</span>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:30px">No</th>
      <th style="width:160px">Nama Proker</th>
      <th>Keterangan Sesi</th>
      <th style="width:160px">Materi</th>
      <th style="width:140px">Tanggal</th>
      <th style="width:90px;text-align:center">Waktu</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div class="ttd-area">
  <div class="ttd-box">
    <div class="ttd-role">Mengetahui,<br/>Pembina JCOSASI</div>
    <hr class="ttd-line"/>
    <div class="ttd-name">( _________________________ )</div>
  </div>
  <div class="ttd-box">
    <div class="ttd-role">Yang bersangkutan</div>
    <hr class="ttd-line"/>
    <div class="ttd-name">( ${a.nama || '_________________________'} )</div>
  </div>
</div>

<button class="print-btn" onclick="showGuide('Laporan-${(a.nama||'Anggota').replace(/[^a-zA-Z0-9]/g,'-')}-JCOSASI.pdf')">🖨️ Cetak / Simpan PDF</button>

<script>
function showGuide(fn){
  var o=document.createElement('div');o.className='sg-overlay';
  o.innerHTML='<div class="sg-box"><div class="sg-icon">🖨️</div>'
    +'<div class="sg-title">Simpan sebagai PDF</div>'
    +'<div class="sg-fname">'+fn+'</div>'
    +'<ol class="sg-steps"><li>Klik <strong>Lanjut Cetak</strong></li>'
    +'<li>Ubah <strong>Destination</strong> → <strong>Save as PDF</strong></li>'
    +'<li>Klik <strong>Save</strong></li></ol>'
    +'<div class="sg-tip">💡 Orientasi <strong>Portrait</strong> untuk hasil terbaik</div>'
    +'<button class="sg-btn" onclick="doPrint()">🖨️ Lanjut Cetak</button></div>';
  document.body.appendChild(o);
  o.addEventListener('click',function(e){if(e.target===o)o.remove();});
}
function doPrint(){var el=document.querySelector('.sg-overlay');if(el)el.remove();setTimeout(function(){window.print();},150);}
</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini.'); return; }
  win.document.write(html);
  win.document.close();
}

/* ═══════════════════════════════════════════════════════════
   PENCAPAIAN — konstanta, render, CRUD, modal batch
═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   PANDUAN PENILAIAN PENCAPAIAN
   Edit konstanta ini untuk mengubah aturan poin & emblem.
   Setiap kategori muncul sebagai accordion di modal.
═══════════════════════════════════════════════════════════ */
const SCORING_GUIDE = [
  {
    kategori: '📚 Akademik — Sertifikasi JLPT',
    emblem: '📚',
    keterangan: 'Poin diberikan berdasarkan level JLPT yang dicapai. N5 dan N1 mendapat bonus poin lebih besar.',
    items: [
      { label: 'JLPT N5',                     poin: 10,  catatan: 'Breaking point — langkah pertama sertifikasi resmi' },
      { label: 'JLPT N4',                     poin: 5,   catatan: 'Peningkatan dari N5' },
      { label: 'JLPT N3',                     poin: 5,   catatan: 'Level menengah' },
      { label: 'JLPT N2',                     poin: 5,   catatan: 'Level lanjut' },
      { label: 'JLPT N1',                     poin: 10,  catatan: 'Highest achievement — sertifikasi tertinggi' },
    ]
  },
  {
    kategori: '🏆 Prestasi — Lomba & Kompetisi',
    emblem: '🏆',
    keterangan: 'Poin diberikan berdasarkan tingkat dan posisi pada lomba.',
    items: [
      { label: 'Juara 1 tingkat sekolah',      poin: 5,   catatan: '' },
      { label: 'Juara 2 tingkat sekolah',      poin: 3,   catatan: '' },
      { label: 'Juara 3 tingkat sekolah',      poin: 2,   catatan: '' },
      { label: 'Juara 1 tingkat kota/kab.',    poin: 10,  catatan: '' },
      { label: 'Juara 2 tingkat kota/kab.',    poin: 7,   catatan: '' },
      { label: 'Juara 3 tingkat kota/kab.',    poin: 5,   catatan: '' },
      { label: 'Juara 1 tingkat provinsi+',    poin: 15,  catatan: 'Provinsi, nasional, atau internasional' },
      { label: 'Finalis / peserta lomba',      poin: 2,   catatan: 'Sekadar berpartisipasi' },
    ]
  },
  {
    kategori: '🎯 Kontribusi — Organisasi & Kegiatan',
    emblem: '🎯',
    keterangan: 'Poin untuk kontribusi aktif dalam kegiatan JCOSASI.',
    items: [
      { label: 'Menjadi panitia kegiatan',     poin: 3,   catatan: 'Per kegiatan' },
      { label: 'Menjadi pemateri / pembicara', poin: 5,   catatan: 'Per sesi' },
      { label: 'Kehadiran penuh 1 semester',   poin: 5,   catatan: 'Tidak pernah absen tanpa izin' },
      { label: 'Membawa anggota baru',         poin: 2,   catatan: 'Per anggota yang berhasil bergabung' },
    ]
  },
  {
    kategori: '🌸 Budaya Jepang — Karya & Kreasi',
    emblem: '🌸',
    keterangan: 'Poin untuk karya atau kontribusi dalam bidang budaya Jepang.',
    items: [
      { label: 'Membuat konten budaya Jepang', poin: 3,   catatan: 'Dipublikasikan ke media sosial JCOSASI' },
      { label: 'Cosplay / Nihon no Hi',        poin: 3,   catatan: 'Berpartisipasi dalam acara budaya' },
      { label: 'Karya seni / fan art',         poin: 2,   catatan: 'Per karya yang dipamerkan' },
    ]
  },
  {
    kategori: '💎 Kontribusi Istimewa',
    emblem: '💎',
    keterangan: 'Poin khusus untuk kontribusi luar biasa yang tidak termasuk kategori di atas.',
    items: [
      { label: 'Kontribusi luar biasa',        poin: 0,   catatan: 'Poin ditentukan oleh pengurus — tidak ada standar baku' },
    ]
  },
];

/* ─── Render panduan ke dalam accordion ─── */
function renderCapGuide() {
  const body = document.getElementById('capGuideBody');
  if (!body) return;
  body.innerHTML = SCORING_GUIDE.map(cat => `
    <div class="cg-category">
      <div class="cg-cat-header">
        <span class="cg-cat-emblem">${cat.emblem}</span>
        <span class="cg-cat-title">${cat.kategori}</span>
      </div>
      ${cat.keterangan ? `<div class="cg-cat-ket">${cat.keterangan}</div>` : ''}
      <table class="cg-table">
        <thead><tr><th>Pencapaian</th><th>Poin</th><th>Catatan</th></tr></thead>
        <tbody>
          ${cat.items.map(it => `<tr>
            <td>${it.label}</td>
            <td class="cg-poin${it.poin > 0 ? '' : ' cg-poin-custom'}">${it.poin > 0 ? '+' + it.poin : '—'}</td>
            <td class="cg-catatan">${it.catatan || ''}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `).join('');
}

function toggleCapGuide() {
  const body    = document.getElementById('capGuideBody');
  const chevron = document.getElementById('capGuideChevron');
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display  = open ? 'none' : 'block';
  if (chevron) chevron.textContent = open ? '▾' : '▴';
}

/* Init emblem grid saat DOM ready */
document.addEventListener('DOMContentLoaded', function() {
  const grid = document.getElementById('capEmblemGrid');
  if (!grid) return;
  EMBLEM_LIST.forEach(e => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cap-emblem-btn';
    btn.dataset.icon = e.icon;
    btn.onclick = function() { selectEmblem(this, 'cap_emblem_val', 'capEmblemGrid'); };
    btn.innerHTML = `<span>${e.icon}</span><small>${e.label}</small>`;
    grid.appendChild(btn);
  });
});

function selectEmblem(btn, valId, gridId) {
  const grid = document.getElementById(gridId || 'capEmblemGrid');
  if (grid) grid.querySelectorAll('.cap-emblem-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const input = document.getElementById(valId || 'cap_emblem_val');
  if (input) input.value = btn.dataset.icon || '';
}

/* ID autoincrement untuk pencapaian */
function nextCapId() {
  const maxId = (S.cap || []).reduce((max, c) => {
    const n = parseInt(c.id, 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  return maxId + 1;
}

const EMBLEM_LIST = [
  { icon:'🏆', label:'Prestasi / Juara' },
  { icon:'🎯', label:'Target Tercapai' },
  { icon:'🎤', label:'Pembicara' },
  { icon:'📚', label:'Akademik' },
  { icon:'🌸', label:'Budaya Jepang' },
  { icon:'🏅', label:'Medali Umum' },
  { icon:'💎', label:'Kontribusi Istimewa' },
];

function fmtCapWaktu(str) {
  if (!str) return '';
  // Coba YYYY-MM-DD manual
  const ymd = typeof str === 'string' && str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = ymd ? new Date(+ymd[1], +ymd[2]-1, +ymd[3]) : new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'][d.getMonth()] + ' ' + d.getFullYear();
}

function renderCap() {
  if (!S.cap) return;
  const pend = S.cap.filter(c => c._m||c._n||c._d).length;
  const banner = document.getElementById('capBanner');
  if (banner) banner.classList.toggle('show', pend > 0);
  const bn = document.getElementById('capBannerN');
  if (bn) bn.textContent = pend;

  const container = document.getElementById('capContent');
  if (!container) return;

  // Kelompokkan per anggota, urutkan angkatan→nama
  const byAnggota = {};
  S.cap.filter(c => !c._d).forEach(c => {
    const key = (c.nama||'?') + '|' + (c.angkatan||'');
    if (!byAnggota[key]) byAnggota[key] = { nama: c.nama||'?', angkatan: c.angkatan||'', items: [] };
    byAnggota[key].items.push(c);
  });

  const grouped = Object.values(byAnggota).sort((a,b) => {
    if (a.angkatan !== b.angkatan) return a.angkatan.localeCompare(b.angkatan, undefined, {numeric:true});
    return a.nama.localeCompare(b.nama, 'id');
  });

  if (!grouped.length && !S.cap.filter(c=>c._d).length) {
    container.innerHTML = '<div class="empty"><div class="ei">🏆</div><div class="et">Belum ada pencapaian. Klik + Tambah untuk menambahkan.</div></div>';
    return;
  }

  container.innerHTML = grouped.map(g => {
    const totalPoin = g.items.reduce((s,c) => s + (+c.poin||0), 0);
    const emblems   = [...new Set(g.items.map(c=>c.emblem).filter(Boolean))].join(' ');

    const rows = g.items
      .sort((a,b) => (b.waktu||'') > (a.waktu||'') ? 1 : -1)
      .map(c => {
        const cls = c._n?'newrow':c._m?'mod':'';
        return `<div class="cap-row ${cls}">
          <span class="cap-emblem">${c.emblem||'—'}</span>
          <div class="cap-info">
            <span class="cap-pencapaian">${esc(c.pencapaian||'')}</span>
            ${c.keterangan ? `<span class="cap-ket">${esc(c.keterangan)}</span>` : ''}
          </div>
          ${c.poin ? `<span class="cap-poin">+${c.poin} poin</span>` : ''}
          <span class="cap-waktu">${fmtCapWaktu(c.waktu)}</span>
          <button class="btn-ar" style="padding:2px 7px;font-size:.68rem" onclick="openEditCap(${c._i})" title="Edit">✏️</button>
          <button class="btn-del" onclick="delCap(${c._i})" title="Hapus">🗑️</button>
        </div>`;
      }).join('');

    return `<div class="panel">
      <div class="ph2">
        <span class="ph2-i">${emblems||'🏆'}</span>
        <span class="ph2-t">${esc(g.nama)}</span>
        <span class="ph2-s">Angkatan ${g.angkatan||'–'}</span>
        ${totalPoin ? `<span style="margin-left:auto;font-size:.78rem;font-weight:700;color:var(--pm)">⭐ ${totalPoin} poin</span>` : ''}
      </div>
      <div class="pb" style="padding:10px 14px">
        <div class="cap-list">${rows}</div>
      </div>
    </div>`;
  }).join('');
}

/* ── State mode modal ── */
let _capMode = 'batch';
let _capManuals = [];       // nama manual di batch mode
let _capIndivRows = [];     // [{nama, angkatan, pencapaian, emblem, poin, ket}] di individual mode

function openCapModal() {
  _capMode    = 'batch';
  _capManuals = [];
  _capIndivRows = [];
  // Reset batch form
  ['cap_pencapaian','cap_keterangan','cap_poin'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  const wEl = document.getElementById('cap_waktu'); if(wEl) wEl.value = S.today;
  const eEl = document.getElementById('cap_emblem_val'); if(eEl) eEl.value = '';
  document.querySelectorAll('#capEmblemGrid .cap-emblem-btn').forEach((b,i) => {
    b.classList.toggle('selected', i === 0); // pilih "Tanpa" sebagai default
  });
  const si = document.getElementById('capSearchInput'); if(si) si.value = '';
  renderCapAnggotaList('');
  renderCapManualList();
  // Switch ke batch mode
  switchCapMode('batch');
  renderCapGuide();
  openModal('capModal');
}

function switchCapMode(mode) {
  _capMode = mode;
  document.getElementById('capBatchForm').style.display = mode === 'batch' ? '' : 'none';
  document.getElementById('capIndivForm').style.display = mode === 'individual' ? '' : 'none';
  document.getElementById('capModeBatch').classList.toggle('active', mode === 'batch');
  document.getElementById('capModeIndiv').classList.toggle('active', mode === 'individual');
  if (mode === 'individual') {
    renderCapIndivRows();
    const wEl = document.getElementById('cap_waktu_indiv'); if(wEl) wEl.value = S.today;
  }
}

/* ── Batch: input manual nama ── */
function addCapManual() {
  const inp = document.getElementById('capManualInput');
  const nama = (inp?.value||'').trim(); if(!nama) return;
  if (!_capManuals.includes(nama)) _capManuals.push(nama);
  inp.value = '';
  renderCapManualList();
}
function removeCapManual(nama) {
  _capManuals = _capManuals.filter(n => n !== nama);
  renderCapManualList();
}
function renderCapManualList() {
  const el = document.getElementById('capManualList'); if(!el) return;
  el.innerHTML = _capManuals.map(n =>
    `<span class="cap-manual-tag">${esc(n)}<button onclick="removeCapManual('${esc(n).replace(/'/g,"\'")}')" title="Hapus">×</button></span>`
  ).join('');
}

/* ── Individual mode ── */
function showCapIndivDropdown(q) {
  const dd = document.getElementById('capIndivDropdown'); if (!dd) return;
  if (!q || q.length < 1) { dd.style.display = 'none'; return; }
  const found = S.ang.filter(a => !a._d && (a.nama||'').toLowerCase().includes(q.toLowerCase()))
    .sort((a,b) => (a.angkatan||'').localeCompare(b.angkatan||'', undefined, {numeric:true}) || (a.nama||'').localeCompare(b.nama||'','id'))
    .slice(0, 8);
  if (!found.length) { dd.style.display = 'none'; return; }
  dd.innerHTML = found.map(a =>
    `<div class="cap-dd-item" onclick="pickCapIndiv('${esc(a.nama).replace(/'/g,"\'")}','${esc(a.angkatan||'')}')">
      <span class="cap-dd-name">${esc(a.nama)}</span>
      <span class="cap-dd-meta">${a.kelas||''} · Angk. ${a.angkatan||'–'}</span>
    </div>`
  ).join('');
  dd.style.display = 'block';
}
function hideCapIndivDropdown() {
  const dd = document.getElementById('capIndivDropdown');
  if (dd) dd.style.display = 'none';
}
function pickCapIndiv(nama, angkatan) {
  _addIndivRow(nama, angkatan);
  const inp = document.getElementById('capIndivSearchInput');
  if (inp) inp.value = '';
  hideCapIndivDropdown();
}
// Tutup dropdown saat klik di luar
document.addEventListener('click', function(e) {
  if (!e.target.closest('#capIndivSearchInput') && !e.target.closest('#capIndivDropdown'))
    hideCapIndivDropdown();
});
function addCapIndivManual() {
  const inp = document.getElementById('capIndivManual'); if(!inp) return;
  const nama = inp.value.trim(); if(!nama) return;
  const ang = S.ang.find(a=>!a._d && (a.nama||'').toLowerCase()===nama.toLowerCase());
  _addIndivRow(nama, ang?.angkatan||'');
  inp.value = '';
}
function _addIndivRow(nama, angkatan) {
  if (_capIndivRows.find(r=>r.nama===nama)) { toast(nama+' sudah ditambahkan','warning'); return; }
  _capIndivRows.push({ nama, angkatan, pencapaian:'', emblem:'', poin:'', ket:'' });
  renderCapIndivRows();
}
function removeIndivRow(idx) {
  _capIndivRows.splice(idx,1);
  renderCapIndivRows();
}
function renderCapIndivRows() {
  const el = document.getElementById('capIndivRows'); if(!el) return;
  if (!_capIndivRows.length) {
    el.innerHTML = '<div class="fhint" style="padding:10px;text-align:center">Belum ada anggota ditambahkan.</div>';
    return;
  }
  el.innerHTML = _capIndivRows.map((r,i) => {
    const gridId  = 'capIndivEmblemGrid_'+i;
    const valId   = 'cap_indiv_emblem_'+i;
    const embtns  = EMBLEM_LIST.map(e =>
      `<button type="button" class="cap-emblem-btn cap-emblem-sm${r.emblem===e.icon?' selected':''}"
         data-icon="${e.icon}" onclick="selectEmblemIndiv(this,${i},'${valId}','${gridId}')"
         title="${e.label}"><span>${e.icon}</span></button>`
    ).join('');
    return `<div class="cap-indiv-row">
      <div class="cap-ir-header">
        <span class="cap-ir-name">${esc(r.nama)}</span>
        ${r.angkatan ? `<span class="cap-ir-ang">Angk. ${r.angkatan}</span>` : ''}
        <button class="btn-del" onclick="removeIndivRow(${i})" style="margin-left:auto">✕</button>
      </div>
      <div class="cap-ir-body">
        <input type="text" class="fi" placeholder="Nama pencapaian…" value="${esc(r.pencapaian)}"
          oninput="_capIndivRows[${i}].pencapaian=this.value" style="margin-bottom:5px"/>
        <div class="cap-ir-emblem-row">
          <input type="hidden" id="${valId}" value="${r.emblem}"/>
          <div class="cap-emblem-grid" id="${gridId}" style="gap:4px">
            <button type="button" class="cap-emblem-btn cap-emblem-sm${!r.emblem?' selected':''}"
              data-icon="" onclick="selectEmblemIndiv(this,${i},'${valId}','${gridId}')"
              title="Tanpa"><span style="font-size:.9rem;line-height:1.8">—</span></button>
            ${embtns}
          </div>
          <input type="number" class="fi" placeholder="Poin" value="${r.poin||''}" min="0"
            oninput="_capIndivRows[${i}].poin=this.value" style="width:70px;flex-shrink:0"/>
        </div>
        <input type="text" class="fi" placeholder="Keterangan (opsional)…" value="${esc(r.ket)}"
          oninput="_capIndivRows[${i}].ket=this.value" style="margin-top:5px"/>
      </div>
    </div>`;
  }).join('');
}
function selectEmblemIndiv(btn, rowIdx, valId, gridId) {
  const grid = document.getElementById(gridId);
  if(grid) grid.querySelectorAll('.cap-emblem-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  const inp = document.getElementById(valId); if(inp) inp.value = btn.dataset.icon||'';
  _capIndivRows[rowIdx].emblem = btn.dataset.icon||'';
}

function renderCapAnggotaList(q) {
  const list = document.getElementById('capAnggotaList');
  if (!list) return;
  const anggota = S.ang.filter(a => !a._d)
    .sort((a,b) => {
      if (a.angkatan !== b.angkatan) return (a.angkatan||'').localeCompare(b.angkatan||'', undefined, {numeric:true});
      return (a.nama||'').localeCompare(b.nama||'', 'id');
    });
  const filtered = q ? anggota.filter(a => (a.nama||'').toLowerCase().includes(q.toLowerCase())) : anggota;

  list.innerHTML = filtered.map(a =>
    `<label class="cap-ang-item">
      <input type="checkbox" class="cap-ang-check" value="${esc(a.nama)}" data-angkatan="${esc(a.angkatan||'')}"/>
      <span class="cap-ang-name">${esc(a.nama)}</span>
      <span class="cap-ang-meta">${a.kelas||''} · Angk. ${a.angkatan||'–'}</span>
    </label>`
  ).join('');
}

function toggleSelectAllCap() {
  const checks = document.querySelectorAll('.cap-ang-check');
  const allChecked = [...checks].every(c => c.checked);
  checks.forEach(c => c.checked = !allChecked);
}

function saveCap() {
  let added = 0;

  if (_capMode === 'batch') {
    const pencapaian = (document.getElementById('cap_pencapaian')?.value||'').trim();
    const emblem     = document.getElementById('cap_emblem_val')?.value || '';
    const poin       = document.getElementById('cap_poin')?.value || '';
    const keterangan = (document.getElementById('cap_keterangan')?.value||'').trim();
    const waktu      = document.getElementById('cap_waktu')?.value || S.today;

    if (!pencapaian && !emblem && !poin) {
      toast('Isi minimal pencapaian, emblem, atau poin', 'error'); return;
    }

    // Kumpulkan penerima: dari checklist + manual
    const checked = [...document.querySelectorAll('.cap-ang-check:checked')].map(cb => ({
      nama: cb.value, angkatan: cb.dataset.angkatan||''
    }));
    const manuals = _capManuals.map(nama => {
      const a = S.ang.find(x=>!x._d && (x.nama||'').toLowerCase()===nama.toLowerCase());
      return { nama, angkatan: a?.angkatan||'' };
    });
    // Gabung, hilangkan duplikat nama
    const penerima = [...checked];
    manuals.forEach(m => { if(!penerima.find(p=>p.nama===m.nama)) penerima.push(m); });

    if (!penerima.length) { toast('Pilih atau tambahkan minimal satu penerima', 'error'); return; }

    penerima.forEach(p => {
      const ni = Date.now() + added;
      S.cap.push({
        id: String(nextCapId() + added),
        nama: p.nama, angkatan: p.angkatan,
        pencapaian, emblem, poin: poin||'', keterangan, waktu,
        _i:ni, _m:false, _n:true, _d:false
      });
      logC('add','pencapaian',ni, p.nama+' — '+pencapaian);
      added++;
    });

  } else {
    // Individual mode
    const waktu = document.getElementById('cap_waktu_indiv')?.value || S.today;
    if (!_capIndivRows.length) { toast('Tambahkan minimal satu anggota', 'error'); return; }
    const invalid = _capIndivRows.filter(r => !r.pencapaian && !r.emblem && !r.poin);
    if (invalid.length) { toast('Lengkapi pencapaian/emblem/poin untuk semua baris', 'error'); return; }

    _capIndivRows.forEach(r => {
      const ni = Date.now() + added;
      S.cap.push({
        id: String(nextCapId() + added),
        nama: r.nama, angkatan: r.angkatan,
        pencapaian: r.pencapaian, emblem: r.emblem, poin: r.poin||'',
        keterangan: r.ket, waktu,
        _i:ni, _m:false, _n:true, _d:false
      });
      logC('add','pencapaian',ni, r.nama+' — '+r.pencapaian);
      added++;
    });
  }

  closeModal('capModal');
  renderCap(); updateBadges();
  toast(`✅ ${added} pencapaian ditambahkan`, 'success');
}

function delCap(i) {
  const idx = S.cap.findIndex(c => c._i === i); if (idx < 0) return;
  if (S.cap[idx]._n) { S.cap.splice(idx, 1); }
  else { S.cap[idx]._d = true; logC('del','pencapaian',i, S.cap[idx].nama||'Pencapaian'); }
  renderCap(); updateBadges();
  toast('🗑️ Ditandai untuk dihapus', 'warning');
}

function openEditCap(i) {
  const c = S.cap.find(c => c._i === i); if (!c) return;
  // Isi modal edit inline — pakai modal kecil terpisah
  const old = document.getElementById('capEditModal');
  if (old) old.remove();

  const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
  const embtns = [{ icon:'', label:'—' }, ...EMBLEM_LIST].map(e =>
    `<button type="button" class="cap-emblem-btn${c.emblem===e.icon?' selected':''}"
       data-icon="${e.icon}" onclick="selectEmblem(this,'cap_edit_emblem_val','capEditEmblemGrid')"
       style="padding:4px 6px;min-width:36px">
       <span>${e.icon||'—'}</span>
     </button>`
  ).join('');

  const modal = document.createElement('div');
  modal.id = 'capEditModal';
  modal.className = 'mov';
  modal.style.zIndex = '700';
  modal.innerHTML = `
    <div class="modal" style="max-width:420px">
      <div class="m-h"><span>${c.emblem||'🏆'}</span><span class="m-t">Edit Pencapaian</span>
        <button class="m-x" onclick="document.getElementById('capEditModal').remove()">✕</button></div>
      <div style="padding:2px 4px 0;font-size:.78rem;color:var(--gm);margin-bottom:8px">
        👤 <strong>${esc(c.nama)}</strong> · Angk. ${c.angkatan||'–'}
      </div>
      <div class="fg"><div class="fl">Nama Pencapaian</div>
        <input type="text" class="fi" id="cap_edit_pencapaian" value="${esc(c.pencapaian||'')}"/></div>
      <div class="fg"><div class="fl">Emblem</div>
        <input type="hidden" id="cap_edit_emblem_val" value="${c.emblem||''}"/>
        <div class="cap-emblem-grid" id="capEditEmblemGrid" style="gap:4px">${embtns}</div>
      </div>
      <div class="g2">
        <div class="fg"><div class="fl">Poin</div>
          <input type="number" class="fi" id="cap_edit_poin" value="${c.poin||''}" min="0"/></div>
        <div class="fg"><div class="fl">Tanggal</div>
          <input type="date" class="fi" id="cap_edit_waktu" value="${(c.waktu||'').slice(0,10)}"/></div>
      </div>
      <div class="fg"><div class="fl">Keterangan</div>
        <textarea class="fta" rows="2" id="cap_edit_ket">${esc(c.keterangan||'')}</textarea></div>
      <div class="m-f">
        <button class="btn-cancel" onclick="document.getElementById('capEditModal').remove()">Batal</button>
        <button class="btn-save" onclick="saveEditCap(${i})">💾 Simpan</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  // Forçar reflow antes de adicionar a classe para a transição funcionar
  void modal.offsetWidth;
  modal.classList.add('open');
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function saveEditCap(i) {
  const idx = S.cap.findIndex(c => c._i === i); if (idx < 0) return;
  S.cap[idx].pencapaian = (document.getElementById('cap_edit_pencapaian')?.value||'').trim();
  S.cap[idx].emblem     = document.getElementById('cap_edit_emblem_val')?.value || '';
  S.cap[idx].poin       = document.getElementById('cap_edit_poin')?.value || '';
  S.cap[idx].keterangan = (document.getElementById('cap_edit_ket')?.value||'').trim();
  S.cap[idx].waktu      = document.getElementById('cap_edit_waktu')?.value || S.today;
  if (!S.cap[idx]._n) { S.cap[idx]._m = true; logC('edit','pencapaian',i, S.cap[idx].nama+' — '+S.cap[idx].pencapaian); }
  document.getElementById('capEditModal')?.remove();
  renderCap(); updateBadges();
  toast('✅ Pencapaian diperbarui', 'success');
}

/* ═══════════════════════════════════════════════════════════
   FOTO DOKUMENTASI — 3 mode input
   Upload: buka Google Form di popup → deteksi popup.closed
           → UID disimpan di sessionStorage → resolve saat saveSesi
═══════════════════════════════════════════════════════════ */

const FORM_UPLOAD_BASE  = 'https://docs.google.com/forms/d/e/1FAIpQLSejpViQvqOIUojjQxG9KpkUBFwKEcNREVt4wKN5UoGqOlcd8w/viewform';
const FORM_ENTRY_UID    = 'entry.1781150924';
const FOTO_SESSION_KEY  = 'jcosasi_foto_uids'; // sessionStorage key

/* Ambil daftar UID yang pending dari sessionStorage */
function _getFotoUids() {
  try { return JSON.parse(sessionStorage.getItem(FOTO_SESSION_KEY) || '[]'); }
  catch(_) { return []; }
}
function _saveFotoUids(uids) {
  try { sessionStorage.setItem(FOTO_SESSION_KEY, JSON.stringify(uids)); }
  catch(_) {}
}
function _addFotoUid(uid, label) {
  const uids = _getFotoUids();
  uids.push({ uid, label, ts: Date.now() });
  _saveFotoUids(uids);
}
function _removeFotoUid(uid) {
  _saveFotoUids(_getFotoUids().filter(u => u.uid !== uid));
}

function _appendFotoUrl(fieldId, url) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.value = el.value.trim() ? el.value.trim() + ',' + url : url;
  renderFotoPreview(fieldId);
}

function addFotoLink(fieldId) {
  const url = prompt('Masukkan URL foto:');
  if (url && url.trim()) _appendFotoUrl(fieldId, url.trim());
}

function addFotoGdrive(fieldId) {
  const raw = prompt('Masukkan link Google Drive:');
  if (!raw || !raw.trim()) return;
  const m = raw.trim().match(/\/d\/([a-zA-Z0-9_-]+)/);
  _appendFotoUrl(fieldId, m
    ? 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w800'
    : raw.trim());
}

/* Buka Google Form di popup, pantau sampai popup ditutup */
function uploadFotoFile(fieldId) {
  const uid   = 'uid_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  const fname = 'proker_dokumentasi_' + (S.today||new Date().toISOString().slice(0,10)) + '_' + Date.now();
  const url   = FORM_UPLOAD_BASE + '?' + FORM_ENTRY_UID + '=' + encodeURIComponent(uid);

  const popup = window.open(url, 'jcosasi_upload', 'width=720,height=640,scrollbars=yes');
  if (!popup) {
    toast('⚠️ Pop-up diblokir — izinkan pop-up untuk situs ini', 'error');
    return;
  }

  // Simpan UID ke sessionStorage saat popup dibuka
  _addFotoUid(uid, fname);

  // Tampilkan status di bawah input
  _showFotoUploadStatus(fieldId, uid, popup);
}

function _showFotoUploadStatus(fieldId, uid, popup) {
  // Cari atau buat container status
  let statusEl = document.getElementById('foto_status_' + fieldId);
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'foto_status_' + fieldId;
    statusEl.className = 'foto-upload-status';
    const preview = document.getElementById(fieldId + '_preview');
    if (preview) preview.parentNode.insertBefore(statusEl, preview);
  }

  statusEl.innerHTML = `<span class="fus-dot fus-waiting"></span>
    <span class="fus-msg">Form dibuka — upload file lalu klik Submit di form…</span>`;

  // Pantau popup.closed setiap 1 detik
  const check = setInterval(() => {
    if (!popup || popup.closed) {
      clearInterval(check);
      // Popup ditutup — tandai sebagai "terkirim, menunggu konfirmasi"
      statusEl.innerHTML = `<span class="fus-dot fus-sent"></span>
        <span class="fus-msg">✅ Form terkirim — URL akan diambil saat klik Simpan</span>
        <button class="fus-cancel" onclick="_cancelFotoUid('${uid}','${fieldId}')">×</button>`;
    }
  }, 1000);

  // Timeout 10 menit — hapus status jika terlalu lama
  setTimeout(() => {
    clearInterval(check);
    if (!popup || popup.closed) return; // sudah selesai
    statusEl.innerHTML = `<span class="fus-dot fus-error"></span>
      <span class="fus-msg">Form belum disubmit — tutup popup setelah selesai upload</span>`;
  }, 10 * 60 * 1000);
}

function _cancelFotoUid(uid, fieldId) {
  _removeFotoUid(uid);
  const el = document.getElementById('foto_status_' + fieldId);
  if (el) el.remove();
}

/* Dipanggil dari saveSesi — resolve semua UID pending ke URL sebelum simpan */
async function resolveFotoUids(fieldId) {
  const uids = _getFotoUids();
  if (!uids.length) return; // tidak ada upload pending

  const el = document.getElementById(fieldId);
  if (!el) return;

  toast('⏳ Mengambil URL foto dari Drive…', 'info');

  for (const item of uids) {
    try {
      // Tanya GAS: cari URL berdasarkan upload_id di sheet responses Form
      const result = await jsonp({
        action:   'resolveFormUpload',
        uploadId: item.uid,
      });

      if (result && result.status === 'ok' && result.url) {
        const urls = result.url.split(',').filter(Boolean);
        urls.forEach(u => _appendFotoUrl(fieldId, u.trim()));
        _removeFotoUid(item.uid);
        const statusEl = document.getElementById('foto_status_' + fieldId);
        if (statusEl) statusEl.remove();
      } else {
        toast('⚠️ Foto dengan UID ' + item.uid + ' belum ditemukan di sheet', 'warning');
      }
    } catch(err) {
      console.warn('[resolveFotoUids]', err);
    }
  }
}

function renderFotoPreview(fieldId) {
  const el      = document.getElementById(fieldId);
  const preview = document.getElementById(fieldId + '_preview');
  if (!el || !preview) return;
  const urls = el.value.split(',').map(s=>s.trim()).filter(Boolean);
  if (!urls.length) { preview.innerHTML = ''; return; }
  preview.innerHTML = urls.map((url,i) => {
    const m     = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const thumb = (url.includes('thumbnail')||!m) ? url
      : 'https://drive.google.com/thumbnail?id='+m[1]+'&sz=w200';
    return `<div class="foto-thumb">
      <img src="${thumb}" alt="foto ${i+1}"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
      <div class="foto-thumb-err" style="display:none">🖼️</div>
      <button type="button" class="foto-thumb-del"
        onclick="removeFotoByIndex('${fieldId}',${i})">×</button>
    </div>`;
  }).join('');
}

function removeFotoByIndex(fieldId, idx) {
  const el = document.getElementById(fieldId); if (!el) return;
  const urls = el.value.split(',').map(s=>s.trim()).filter(Boolean);
  urls.splice(idx, 1);
  el.value = urls.join(',');
  renderFotoPreview(fieldId);
}

document.addEventListener('DOMContentLoaded', () => {
  const m = document.getElementById('sesiModal');
  if (m) new MutationObserver(() => {
    if (m.classList.contains('open')) setTimeout(()=>renderFotoPreview('e_foto'), 100);
  }).observe(m, { attributes:true, attributeFilter:['class'] });
});
