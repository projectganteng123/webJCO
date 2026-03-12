/* ═══════ CONFIG ═══════ */
const API = 'https://script.google.com/macros/s/AKfycbzwOgklEWZn6ts5--DnFpM9eqoWsUtlQ_Nux-LhmkVQ1viH0NGAG2vXcO3sLqjLVl5E/exec';

// Sheet headers — harus sama persis dengan GAS SHEET_HEADERS
const SH = {
  proker_dokumentasi:  ['proker_id','tanggal_sesi','foto_url','keterangan','hadir_peserta','hadir_panitia','hadir_narasumber','materi','waktu_mulai','waktu_selesai','item_biaya','estimasi_biaya_item','biaya_aktual','kendala'],
  proker_jadwal:       ['proker_id','tanggal','jam'],
  proker_detail:       ['proker_id','tujuan','waktu_teks','estimasi_tanggal','lokasi','sasaran','pemateri','panitia','rab'],
  proker_notif_config: ['proker_id','countdown_aktif','ajakan','ajakan_teks','ajakan_sub','wajib_hadir','wajib_hadir_teks','wajib_hadir_sanksi'],
  anggota:             ['nama','kelas','angkatan','status','no_hp','catatan'],
  pengurus:            ['jabatan_level','jabatan','nama','kelas','foto_url','bidang_nama'],
};

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
    const qs = Object.entries({ ...p, callback: cb }).map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
    const sc = document.createElement('script'); sc.id = cb; sc.src = API + '?' + qs;
    sc.onerror = () => { clearTimeout(tid); cl(); rej(new Error('Script load error')); };
    document.head.appendChild(sc);
  });
}
const readSh = s => jsonp({ sheet: s, action: 'read' }).then(r => r.data);

