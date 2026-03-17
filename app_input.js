/* ═══════ CONFIG ═══════ */
// API_READ  → deployment read-only (gas_readonly.js) — untuk load data awal
// API_WRITE → deployment gas_v7.js  — untuk semua operasi write
// WRITE_TOKEN → harus sama persis dengan WRITE_TOKEN di gas_v7.js
const API_READ   = 'https://script.google.com/macros/s/AKfycbzwOgklEWZn6ts5--DnFpM9eqoWsUtlQ_Nux-LhmkVQ1viH0NGAG2vXcO3sLqjLVl5E/exec';
const API_WRITE  = 'https://script.google.com/macros/s/AKfycbzuzMPxoEuCDOW6LwixAWGNbadC9cpzkDYpru8R2sr-Ia4fCrZuTW85xvcXeqppxjAL/exec';
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
  proker_jadwal:       ['id','proker_id','tanggal','jam','delete_flag'],
  proker_detail:       ['id','proker_id','tujuan','waktu_teks','estimasi_tanggal','lokasi','sasaran','pemateri','panitia','item_biaya','estimasi_biaya_item','biaya_aktual','delete_flag'],
  proker_notif_config: ['id','proker_id','countdown_aktif','ajakan','ajakan_teks','ajakan_sub','wajib_hadir','wajib_hadir_teks','wajib_hadir_sanksi','delete_flag'],
  anggota:             ['id','nama','kelas','angkatan','status','no_hp','catatan','delete_flag'],
  pengurus:            ['jabatan_level','jabatan','nama','kelas','foto_url','bidang_nama','deskripsi_jabatan'],
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
  dok:[], jad:[], det:[], notif:[], ang:[], peng:[],
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
    const [dok, jad, det, notif, ang, peng, lockData] = await Promise.all([
      readSh('proker_dokumentasi'), readSh('proker_jadwal'), readSh('proker_detail'),
      readSh('proker_notif_config'), readSh('anggota').catch(() => []), readSh('pengurus'),
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
  renderNotif(); renderAng(); renderPeng(); updateBadges();
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
function saveSesi() {
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
    return `<div class="panel"><div class="ph2"><span class="ph2-i">${info.i}</span><span class="ph2-t">#${id} ${info.n}</span><span class="ph2-s">${jads.filter(j=>!j._d).length} jadwal · ${up} upcoming</span><button class="btn-add" style="padding:4px 10px;font-size:.7rem;margin-left:8px" onclick="openNewJadwalModal('${id}')">+</button><button class="btn-ar" style="padding:3px 9px;font-size:.68rem;margin-left:4px" onclick="pasteJadwal('${id}')" title="Paste jadwal dari Excel/Sheets">📋 Paste</button></div><div class="pb" style="padding:10px 13px"><div class="jchips">${jads.sort((a,b)=>a.tanggal>b.tanggal?1:-1).map(j => {
      const cls = j._d?'del':j._n?'newrow':j._m?'mod':j.tanggal<S.today?'past':'';
      return `<div class="jchip ${cls}"><span onclick="openEditJad(${j._i})" style="cursor:pointer">${j.tanggal} <span style="opacity:.6">${j.jam}</span> ${j._d?'🗑️':j._n?'✨':j._m?'✏️':''}</span>${j._d  ? `<button class="jchip-del" onclick="event.stopPropagation();restJad(${j._i})" title="Batalkan hapus">↩</button>`  : `<button class="jchip-del" onclick="event.stopPropagation();delJad(${j._i})" title="Hapus jadwal">×</button>`}</div>`;
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
  const nd = {proker_id:document.getElementById('ej_pid').value, tanggal:document.getElementById('ej_tgl').value, jam:document.getElementById('ej_jam').value};
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
  document.getElementById('detailContent').innerHTML=S.det.map(d=>{
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
      +'<div class="fg"><div class="fl">Tujuan</div><textarea class="fta" oninput="updDet('+di+',\'tujuan\',this.value)">'+esc(d.tujuan||'')+'</textarea></div>'
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
    ).join('')}<td>${a._d
      ? `<button class="btn-add" style="padding:3px 9px;font-size:.68rem" onclick="restAng(${a._i})">↩</button>`
      : `<button class="btn-del" onclick="delAng(${a._i})">🗑️</button>`
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
        <div style="font-size:.68rem;color:var(--gm);line-height:1.4;margin-bottom:8px">${p.desc||p.jabatan||''}</div>
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
  document.getElementById('ep_desc').value = p.deskripsi_jabatan||p.desc||'';
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
  document.getElementById('badge-dokumentasi').textContent = dokN;
  document.getElementById('badge-jadwal').textContent      = jadN;
  document.getElementById('badge-detail').textContent      = detN;
  document.getElementById('badge-notif').textContent       = notN;
  document.getElementById('badge-anggota').textContent     = angN;
  document.getElementById('badge-pengurus').textContent    = pengN;
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

async function confirmUpload() {
  closeModal('uploadModal');
  const btn  = document.getElementById('btnCU'); btn.disabled = true;
  const prog = document.getElementById('upProgress');
  const bar  = document.getElementById('upBar');
  const step = document.getElementById('upStep');
  prog.classList.add('show'); bar.style.width = '0%';
  setS('loading', 'Memeriksa…');

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
      await uploadShDelta(sh, (msg) => { step.textContent = msg; });
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
    S.changes = [];
    setS('ok', 'Tersinkron ✓');
    toast('🎉 Upload berhasil!', 'success');
    renderAll(); renderChangelog();
    setTimeout(() => silentReload(), 1500);
  } else {
    try { await setLockRow(_localVersion || newVersion, 'free', '', ''); } catch(_) {}
    setS('error', 'Sebagian gagal');
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
  const shLabel = { dokumentasi:'Dokumentasi', jadwal:'Jadwal', proker_detail:'Detail Proker', notif_config:'Notif Config', anggota:'Anggota', pengurus:'Pengurus' };
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
    const [dok, jad, det, notif, ang, peng] = await Promise.all([
      readSh('proker_dokumentasi'), readSh('proker_jadwal'), readSh('proker_detail'),
      readSh('proker_notif_config'), readSh('anggota').catch(() => []), readSh('pengurus')
    ]);
    // Hanya update data yang tidak sedang diedit (_m=false, _n=false, _d=false)
    S.dok   = dok.filter(d=>d.delete_flag!=='TRUE').map((d,i)  => ({...d, _i:i, _m:false, _n:false, _d:false}));
    S.jad   = jad.filter(d=>d.delete_flag!=='TRUE').map((d,i)  => ({...d, _i:i, _m:false, _n:false, _d:false}));
    S.det   = det.filter(d=>d.delete_flag!=='TRUE').map((d,i)  => ({...d, _i:i, _m:false}));
    S.notif = notif.filter(d=>d.delete_flag!=='TRUE').map((d,i)=> ({...d, _i:i, _m:false}));
    S.ang   = ang.filter(d=>d.delete_flag!=='TRUE').map((d,i)  => ({...d, _i:i, _m:false, _n:false, _d:false}));
    S.peng  = peng
      .filter(p => p.jabatan_level && !['Note:', ''].includes((p.jabatan_level||'').trim()))
      .map((d,i) => ({...d, _i:i, _m:false}));
    // Juga refresh version lock
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

  // Buat marker sekali saja
  if (!ph.querySelector('.ph-sakura-wrap')) {
    const marker = document.createElement('div');
    marker.className = 'ph-sakura-wrap';
    ph.insertBefore(marker, ph.firstChild);
  }

  function spawnPhPetal() {
    // Skip spawn jika halaman rekap tidak aktif, tapi JANGAN stop interval
    if (!document.querySelector('#page-rekap.active')) return;
    const el = document.createElement('div');
    const sz = 4 + Math.random() * 7;
    const phH = ph.offsetHeight || 160;
    const fallDist = phH + sz * 2;
    const dur = 2.5 + Math.random() * 3;
    const driftX = (Math.random() - .5) * 60;
    el.style.cssText = [
      'position:absolute',
      'width:' + sz + 'px',
      'height:' + sz + 'px',
      'background:rgba(255,180,210,' + (.25 + Math.random() * .4) + ')',
      'border-radius:50% 0 50% 0',
      'left:' + Math.random() * 100 + '%',
      'top:-' + (sz + 2) + 'px',
      'pointer-events:none',
      'z-index:0',
      '--fd:' + fallDist + 'px',
      '--dx:' + driftX + 'px',
      'animation:phSakuraFall ' + dur + 's linear forwards',
    ].join(';');
    ph.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  // Spawn burst awal agar langsung terlihat
  for (let i = 0; i < 10; i++) setTimeout(spawnPhPetal, i * 100);

  // Mulai interval SEKALI saja seumur halaman.
  // Tidak pernah di-clear — hanya di-skip saat halaman tidak aktif,
  // sehingga sakura langsung muncul kembali saat user kembali ke Overview.
  if (!_phSakuraIv) {
    _phSakuraIv = setInterval(spawnPhPetal, 500);
  }
}
/* ═══════ LOADING SAKURA — identik dengan hero landing page ═══════ */
(function initLoadingSakura() {
  const container = document.getElementById('lovSakura');
  if (!container) return;

  // Keyframe identik landing page (inject sekali)
  if (!document.getElementById('lov-sakura-style')) {
    const ss = document.createElement('style');
    ss.id = 'lov-sakura-style';
    ss.textContent = '@keyframes sakuraFall{0%{transform:translateY(0) rotate(0deg);opacity:1}50%{transform:translateY(40vh) rotate(180deg) translateX(20px);opacity:.7}100%{transform:translateY(100vh) rotate(360deg) translateX(-20px);opacity:0}}';
    document.head.appendChild(ss);
  }

  function spawnPetal() {
    const lov = document.getElementById('lov');
    if (!lov || lov.classList.contains('hidden')) return;
    const p = document.createElement('div');
    const sz = 4 + Math.random() * 6;
    p.style.cssText = 'position:absolute;width:' + sz + 'px;height:' + sz + 'px;'
      + 'background:rgba(255,180,210,' + (.2 + Math.random() * .3) + ');'
      + 'border-radius:50% 0 50% 0;'
      + 'left:' + Math.random() * 100 + '%;top:-10px;'
      + 'pointer-events:none;z-index:1;'
      + 'animation:sakuraFall ' + (4 + Math.random() * 5) + 's linear forwards;';
    container.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }

  // Interval identik landing page: 1000ms — tapi spawn awal diperbanyak
  const iv = setInterval(() => {
    if (document.getElementById('lov').classList.contains('hidden')) {
      clearInterval(iv); return;
    }
    spawnPetal();
  }, 1000);

  // Spawn awal agar langsung terlihat saat halaman terbuka
  for (let i = 0; i < 8; i++) setTimeout(spawnPetal, i * 200);
})();