/* ═══════ INIT ═══════ */
async function init() {
  setS('loading', 'Memuat…');
  try {
    const [dok, jad, det, notif, ang, peng] = await Promise.all([
      readSh('proker_dokumentasi'), readSh('proker_jadwal'), readSh('proker_detail'),
      readSh('proker_notif_config'), readSh('anggota').catch(() => []), readSh('pengurus')
    ]);
    S.dok   = dok.map((d,i)  => ({...d, _i:i, _m:false, _n:false, _d:false}));
    S.jad   = jad.map((d,i)  => ({...d, _i:i, _m:false, _n:false, _d:false}));
    S.det   = det.map((d,i)  => ({...d, _i:i, _m:false}));
    S.notif = notif.map((d,i)=> ({...d, _i:i, _m:false}));
    S.ang   = ang.map((d,i)  => ({...d, _i:i, _m:false, _n:false, _d:false}));
    S.peng  = peng
      .filter(p => p.jabatan_level && !['Note:', ''].includes((p.jabatan_level||'').trim()))
      .map((d,i) => ({...d, _i:i, _m:false}));
    setS('ok', 'Tersinkron');
    document.getElementById('lov').classList.add('hidden');
    renderAll();
  } catch(e) {
    setS('error', 'Gagal');
    document.getElementById('lov').classList.add('hidden');
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
const TS = {peserta:[], panitia:[], narasumber:[]};
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
  initTags('peserta',s.hadir_peserta); initTags('panitia',s.hadir_panitia); initTags('narasumber',s.hadir_narasumber);
  initBR(s); openModal('sesiModal');
}
function openNewSesiModal() {
  document.getElementById('e_idx').value = 'new';
  document.getElementById('sesiMT').textContent = 'Tambah Sesi Baru';
  document.getElementById('e_pid').innerHTML = pkOpts('01');
  document.getElementById('e_tgl').value = S.today;
  ['e_mul','e_sel','e_ket','e_mat','e_kend','e_foto'].forEach(id => document.getElementById(id).value='');
  initTags('peserta',''); initTags('panitia',''); initTags('narasumber','');
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
    hadir_peserta:  getTags('peserta'),
    hadir_panitia:  getTags('panitia'),
    hadir_narasumber: getTags('narasumber'),
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

/* ═══════ TAGS ═══════ */
function initTags(t,s) { TS[t]=spl(s); renderTags(t); }
function renderTags(t) { document.getElementById('tg-'+t).innerHTML=TS[t].map((n,i)=>`<div class="htag">${n}<button class="htag-del" onclick="rmTag('${t}',${i})">×</button></div>`).join(''); }
function addTag(t) { const inp=document.getElementById('in-'+t); spl(inp.value).forEach(v=>{if(v)TS[t].push(v);}); inp.value=''; renderTags(t); }
function rmTag(t,i) { TS[t].splice(i,1); renderTags(t); }
function getTags(t) { return TS[t].join(','); }

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
    return `<div class="panel"><div class="ph2"><span class="ph2-i">${info.i}</span><span class="ph2-t">#${id} ${info.n}</span><span class="ph2-s">${jads.filter(j=>!j._d).length} jadwal · ${up} upcoming</span><button class="btn-add" style="padding:4px 10px;font-size:.7rem;margin-left:8px" onclick="openNewJadwalModal('${id}')">+</button></div><div class="pb" style="padding:10px 13px"><div class="jchips">${jads.sort((a,b)=>a.tanggal>b.tanggal?1:-1).map(j => {
      const cls = j._d?'del':j._n?'newrow':j._m?'mod':j.tanggal<S.today?'past':'';
      return `<div class="jchip ${cls}" onclick="openEditJad(${j._i})">${j.tanggal} <span style="opacity:.6">${j.jam}</span> ${j._d?'🗑️':j._n?'✨':j._m?'✏️':''}</div>`;
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

/* ═══════ PROKER DETAIL ═══════ */
function renderDet() {
  const pend = S.det.filter(d=>d._m).length;
  document.getElementById('detailBanner').classList.toggle('show',pend>0);
  document.getElementById('detailBannerN').textContent = pend;
  document.getElementById('detailContent').innerHTML = S.det.map(d => {
    const info = PK[d.proker_id]||{n:'Proker '+d.proker_id,i:'📌'};
    return `<div class="panel" style="${d._m?'border-color:var(--warn)':''}">
      <div class="ph2" style="${d._m?'background:linear-gradient(90deg,#FFFBEB,var(--ow));border-bottom-color:#FDE68A':''}">
        <span class="ph2-i">${info.i}</span><span class="ph2-t">#${d.proker_id} ${info.n}</span>${d._m?'<span class="chg chg-m" style="margin-left:auto">Diubah</span>':''}
      </div>
      <div class="pb"><div class="det-g">
        <div class="fg"><div class="fl">Tujuan</div><textarea class="fta" oninput="updDet(${d._i},'tujuan',this.value)">${esc(d.tujuan||'')}</textarea></div>
        <div class="fg"><div class="fl">Waktu (teks)</div><input type="text" class="fi" value="${esc(d.waktu_teks||'')}" oninput="updDet(${d._i},'waktu_teks',this.value)"/></div>
        <div class="fg"><div class="fl">Est. Tanggal</div><input type="date" class="fi" value="${d.estimasi_tanggal||''}" oninput="updDet(${d._i},'estimasi_tanggal',this.value)"/></div>
        <div class="fg"><div class="fl">Lokasi</div><input type="text" class="fi" value="${esc(d.lokasi||'')}" oninput="updDet(${d._i},'lokasi',this.value)"/></div>
        <div class="fg"><div class="fl">Sasaran</div><input type="text" class="fi" value="${esc(d.sasaran||'')}" oninput="updDet(${d._i},'sasaran',this.value)"/></div>
        <div class="fg"><div class="fl">Pemateri</div><input type="text" class="fi" value="${esc(d.pemateri||'')}" oninput="updDet(${d._i},'pemateri',this.value)"/></div>
        <div class="fg"><div class="fl">Panitia</div><input type="text" class="fi" value="${esc(d.panitia||'')}" oninput="updDet(${d._i},'panitia',this.value)"/></div>
        <div class="fg"><div class="fl">RAB</div><textarea class="fta" oninput="updDet(${d._i},'rab',this.value)">${esc(d.rab||'')}</textarea></div>
      </div></div>
    </div>`;
  }).join('') || '<div class="empty"><div class="ei">📌</div><div class="et">Tidak ada data detail proker</div></div>';
}
function updDet(i, k, v) {
  const idx = S.det.findIndex(d=>d._i===i);
  if(idx>=0) { S.det[idx][k]=v; if(!S.det[idx]._m){S.det[idx]._m=true; logC('edit','proker_detail',i,'Detail '+S.det[idx].proker_id);} }
  updateBadges();
  document.getElementById('detailBanner').classList.add('show');
  document.getElementById('detailBannerN').textContent = S.det.filter(d=>d._m).length;
}

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
  document.getElementById('ep_desc').value = p.desc||'';
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
    desc:          document.getElementById('ep_desc').value,
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
   UPLOAD — FULL REPLACE PER SHEET
   Strategi: kirim SATU request "replaceAll" dengan seluruh
   data sekaligus. GAS akan hapus semua baris lama dan insert
   baru. Ini 1 request per sheet → cepat & atomik.
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
    `<div style="font-weight:700;margin-bottom:8px">Sheet yang akan di-replace sepenuhnya:</div>` +
    sheets.map(s => `<div style="padding:3px 0">• <strong>${label[s]||s}</strong></div>`).join('') +
    `<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--gl);color:var(--gm);font-size:.73rem">⚠️ Semua baris di sheet tersebut akan digantikan. Sheet lain tidak terpengaruh.</div>`;
  openModal('uploadModal');
}

async function confirmUpload() {
  closeModal('uploadModal');
  const btn = document.getElementById('btnCU'); btn.disabled=true;
  const prog = document.getElementById('upProgress');
  const bar  = document.getElementById('upBar');
  const step = document.getElementById('upStep');
  prog.classList.add('show'); bar.style.width='0%';

  setS('loading','Mengupload…');
  const sheets = [...new Set(S.changes.map(c=>c.sh))];
  let ok=0, fail=0;

  for(let si=0; si < sheets.length; si++) {
    const sh = sheets[si];
    step.textContent = `Mengupload ${sh} (${si+1}/${sheets.length})…`;
    bar.style.width  = Math.round((si/sheets.length)*100)+'%';
    try {
      await uploadShFull(sh);
      ok++;
    } catch(e) {
      fail++;
      toast('❌ Gagal '+sh+': '+e.message, 'error');
      console.error(sh, e);
    }
  }

  bar.style.width = '100%';
  step.textContent = ok+' berhasil'+(fail>0?', '+fail+' gagal':'')+'!';
  setTimeout(() => prog.classList.remove('show'), 2000);

  if(!fail) {
    S.dok.forEach(d=>{d._m=false;d._n=false;}); S.dok=S.dok.filter(d=>!d._d);
    S.jad.forEach(j=>{j._m=false;j._n=false;}); S.jad=S.jad.filter(j=>!j._d);
    S.det.forEach(d=>d._m=false);
    S.notif.forEach(d=>d._m=false);
    S.ang.forEach(a=>{a._m=false;a._n=false;}); S.ang=S.ang.filter(a=>!a._d);
    S.peng.forEach(p=>p._m=false);
    S.changes=[];
    setS('ok','Tersinkron ✓');
    toast('🎉 Upload berhasil!','success');
    renderAll(); renderChangelog();
  } else {
    setS('error','Sebagian gagal');
    toast(`⚠️ ${ok} berhasil, ${fail} gagal`,'error');
  }
  btn.disabled=false;
}

/**
 * uploadShFull — satu request untuk mengganti SELURUH isi sheet.
 * Menggunakan action=replaceAll yang dikirim ke GAS v2.
 * Payload: { headers: [...], rows: [[...],[...]] }
 */
async function uploadShFull(sh) {
  const gas = {
    dokumentasi:   'proker_dokumentasi',
    jadwal:        'proker_jadwal',
    proker_detail: 'proker_detail',
    notif_config:  'proker_notif_config',
    anggota:       'anggota',
    pengurus:      'pengurus',
  }[sh];
  const hdr = SH[gas];

  // Buat rows (hanya data aktif, tanpa baris yang dihapus)
  let srcRows;
  if     (sh==='dokumentasi')   srcRows = S.dok.filter(d=>!d._d);
  else if(sh==='jadwal')        srcRows = S.jad.filter(j=>!j._d);
  else if(sh==='proker_detail') srcRows = S.det;
  else if(sh==='notif_config')  srcRows = S.notif;
  else if(sh==='anggota')       srcRows = S.ang.filter(a=>!a._d);
  else if(sh==='pengurus')      srcRows = S.peng;
  else throw new Error('Unknown sheet: '+sh);

  // Konversi ke array 2D (hanya kolom yang sesuai header)
  const rows = srcRows.map(obj => hdr.map(h => (obj[h]!=null?obj[h]:'')).map(String));

  // Kirim satu request: replaceAll
  await jsonp({
    sheet:   gas,
    action:  'replaceAll',
    payload: encodeURIComponent(JSON.stringify({ headers: hdr, rows }))
  });
}

/* ═══════ HELPERS ═══════ */
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
