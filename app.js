/* ═══════ CONFIG ═══════ */
// Hanya read-only — halaman ini tidak melakukan write ke Sheets
const API_READ = 'https://script.google.com/macros/s/AKfycbzwOgklEWZn6ts5--DnFpM9eqoWsUtlQ_Nux-LhmkVQ1viH0NGAG2vXcO3sLqjLVl5E/exec';
const SH = {
  proker_dokumentasi:  ['proker_id','tanggal_sesi','foto_url','keterangan','hadir_peserta','hadir_panitia','hadir_narasumber','materi','waktu_mulai','waktu_selesai','item_biaya','estimasi_biaya_item','biaya_aktual','kendala'],
  proker_jadwal:       ['proker_id','tanggal','jam'],
  proker_detail:       ['proker_id','tujuan','waktu_teks','estimasi_tanggal','lokasi','sasaran','pemateri','panitia','item_biaya','estimasi_biaya_item','biaya_aktual'],
  proker_notif_config: ['proker_id','countdown_aktif','ajakan','ajakan_teks','ajakan_sub','wajib_hadir','wajib_hadir_teks','wajib_hadir_sanksi'],
  anggota:             ['nama','kelas','angkatan','status','no_hp','catatan'],
  pengurus:            ['jabatan_level','jabatan','nama','kelas','link photo','icon','desc','photo'],
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
const S = { dok:[], jad:[], det:[], notif:[], ang:[], peng:[], changes:[], fp:'all', today: new Date().toISOString().split('T')[0] };

/* ═ JSONP ═ */
let _n=0;
function jsonp(p){
  return new Promise((res,rej)=>{
    const cb='__jcb'+(++_n)+'_'+Date.now();
    const tid=setTimeout(()=>{cl();rej(new Error('Timeout'));},30000);
    function cl(){delete window[cb];const s=document.getElementById(cb);if(s)s.remove();}
    window[cb]=d=>{clearTimeout(tid);cl();d.status==='ok'?res(d):rej(new Error(d.message||'GAS error'));};
    const qs=Object.entries({...p,callback:cb}).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');
    const sc=document.createElement('script');sc.id=cb;sc.src=API_READ+'?'+qs;
    sc.onerror=()=>{clearTimeout(tid);cl();rej(new Error('Script load error'));};
    document.head.appendChild(sc);
  });
}
// readSh pakai API_READ (deployment read-only)
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

/* ═ SIDEBAR MOBILE ═ */
function toggleSidebar(){
  const sb=document.querySelector('.sidebar'),ov=document.getElementById('sbOverlay'),ham=document.getElementById('btnHam');
  const open=sb.classList.toggle('open');
  ov.classList.toggle('show',open);
  ham.classList.toggle('open',open);
}
function closeSidebar(){
  const sb=document.querySelector('.sidebar');if(sb)sb.classList.remove('open');
  const ov=document.getElementById('sbOverlay');if(ov)ov.classList.remove('show');
  const ham=document.getElementById('btnHam');if(ham)ham.classList.remove('open');
}

/* ═ INIT ═ */
async function init(){
  setS('loading','Memuat…');
  try{
    const[dok,jad,det,notif,ang,peng]=await Promise.all([
      readSh('proker_dokumentasi'),readSh('proker_jadwal'),readSh('proker_detail'),
      readSh('proker_notif_config'),readSh('anggota').catch(()=>[]),readSh('pengurus')
    ]);
    S.dok  =dok.map((d,i)=>({...d,_i:i,_m:false,_n:false,_d:false}));
    S.jad  =jad.map((d,i)=>({...d,_i:i,_m:false,_n:false,_d:false}));
    S.det  =det.map((d,i)=>({...d,_i:i,_m:false}));
    S.notif=notif.map((d,i)=>({...d,_i:i,_m:false}));
    S.ang  =ang.map((d,i)=>({...d,_i:i,_m:false,_n:false,_d:false}));
    S.peng =peng.filter(p=>p.jabatan_level&&!['Note:',''].includes((p.jabatan_level||'').trim())).map((d,i)=>({...d,_i:i,_m:false}));
    setS('ok','Tersinkron');
    document.getElementById('lov').classList.add('hidden');
    renderAll();
  }catch(e){
    setS('error','Gagal');
    document.getElementById('lov').classList.add('hidden');
    toast('Gagal: '+e.message,'error');
    console.error(e);
  }
}
function renderAll(){renderOv();renderDok();renderJad();renderDet();renderNotif();renderAng();renderPeng();updateBadges();}

/* ═ OVERVIEW ═ */
function renderOv(){
  const biaya=S.dok.filter(d=>!d._d).reduce((a,d)=>a+pBiaya(d.biaya_aktual),0);
  const pend=getPend();
  document.getElementById('st-sesi').textContent=S.dok.filter(d=>!d._d).length;
  document.getElementById('st-biaya').textContent='Rp '+fNum(biaya);
  document.getElementById('st-anggota').textContent=S.ang.filter(a=>!a._d).length;
  document.getElementById('st-jadwal').textContent=S.jad.filter(j=>!j._d).length;
  document.getElementById('st-pending').textContent=pend.length;
  document.getElementById('st-changes').textContent=S.changes.length;
  const pp=document.getElementById('pendingPanel');
  if(pend.length){
    pp.style.display='';
    document.getElementById('pendingList').innerHTML=pend.map(j=>{
      const info=PK[j.proker_id]||{n:'Proker '+j.proker_id,i:'📌'};
      return '<div class="pend-item"><span>'+info.i+'</span><div class="pend-txt"><strong>'+info.n+'</strong><br>'+j.tanggal+' pukul '+j.jam+'</div><span class="pend-d">'+dAgo(j.tanggal)+'hr lalu</span><button class="btn-add" style="padding:4px 10px;font-size:.69rem" onclick="openSesiFromPend(\''+j.proker_id+'\',\''+j.tanggal+'\',\''+j.jam+'\')">Isi Sesi</button></div>';
    }).join('');
  }else pp.style.display='none';
  renderAG();
  const bp={};
  S.dok.filter(d=>!d._d).forEach(d=>{if(!bp[d.proker_id])bp[d.proker_id]=[];bp[d.proker_id].push(d);});
  document.getElementById('rkCards').innerHTML=Object.entries(bp).map(([id,ss])=>{
    const info=PK[id]||{n:'Proker '+id,i:'📌'};
    const b=ss.reduce((a,d)=>a+pBiaya(d.biaya_aktual),0);
    const last=ss.map(s=>s.tanggal_sesi).sort().reverse()[0];
    return '<div class="rk-card" onclick="filterGo(\''+id+'\')"><div class="rk-bd"><div class="rk-ic">'+info.i+'</div><div class="rk-nm">'+info.n+'</div><div class="rk-sub">#'+id+' · '+fDate(last)+'</div><div class="rk-num">'+ss.length+'</div><div class="rk-nl">sesi</div><div style="margin-top:5px;font-size:.72rem;color:var(--gm)">Biaya: <strong style="color:var(--ch)">Rp '+fNum(b)+'</strong></div></div></div>';
  }).join('')||'<div class="empty"><div class="ei">📭</div><div class="et">Belum ada dokumentasi</div></div>';
}
function getPend(){
  const sd=new Set(S.dok.filter(d=>!d._d).map(d=>d.proker_id+'_'+d.tanggal_sesi));
  return S.jad.filter(j=>!j._d&&j.tanggal<S.today&&!sd.has(j.proker_id+'_'+j.tanggal));
}
function dAgo(s){return Math.floor((new Date()-new Date(s+'T00:00:00'))/86400000);}

/* ═ ACTIVITY GRAPH ═ */
function renderAG(){
  const sd={},jd={};
  S.dok.filter(d=>!d._d).forEach(d=>{if(!sd[d.tanggal_sesi])sd[d.tanggal_sesi]=[];sd[d.tanggal_sesi].push((PK[d.proker_id]&&PK[d.proker_id].n)||('#'+d.proker_id));});
  S.jad.filter(j=>!j._d).forEach(j=>{if(!jd[j.tanggal])jd[j.tanggal]=[];jd[j.tanggal].push({pid:j.proker_id,jam:j.jam});});
  const pendSet=new Set(getPend().map(j=>j.tanggal));
  const start=new Date('2026-01-01'),dow=start.getDay(),first=new Date(start);
  first.setDate(first.getDate()-dow);
  const weeks=[],mLabels=[];let cur=new Date(first),lastM=-1;
  while(cur<=new Date('2027-01-31')||weeks.length<54){
    const wk=[];
    for(let d=0;d<7;d++){
      const iso=toISO(cur),hidden=cur<start||cur.getFullYear()>2027;
      let st='future';
      if(!hidden){if(iso===S.today)st=jd[iso]?'today-planned':'today';else if(iso<S.today)st=sd[iso]?'actual':(pendSet.has(iso)?'pending':'past');else st=jd[iso]?'planned':'future';}
      if(d===0){const m=cur.getMonth();if(m!==lastM&&cur>=start){mLabels.push({wi:weeks.length,lb:['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'][m]});lastM=m;}else mLabels.push({wi:weeks.length,lb:''});}
      wk.push({iso,st,hidden,sesis:sd[iso]||[],jads:jd[iso]||[],pend:pendSet.has(iso)});
      cur.setDate(cur.getDate()+1);
    }
    weeks.push(wk);if(weeks.length>58)break;
  }
  document.getElementById('actMonths').innerHTML=weeks.map((_,wi)=>{const ml=mLabels.find(m=>m.wi===wi);return'<div class="act-ml" style="width:14px">'+(ml&&ml.lb||'')+'</div>';}).join('');
  document.getElementById('actGraph').innerHTML=weeks.map(wk=>'<div class="act-week">'+wk.map(day=>{
    if(day.hidden)return'<div class="act-day" style="visibility:hidden"></div>';
    const lines=[];
    if(day.sesis.length)lines.push('✅ '+day.sesis.join(', '));
    if(day.jads.length)lines.push('📅 '+day.jads.map(j=>(PK[j.pid]&&PK[j.pid].n)||j.pid).join(', '));
    if(day.pend)lines.push('⚠️ Belum ada dokumentasi!');
    const tip=fDate(day.iso)+(lines.length?'\n'+lines.join('\n'):'');
    return'<div class="act-day" data-state="'+day.st+'" data-tip="'+esc(tip)+'" onmouseenter="showTip(event,this)" onmouseleave="hideTip()"></div>';
  }).join('')+'</div>').join('');
  const total=Object.keys(sd).length;
  const dur=S.dok.filter(d=>!d._d).reduce((a,d)=>{if(d.waktu_mulai&&d.waktu_selesai){const[h1,m1]=d.waktu_mulai.split(':').map(Number),[h2,m2]=d.waktu_selesai.split(':').map(Number);return a+(h2*60+m2-h1*60-m1);}return a;},0);
  const biaya=S.dok.filter(d=>!d._d).reduce((a,d)=>a+pBiaya(d.biaya_aktual),0);
  document.getElementById('actStats').innerHTML='<div class="as-i"><strong>'+total+'</strong> hari</div><div class="as-i"><strong>'+Math.round(dur/6)/10+'j</strong> total</div><div class="as-i"><strong>Rp '+fNum(biaya)+'</strong></div><div class="as-i"><strong>'+pendSet.size+'</strong> belum didok.</div>';
  document.getElementById('actLeg').innerHTML=[{s:'actual',l:'Terlaksana'},{s:'pending',l:'Perlu dok.'},{s:'today',l:'Hari ini'},{s:'planned',l:'Rencana'},{s:'past',l:'Lewat'},{s:'future',l:'Akan datang'}].map(({s,l})=>'<div class="al-i"><div class="al-d" style="background:'+aC(s)+'"></div><span>'+l+'</span></div>').join('');
}
function aC(s){return{actual:'#16A34A',pending:'#DC2626',today:'#9B59D4','today-planned':'#6B34AF',planned:'rgba(107,52,175,.5)',past:'#D4CFF0',future:'#EDEAF6'}[s]||'#EEE';}
function showTip(e,el){const t=document.getElementById('actTip');t.style.cssText='opacity:1;left:'+(e.clientX+12)+'px;top:'+(e.clientY-10)+'px;white-space:pre';t.textContent=el.dataset.tip||'';}
function hideTip(){document.getElementById('actTip').style.opacity='0';}
function toISO(d){return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());}
function p2(n){return n<10?'0'+n:''+n;}

/* ═ PEOPLE PICKER ═ */
const PCK={};
function initPicker(key,valStr){PCK[key]=new Set(spl(valStr));renderPickerTags(key);renderPickerCheckboxes(key);}
function renderPickerTags(key){
  const el=document.getElementById('tg-'+key);if(!el)return;
  el.innerHTML=[...PCK[key]].map(n=>'<div class="htag">'+n+'<button class="htag-del" onclick="pckRemove(\''+key+'\','+JSON.stringify(n)+')">×</button></div>').join('');
}
function pckRemove(key,name){PCK[key].delete(name);renderPickerTags(key);renderPickerCheckboxes(key);_syncDetFromPck(key);}
function pckAdd(key,name){const n=name.trim();if(!n)return;PCK[key].add(n);renderPickerTags(key);renderPickerCheckboxes(key);_syncDetFromPck(key);}
function pckToggle(key,name,checked){if(checked)PCK[key].add(name);else PCK[key].delete(name);renderPickerTags(key);updatePickerCount(key);_syncDetFromPck(key);}
function updatePickerCount(key){const el=document.getElementById('pck-count-'+key);if(el)el.textContent=PCK[key].size+' dipilih';}
function addManualPck(key){
  const inp=document.getElementById('pck-manual-inp-'+key);if(!inp)return;
  spl(inp.value).forEach(v=>pckAdd(key,v));inp.value='';
}
function getPckVal(key){return[...PCK[key]].join(',');}
function renderPickerCheckboxes(key){
  const wrap=document.getElementById('pck-cls-'+key);if(!wrap)return;
  const byKelas={};
  S.ang.filter(a=>!a._d).forEach(a=>{const kls=a.kelas||'Lainnya';if(!byKelas[kls])byKelas[kls]=[];byKelas[kls].push(a.nama);});
  const known=new Set(S.ang.map(a=>a.nama));
  [...PCK[key]].forEach(n=>{if(!known.has(n)){if(!byKelas['Manual'])byKelas['Manual']=[];if(!byKelas['Manual'].includes(n))byKelas['Manual'].push(n);}});
  wrap.innerHTML=Object.entries(byKelas).sort(([a],[b])=>a.localeCompare(b)).map(([kls,names])=>{
    const clsId='pckcls-'+key+'-'+kls.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9-]/g,'');
    const items=names.map(name=>{
      const checked=PCK[key].has(name)?'checked':'';
      const id='pckchk-'+key+'-'+name.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9-]/g,'');
      return'<div class="pck-item"><input type="checkbox" id="'+id+'" '+checked+' onchange="pckToggle(\''+key+'\','+JSON.stringify(name)+',this.checked)"/><label for="'+id+'">'+name+'</label></div>';
    }).join('');
    return'<div class="pck-cls open" id="'+clsId+'"><div class="pck-cls-h" onclick="tgCls(\''+clsId+'\')"><span>'+kls+'</span><span style="font-size:.67rem;color:var(--gm);font-weight:400;margin-left:4px">('+names.length+')</span><span class="pck-cls-chev">▼</span></div><div class="pck-cls-body">'+items+'</div></div>';
  }).join('')||'<div style="padding:12px;font-size:.78rem;color:var(--gm);text-align:center">Belum ada data anggota</div>';
  updatePickerCount(key);
}
function pckSearch(key,q){
  const wrap=document.getElementById('pck-cls-'+key);if(!wrap)return;
  const qLow=q.toLowerCase();
  wrap.querySelectorAll('.pck-item').forEach(item=>{
    const lbl=item.querySelector('label').textContent||'';
    item.style.display=lbl.toLowerCase().includes(qLow)||!q?'':'none';
  });
  wrap.querySelectorAll('.pck-cls').forEach(cls=>{
    const vis=[...cls.querySelectorAll('.pck-item')].some(i=>i.style.display!=='none');
    cls.style.display=vis||!q?'':'none';
    if(q)cls.classList.add('open');
  });
}
function tgCls(id){const el=document.getElementById(id);if(el)el.classList.toggle('open');}
function pickerHtml(key,label){
  return'<div class="fg"><div class="fl">'+label+' <span class="flb">Dari anggota</span></div><div class="htags" id="tg-'+key+'"></div><div class="pck-wrap"><div class="pck-search"><span class="pck-search-ic">🔍</span><input type="text" placeholder="Cari nama…" oninput="pckSearch(\''+key+'\',this.value)"/></div><div class="pck-classes" id="pck-cls-'+key+'"></div><div class="pck-footer"><div class="pck-manual-row"><input type="text" id="pck-manual-inp-'+key+'" placeholder="Input manual…" onkeydown="if(event.key===\'Enter\'){addManualPck(\''+key+'\');event.preventDefault()}"/><button class="btn-hadd" onclick="addManualPck(\''+key+'\')">+ Tambah</button></div><span class="pck-count" id="pck-count-'+key+'">0 dipilih</span></div></div></div>';
}
function _syncDetFromPck(key){
  const m=key.match(/^det_(pemateri|panitia)_(\d+)$/);if(!m)return;
  const field=m[1],di=+m[2],idx=S.det.findIndex(d=>d._i===di);if(idx<0)return;
  S.det[idx][field]=[...PCK[key]].join(',');
  markDetMod(di);
}

/* ═ SESI HADIR PICKER ═ */
function renderSesiPicker(key, valStr){
  // Bangun HTML picker untuk satu tab kehadiran di modal sesi
  // key = 'peserta' | 'panitia' | 'narasumber'
  const label = {peserta:'👥 Peserta Hadir',panitia:'🎗️ Panitia Hadir',narasumber:'🎤 Narasumber'}[key]||key;
  const wrap = document.getElementById('sesi-picker-'+key);
  if(!wrap) return;
  wrap.innerHTML =
    '<div class="fg" style="margin-bottom:0">'
    +'<div class="fl">'+label
      +' <span class="flb pck-count-badge" id="pck-count-'+key+'">0 dipilih</span>'
    +'</div>'
    +'<div class="htags" id="tg-'+key+'"></div>'
    +'<div class="pck-wrap">'
      +'<div class="pck-search"><span class="pck-search-ic">🔍</span>'
        +'<input type="text" placeholder="Cari anggota…" oninput="pckSearch(\'' + key + '\',this.value)"/>'
      +'</div>'
      +'<div class="pck-classes" id="pck-cls-'+key+'"></div>'
      +'<div class="pck-footer">'
        +'<div class="pck-manual-row">'
          +'<input type="text" id="pck-manual-inp-'+key+'"'
            +' placeholder="Nama manual, pisah koma…"'
            +' onkeydown="if(event.key===\'Enter\'){addManualPck(\'' + key + '\');event.preventDefault()}"'
          +'/>'
          +'<button class="btn-hadd" onclick="addManualPck(\'' + key + '\')">+ Tambah</button>'
        +'</div>'
      +'</div>'
    +'</div>'
    +'</div>';
  initPicker(key, valStr);
}
function switchHadirTab(btn, key){
  btn.closest('.hadir-tabs').querySelectorAll('.htab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const modal = btn.closest('.modal');
  modal.querySelectorAll('.hadir-pane').forEach(p=>p.style.display='none');
  const pane = document.getElementById('hpane-'+key);
  if(pane) pane.style.display='';
}
function initSesiPickers(s){
  renderSesiPicker('peserta',   (s&&s.hadir_peserta)||'');
  renderSesiPicker('panitia',   (s&&s.hadir_panitia)||'');
  renderSesiPicker('narasumber',(s&&s.hadir_narasumber)||'');
  // Reset ke tab pertama
  const modal = document.getElementById('sesiModal');
  if(modal){
    modal.querySelectorAll('.htab').forEach((b,i)=>b.classList.toggle('active',i===0));
    modal.querySelectorAll('.hadir-pane').forEach((p,i)=>p.style.display=i===0?'':'none');
  }
}


/* ═ DOKUMENTASI ═ */
function renderDok(){
  const list=S.fp==='all'?S.dok:S.dok.filter(d=>d.proker_id===S.fp);
  const active=list.filter(d=>!d._d).sort((a,b)=>b.tanggal_sesi>a.tanggal_sesi?1:-1);
  const deleted=list.filter(d=>d._d);
  const ids=[...new Set(S.dok.filter(d=>!d._d).map(d=>d.proker_id))].sort();
  document.getElementById('filterChips').innerHTML='<div class="fc '+(S.fp==='all'?'active':'')+'" onclick="setFP(\'all\')">Semua ('+S.dok.filter(d=>!d._d).length+')</div>'+ids.map(id=>{const info=PK[id]||{n:'#'+id,i:'📌'};const c=S.dok.filter(d=>d.proker_id===id&&!d._d).length;return'<div class="fc '+(S.fp===id?'active':'')+'" onclick="setFP(\''+id+'\')">'+info.i+' #'+id+' ('+c+')</div>';}).join('');
  const pend=S.dok.filter(d=>d._m||d._n||d._d).length;
  document.getElementById('dokBanner').classList.toggle('show',pend>0);
  document.getElementById('dokBannerN').textContent=pend;
  const cont=document.getElementById('sesiList');
  if(!active.length&&!deleted.length){cont.innerHTML='<div class="empty"><div class="ei">📂</div><div class="et">Tidak ada sesi</div><div class="ed">Klik + Tambah Sesi</div></div>';return;}
  cont.innerHTML=[...active,...deleted].map(s=>{
    const info=PK[s.proker_id]||{n:'Proker '+s.proker_id,i:'📌'};
    const cls=s._d?'del':s._n?'newrow':s._m?'mod':'';
    const badge=s._d?'<span class="chg chg-d">Dihapus</span>':s._n?'<span class="chg chg-n">Baru</span>':s._m?'<span class="chg chg-m">Diubah</span>':'';
    const peserta=spl(s.hadir_peserta),b=pBiaya(s.biaya_aktual);
    return'<div class="sc '+cls+'" id="sc-'+s._i+'"><div class="sc-h" onclick="tgSc('+s._i+')"><span style="font-size:.9rem">'+info.i+'</span><span class="sc-date">'+(s.tanggal_sesi||'–')+'</span><span class="sc-pill">#'+s.proker_id+'</span><span class="sc-tit">'+(s.keterangan||'(tanpa keterangan)')+'</span><span style="font-size:.67rem;color:var(--gm);font-family:var(--fm)">'+(s.waktu_mulai||'')+(s.waktu_selesai?'–'+s.waktu_selesai:'')+'</span>'+badge+'<span class="sc-chev">▼</span></div><div class="sc-body"><div class="ss-grid"><div class="ss-item"><div class="ss-l">Peserta</div><div class="ss-v">'+peserta.length+' org</div></div><div class="ss-item"><div class="ss-l">Materi</div><div class="ss-v" style="font-size:.71rem;font-weight:500">'+(s.materi||'–').substring(0,50)+((s.materi||'').length>50?'…':'')+'</div></div><div class="ss-item"><div class="ss-l">Biaya</div><div class="ss-v">'+(b>0?'Rp '+fNum(b):'–')+'</div></div></div>'+(s.kendala?'<div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;padding:6px 9px;font-size:.73rem;margin-bottom:9px">⚠️ '+s.kendala+'</div>':'')+'<div style="display:flex;gap:6px;flex-wrap:wrap">'+(s._d?'<button class="btn-add" style="font-size:.71rem;padding:4px 10px" onclick="restDok('+s._i+')">↩ Batalkan Hapus</button>':'<button class="btn-esm" onclick="openSesi('+s._i+')">✏️ Edit</button><button class="btn-del" onclick="delDok('+s._i+')">🗑️ Hapus</button>')+'</div></div></div>';
  }).join('');
}
function setFP(id){S.fp=id;renderDok();}
function filterGo(id){S.fp=id;showPage('dokumentasi');}
function tgSc(i){const el=document.getElementById('sc-'+i);if(el)el.classList.toggle('open');}
function delDok(i){if(!confirm('Tandai untuk dihapus?'))return;const idx=S.dok.findIndex(d=>d._i===i);if(idx>=0){S.dok[idx]._d=true;S.dok[idx]._m=false;logC('del','dokumentasi',i,S.dok[idx].keterangan||'Sesi');}renderAll();toast('🗑️ Ditandai dihapus','warning');}
function restDok(i){const idx=S.dok.findIndex(d=>d._i===i);if(idx>=0){S.dok[idx]._d=false;S.changes=S.changes.filter(c=>!(c.sh==='dokumentasi'&&c.idx===i&&c.a==='del'));}renderAll();toast('↩ Dibatalkan');}

/* ═ SESI MODAL ═ */
let BR=[];
function openSesi(i){
  const s=S.dok.find(d=>d._i===i);if(!s)return;
  document.getElementById('e_idx').value=i;
  document.getElementById('sesiMT').textContent='Edit: '+(s.keterangan||fDate(s.tanggal_sesi));
  document.getElementById('e_pid').innerHTML=pkOpts(s.proker_id);
  document.getElementById('e_tgl').value=s.tanggal_sesi||'';
  document.getElementById('e_mul').value=s.waktu_mulai||'';
  document.getElementById('e_sel').value=s.waktu_selesai||'';
  document.getElementById('e_ket').value=s.keterangan||'';
  document.getElementById('e_mat').value=s.materi||'';
  document.getElementById('e_kend').value=s.kendala||'';
  document.getElementById('e_foto').value=s.foto_url||'';
  initSesiPickers(s);
  initBR(s);openModal('sesiModal');
}
function openNewSesiModal(){
  document.getElementById('e_idx').value='new';
  document.getElementById('sesiMT').textContent='Tambah Sesi Baru';
  document.getElementById('e_pid').innerHTML=pkOpts('01');
  document.getElementById('e_tgl').value=S.today;
  ['e_mul','e_sel','e_ket','e_mat','e_kend','e_foto'].forEach(id=>document.getElementById(id).value='');
  initSesiPickers(null);
  initBR({});openModal('sesiModal');
}
function openSesiFromPend(pid,tgl,jam){openNewSesiModal();document.getElementById('e_pid').value=pid;document.getElementById('e_tgl').value=tgl;document.getElementById('e_mul').value=jam;showPage('dokumentasi');openModal('sesiModal');}
function saveSesi(){
  const i=document.getElementById('e_idx').value;
  const nd={proker_id:document.getElementById('e_pid').value,tanggal_sesi:document.getElementById('e_tgl').value,waktu_mulai:document.getElementById('e_mul').value,waktu_selesai:document.getElementById('e_sel').value,keterangan:document.getElementById('e_ket').value,materi:document.getElementById('e_mat').value,kendala:document.getElementById('e_kend').value,foto_url:document.getElementById('e_foto').value,hadir_peserta:getPckVal('peserta'),hadir_panitia:getPckVal('panitia'),hadir_narasumber:getPckVal('narasumber'),...getBR()};
  if(i==='new'){const ni=Date.now();S.dok.push({...nd,_i:ni,_m:false,_n:true,_d:false});logC('add','dokumentasi',ni,nd.keterangan||'Sesi baru');toast('✅ Sesi ditambahkan','success');}
  else{const idx=S.dok.findIndex(d=>d._i===+i);if(idx>=0){S.dok[idx]={...S.dok[idx],...nd,_m:true};logC('edit','dokumentasi',+i,nd.keterangan);}toast('✅ Sesi disimpan','success');}
  closeModal('sesiModal');renderAll();
}

/* ═ BIAYA ═ */
function initBR(s){const it=spl(s.item_biaya),es=spl(s.estimasi_biaya_item),ak=spl(s.biaya_aktual);BR=it.map((item,i)=>({item:item.trim(),est:es[i]||'',aktual:ak[i]||''}));if(!BR.length)BR=[{item:'',est:'',aktual:''}];renderBR();}
function renderBR(tid='biaya-tbody'){document.getElementById(tid).innerHTML=BR.map((r,i)=>'<tr><td><input type="text" class="fi" value="'+esc(r.item)+'" oninput="BR['+i+'].item=this.value" placeholder="Item…"/></td><td><input type="number" class="fi" value="'+r.est+'" oninput="BR['+i+'].est=this.value" placeholder="0"/></td><td><input type="number" class="fi" value="'+r.aktual+'" oninput="BR['+i+'].aktual=this.value" placeholder="0"/></td><td><button class="btn-dr" onclick="BR.splice('+i+',1);renderBR(\''+tid+'\')">✕</button></td></tr>').join('');}
function addBiayaRow(tid='biaya-tbody'){BR.push({item:'',est:'',aktual:''});renderBR(tid);}
function getBR(){return{item_biaya:BR.map(r=>r.item).join(','),estimasi_biaya_item:BR.map(r=>r.est).join(','),biaya_aktual:BR.map(r=>r.aktual).join(',')};}

/* ═ JADWAL ═ */
function renderJad(){
  const pend=S.jad.filter(j=>j._m||j._n||j._d).length;
  document.getElementById('jadwalBanner').classList.toggle('show',pend>0);
  document.getElementById('jadwalBannerN').textContent=pend;
  const bp={};S.jad.forEach(j=>{if(!bp[j.proker_id])bp[j.proker_id]=[];bp[j.proker_id].push(j);});
  document.getElementById('jadwalContent').innerHTML=Object.entries(bp).sort(([a],[b])=>a>b?1:-1).map(([id,jads])=>{
    const info=PK[id]||{n:'Proker '+id,i:'📌'};const up=jads.filter(j=>!j._d&&j.tanggal>=S.today).length;
    return'<div class="panel"><div class="ph2"><span class="ph2-i">'+info.i+'</span><span class="ph2-t">#'+id+' '+info.n+'</span><span class="ph2-s">'+jads.filter(j=>!j._d).length+' jadwal · '+up+' upcoming</span><button class="btn-add" style="padding:3px 9px;font-size:.68rem;margin-left:4px" onclick="openNewJadwalModal(\''+id+'\')">+</button></div><div class="pb" style="padding:9px 12px"><div class="jchips">'+jads.sort((a,b)=>a.tanggal>b.tanggal?1:-1).map(j=>{const cls=j._d?'del':j._n?'newrow':j._m?'mod':j.tanggal<S.today?'past':'';const delBtn=j._d?'<button class="jchip-del" onclick="event.stopPropagation();restJad('+j._i+')" title="Batalkan hapus">↩</button>':'<button class="jchip-del" onclick="event.stopPropagation();delJad('+j._i+')" title="Hapus">✕</button>';
return'<div class="jchip '+cls+'" onclick="openEditJad('+j._i+')">'+j.tanggal+' <span style="opacity:.6">'+j.jam+'</span> '+(j._d?'🗑️':j._n?'✨':j._m?'✏️':'')+' '+delBtn+'</div>';}).join('')+'</div></div></div>';
  }).join('');
}
function openNewJadwalModal(pid='01'){document.getElementById('ej_idx').value='new';document.getElementById('jadMT').textContent='Tambah Jadwal';document.getElementById('ej_pid').innerHTML=pkOpts(pid);document.getElementById('ej_tgl').value=S.today;document.getElementById('ej_jam').value='14:00';openModal('jadwalModal');}
function openEditJad(i){const j=S.jad.find(j=>j._i===i);if(!j)return;document.getElementById('ej_idx').value=i;document.getElementById('jadMT').textContent='Edit Jadwal';document.getElementById('ej_pid').innerHTML=pkOpts(j.proker_id);document.getElementById('ej_tgl').value=j.tanggal;document.getElementById('ej_jam').value=j.jam;openModal('jadwalModal');}
function saveJadwal(){
  const i=document.getElementById('ej_idx').value;
  const nd={proker_id:document.getElementById('ej_pid').value,tanggal:document.getElementById('ej_tgl').value,jam:document.getElementById('ej_jam').value};
  if(i==='new'){const ni=Date.now();S.jad.push({...nd,_i:ni,_m:false,_n:true,_d:false});logC('add','jadwal',ni,nd.proker_id+' '+nd.tanggal);}
  else{const idx=S.jad.findIndex(j=>j._i===+i);if(idx>=0){S.jad[idx]={...S.jad[idx],...nd,_m:true};logC('edit','jadwal',+i,nd.proker_id+' '+nd.tanggal);}}
  closeModal('jadwalModal');renderAll();toast('✅ Jadwal disimpan','success');
}
function delJad(i){
  if(!confirm('Hapus jadwal ini?'))return;
  const idx=S.jad.findIndex(j=>j._i===i);
  if(idx<0)return;
  if(S.jad[idx]._n){S.jad.splice(idx,1);}else{S.jad[idx]._d=true;S.jad[idx]._m=false;logC('del','jadwal',i,(S.jad[idx].proker_id||'')+' '+S.jad[idx].tanggal);}
  renderAll();toast('🗑️ Jadwal dihapus','warning');
}
function restJad(i){
  const idx=S.jad.findIndex(j=>j._i===i);
  if(idx>=0){S.jad[idx]._d=false;S.changes=S.changes.filter(c=>!(c.sh==='jadwal'&&c.idx===i&&c.a==='del'));}
  renderAll();toast('↩ Dipulihkan');
}

/* ═ PROKER DETAIL ═ */
const BR_DET={};
function initDetBiaya(d){
  // Selalu re-init dari data S.det terbaru (bukan pakai cache stale)
  const it=spl(d.item_biaya),es=spl(d.estimasi_biaya_item),ak=spl(d.biaya_aktual);
  // Ambil panjang terbanyak agar tidak ada baris yang hilang
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
    // Init biaya — selalu dari data terkini kecuali sedang diedit (_m)
    if(!d._m) initDetBiaya(d);
    else if(!BR_DET[d._i]) initDetBiaya(d);
    const totalEst=BR_DET[d._i].reduce((a,r)=>a+(parseFloat(r.est)||0),0);
    const totalAkt=BR_DET[d._i].reduce((a,r)=>a+(parseFloat(r.aktual)||0),0);
    const biayaBadge=totalEst>0
      ?'<span style="font-size:.7rem;color:var(--gm);margin-left:auto">Est: <strong style="color:var(--ch)">Rp '+fNum(totalEst)+'</strong>'+(totalAkt>0?' · Aktual: <strong style="color:var(--ok)">Rp '+fNum(totalAkt)+'</strong>':'')+'</span>'
      :'';
    return(
      '<div class="panel" id="det-panel-'+d._i+'" style="'+(d._m?'border-color:var(--warn)':'')+'">'
      +'<div class="ph2" style="'+(d._m?'background:linear-gradient(90deg,#FFFBEB,var(--ow));border-bottom-color:#FDE68A':'')+'">'
        +'<span class="ph2-i">'+info.i+'</span>'
        +'<span class="ph2-t">#'+d.proker_id+' '+info.n+'</span>'
        +biayaBadge
        +(d._m?'<span class="chg chg-m" style="margin-left:6px">Diubah</span>':'')
      +'</div>'
      +'<div class="pb">'
        // ── Info umum (2 kolom) ──
        +'<div class="det-g">'
          +'<div class="fg"><div class="fl">Tujuan</div><textarea class="fta" oninput="updDet('+d._i+',\'tujuan\',this.value)">'+esc(d.tujuan||'')+'</textarea></div>'
          +'<div class="fg"><div class="fl">Waktu (teks)</div><input type="text" class="fi" value="'+esc(d.waktu_teks||'')+'" oninput="updDet('+d._i+',\'waktu_teks\',this.value)"/></div>'
          +'<div class="fg"><div class="fl">Est. Tanggal</div><input type="date" class="fi" value="'+(d.estimasi_tanggal||'')+'" oninput="updDet('+d._i+',\'estimasi_tanggal\',this.value)"/></div>'
          +'<div class="fg"><div class="fl">Lokasi</div><input type="text" class="fi" value="'+esc(d.lokasi||'')+'" oninput="updDet('+d._i+',\'lokasi\',this.value)"/></div>'
          +'<div class="fg"><div class="fl">Sasaran</div><input type="text" class="fi" value="'+esc(d.sasaran||'')+'" oninput="updDet('+d._i+',\'sasaran\',this.value)"/></div>'
        +'</div>'
        // ── Pemateri & Panitia picker ──
        +pickerHtml('det_pemateri_'+d._i,'Pemateri')
        +pickerHtml('det_panitia_'+d._i,'Panitia')
        // ── Tabel Biaya RAB ──
        +'<div class="fg" style="margin-top:4px">'
          +'<div class="fl">Rincian Biaya <span class="flb">RAB</span></div>'
          +'<table class="btbl">'
            +'<thead><tr>'
              +'<th style="width:40%">Item / Keterangan</th>'
              +'<th style="width:22%">Est. Biaya (Rp)</th>'
              +'<th style="width:22%">Biaya Aktual (Rp)</th>'
              +'<th style="width:16%">Selisih</th>'
              +'<th></th>'
            +'</tr></thead>'
            +'<tbody id="det-biaya-tbody-'+d._i+'"></tbody>'
            +'<tfoot id="det-biaya-tfoot-'+d._i+'"></tfoot>'
          +'</table>'
          +'<button class="btn-ar" onclick="addDetBiaya('+d._i+')">+ Tambah Item</button>'
        +'</div>'
      +'</div>'
    +'</div>'
    );
  }).join('')||'<div class="empty"><div class="ei">📌</div><div class="et">Tidak ada data detail proker</div></div>';
  S.det.forEach(d=>{initPicker('det_pemateri_'+d._i,d.pemateri||'');initPicker('det_panitia_'+d._i,d.panitia||'');renderDetBiaya(d._i);});
}

function renderDetBiaya(di){
  const tbody=document.getElementById('det-biaya-tbody-'+di);if(!tbody)return;
  if(!BR_DET[di]||!BR_DET[di].length)BR_DET[di]=[{item:'',est:'',aktual:''}];
  tbody.innerHTML=BR_DET[di].map((r,i)=>{
    const est=parseFloat(r.est)||0,akt=parseFloat(r.aktual)||0;
    const sel=est&&akt?akt-est:null;
    const selHtml=sel!==null
      ?'<span style="font-size:.76rem;font-weight:700;color:'+(sel<=0?'var(--ok)':'var(--err)')+'">'+
        (sel<=0?'':'+')+fNum(sel)+'</span>'
      :'–';
    return'<tr>'
      +'<td><input type="text" class="fi" value="'+esc(r.item)+'" oninput="BR_DET['+di+']['+i+'].item=this.value;syncDetBiaya('+di+')" placeholder="Nama item/keterangan…"/></td>'
      +'<td><input type="number" class="fi" value="'+r.est+'" oninput="BR_DET['+di+']['+i+'].est=this.value;syncDetBiaya('+di+');renderDetBiaya('+di+')" placeholder="0"/></td>'
      +'<td><input type="number" class="fi" value="'+r.aktual+'" oninput="BR_DET['+di+']['+i+'].aktual=this.value;syncDetBiaya('+di+');renderDetBiaya('+di+')" placeholder="0"/></td>'
      +'<td style="text-align:center;min-width:70px">'+selHtml+'</td>'
      +'<td><button class="btn-dr" onclick="BR_DET['+di+'].splice('+i+',1);renderDetBiaya('+di+');syncDetBiaya('+di+')">✕</button></td>'
    +'</tr>';
  }).join('');
  // Footer total
  const tfoot=document.getElementById('det-biaya-tfoot-'+di);if(!tfoot)return;
  const rows=BR_DET[di];
  const sumEst=rows.reduce((a,r)=>a+(parseFloat(r.est)||0),0);
  const sumAkt=rows.reduce((a,r)=>a+(parseFloat(r.aktual)||0),0);
  const hasAny=rows.some(r=>r.est||r.aktual);
  if(!hasAny){tfoot.innerHTML='';return;}
  const sumSel=sumAkt-sumEst;
  tfoot.innerHTML='<tr style="background:var(--ow);font-weight:700;font-size:.78rem">'
    +'<td style="padding:6px 8px;color:var(--gm)">Total</td>'
    +'<td style="padding:6px 4px">Rp '+fNum(sumEst)+'</td>'
    +'<td style="padding:6px 4px">Rp '+fNum(sumAkt)+'</td>'
    +'<td style="padding:6px 4px;text-align:center"><span style="color:'+(sumSel<=0?'var(--ok)':'var(--err)')+'">'+
      (sumSel<=0?'':'+')+'Rp '+fNum(Math.abs(sumSel))+'</span></td>'
    +'<td></td>'
  +'</tr>';
}

function addDetBiaya(di){
  if(!BR_DET[di])BR_DET[di]=[];
  BR_DET[di].push({item:'',est:'',aktual:''});
  renderDetBiaya(di);
  // Fokus ke input terakhir
  const tbody=document.getElementById('det-biaya-tbody-'+di);
  if(tbody){const inp=tbody.querySelectorAll('input[type=text]');if(inp.length)inp[inp.length-1].focus();}
}

function syncDetBiaya(di){
  const idx=S.det.findIndex(d=>d._i===di);if(idx<0)return;
  // Filter baris kosong total sebelum sync (tapi simpan jika salah satu diisi)
  const rows=BR_DET[di].filter(r=>r.item||r.est||r.aktual);
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

/* ═ NOTIF ═ */
function renderNotif(){
  const pend=S.notif.filter(d=>d._m).length;
  document.getElementById('notifBanner').classList.toggle('show',pend>0);
  document.getElementById('notifBannerN').textContent=pend;
  document.getElementById('notifTbody').innerHTML=S.notif.map(n=>{
    const info=PK[n.proker_id]||{n:'#'+n.proker_id,i:'📌'};
    const ck=v=>(v==='true'||v===true)?'checked':'';
    return'<tr style="'+(n._m?'background:#FFFBEB':'')+'"><td><strong>'+info.i+' '+n.proker_id+'</strong><br><span style="font-size:.66rem;color:var(--gm)">'+info.n+'</span><br><button class="btn-del" style="font-size:.62rem;padding:2px 6px;margin-top:3px" onclick="delNotif('+n._i+')">🗑️ Hapus</button></td><td><input type="checkbox" class="tsw" '+ck(n.countdown_aktif)+' onchange="updNotif('+n._i+',\'countdown_aktif\',this.checked?\'true\':\'false\')"/></td><td><input type="checkbox" class="tsw" '+ck(n.ajakan)+' onchange="updNotif('+n._i+',\'ajakan\',this.checked?\'true\':\'false\')"/></td><td><input type="text" class="fi" value="'+esc(n.ajakan_teks||'')+'" oninput="updNotif('+n._i+',\'ajakan_teks\',this.value)" style="min-width:150px"/></td><td><input type="text" class="fi" value="'+esc(n.ajakan_sub||'')+'" oninput="updNotif('+n._i+',\'ajakan_sub\',this.value)" style="min-width:150px"/></td><td><input type="checkbox" class="tsw" '+ck(n.wajib_hadir)+' onchange="updNotif('+n._i+',\'wajib_hadir\',this.checked?\'true\':\'false\')"/></td><td><input type="text" class="fi" value="'+esc(n.wajib_hadir_teks||'')+'" oninput="updNotif('+n._i+',\'wajib_hadir_teks\',this.value)" style="min-width:115px"/></td><td><input type="text" class="fi" value="'+esc(n.wajib_hadir_sanksi||'')+'" oninput="updNotif('+n._i+',\'wajib_hadir_sanksi\',this.value)" style="min-width:150px"/></td></tr>';
  }).join('');
}
function updNotif(i,k,v){const idx=S.notif.findIndex(d=>d._i===i);if(idx>=0){S.notif[idx][k]=v;if(!S.notif[idx]._m){S.notif[idx]._m=true;logC('edit','notif_config',i,'Notif #'+S.notif[idx].proker_id);}}updateBadges();document.getElementById('notifBanner').classList.add('show');document.getElementById('notifBannerN').textContent=S.notif.filter(d=>d._m).length;}
function delNotif(i){
  if(!confirm('Hapus config notif proker ini?'))return;
  const idx=S.notif.findIndex(d=>d._i===i);
  if(idx>=0){S.notif.splice(idx,1);logC('del','notif_config',i,'Notif');}
  renderAll();toast('🗑️ Notif dihapus','warning');
}

/* ═ ANGGOTA ═ */
function renderAng(){
  const pend=S.ang.filter(a=>a._m||a._n||a._d).length;
  document.getElementById('anggotaBanner').classList.toggle('show',pend>0);
  document.getElementById('anggotaBannerN').textContent=pend;
  const F=['nama','kelas','angkatan','status','no_hp','catatan'];
  document.getElementById('anggotaTbody').innerHTML=S.ang.map(a=>{const cls=a._d?'del':a._n?'newrow':a._m?'mod':'';return'<tr class="'+cls+'">'+F.map(f=>'<td><input type="'+(f==='no_hp'?'tel':'text')+'" class="fi" value="'+esc(a[f]||'')+'" oninput="updAng('+a._i+',\''+f+'\',this.value)" style="min-width:'+(f==='nama'?100:f==='catatan'?135:60)+'px"/></td>').join('')+'<td>'+(a._d?'<button class="btn-add" style="padding:3px 8px;font-size:.66rem" onclick="restAng('+a._i+')">↩</button>':'<button class="btn-del" onclick="delAng('+a._i+')">🗑️</button>')+'</td></tr>';}).join('');
}
function updAng(i,k,v){const idx=S.ang.findIndex(a=>a._i===i);if(idx>=0){S.ang[idx][k]=v;if(!S.ang[idx]._n&&!S.ang[idx]._m){S.ang[idx]._m=true;logC('edit','anggota',i,S.ang[idx].nama||'Anggota');}}updateBadges();document.getElementById('anggotaBanner').classList.add('show');document.getElementById('anggotaBannerN').textContent=S.ang.filter(a=>a._m||a._n||a._d).length;}
function addAnggotaRow(){const ni=Date.now();S.ang.push({nama:'',kelas:'',angkatan:'',status:'',no_hp:'',catatan:'',_i:ni,_n:true,_m:false,_d:false});logC('add','anggota',ni,'Anggota baru');renderAll();}
function delAng(i){const idx=S.ang.findIndex(a=>a._i===i);if(idx>=0){if(S.ang[idx]._n)S.ang.splice(idx,1);else{S.ang[idx]._d=true;logC('del','anggota',i,S.ang[idx].nama||'Anggota');}}renderAll();toast('🗑️ Ditandai dihapus','warning');}
function restAng(i){const idx=S.ang.findIndex(a=>a._i===i);if(idx>=0){S.ang[idx]._d=false;S.changes=S.changes.filter(c=>!(c.sh==='anggota'&&c.idx===i&&c.a==='del'));}renderAll();toast('↩ Dipulihkan');}

/* ═ PENGURUS ═ */
function renderPeng(){
  const pend=S.peng.filter(p=>p._m).length;
  document.getElementById('pengurusBanner').classList.toggle('show',pend>0);
  document.getElementById('pengurusBannerN').textContent=pend;

  // Kelompokkan per jabatan_level untuk tampilan terstruktur
  const ORDER=['ketua','wakil','sekretaris','bendahara','bidang'];
  const DEF_ICON={ketua:'👑',wakil:'🌟',sekretaris:'📝',bendahara:'💰',bidang:'📚'};
  const LVL_LABEL={ketua:'Ketua',wakil:'Wakil',sekretaris:'Sekretaris',bendahara:'Bendahara',bidang:'Bidang'};

  const grouped={};
  ORDER.forEach(l=>grouped[l]=[]);
  S.peng.forEach(p=>{
    const lv=(p.jabatan_level||'').trim().toLowerCase();
    if(grouped[lv]) grouped[lv].push(p);
    else{if(!grouped._lain)grouped._lain=[];grouped._lain.push(p);}
  });

  const sections=ORDER.filter(l=>grouped[l]&&grouped[l].length).map(lv=>{
    const cards=grouped[lv].map(p=>{
      const rawLink=p['link photo']||'';
      const thumb=p.photo||exPhoto(rawLink)||'';
      const icon=p.icon||DEF_ICON[lv]||'👤';
      const pHtml=thumb
        ?'<img src="'+thumb+'" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'" loading="lazy"/><div class="peng-plc" style="display:none">'+icon+'</div>'
        :'<div class="peng-plc">'+icon+'</div>';
      return '<div class="peng-card'+(p._m?' peng-modified':'')+'" onclick="openPengModal('+p._i+')">'
        +'<div class="peng-ph">'+pHtml+'</div>'
        +'<div class="peng-bd">'
          +'<div class="peng-pill">'+icon+' '+(p.jabatan_level||'')+'</div>'
          +'<div class="peng-nm">'+(p.nama||'–')+'</div>'
          +'<div class="peng-jab">'+(p.jabatan||'')+'</div>'
          +'<div class="peng-kl">Kelas '+(p.kelas||'–')+'</div>'
          +(p.desc?'<div class="peng-desc">'+(p.desc)+'</div>':'')
          +(p._m?'<span class="chg chg-m peng-chg">Diubah</span>':'')
          +'<div class="peng-actions">'
          +'<button class="btn-esm peng-edit-btn" onclick="event.stopPropagation();openPengModal('+p._i+')">✏️ Edit</button>'
          +'<button class="btn-del peng-del-btn" onclick="event.stopPropagation();delPeng('+p._i+')" style="font-size:.65rem;padding:3px 7px">🗑️</button>'
        +'</div>'
        +'</div>'
      +'</div>';
    }).join('');
    return '<div class="peng-section">'
      +'<div class="peng-sec-hdr"><span class="peng-sec-ic">'+DEF_ICON[lv]+'</span><span class="peng-sec-lbl">'+LVL_LABEL[lv]+'</span><span class="peng-sec-ct">'+grouped[lv].length+' orang</span></div>'
      +'<div class="peng-grid">'+cards+'</div>'
    +'</div>';
  }).join('');

  document.getElementById('pengurusGrid').innerHTML = sections ||
    '<div class="empty"><div class="ei">👤</div><div class="et">Tidak ada data pengurus</div></div>';
}
function openPengModal(i){
  const p=S.peng.find(x=>x._i===i);if(!p)return;
  const DEF_ICON={ketua:'👑',wakil:'🌟',sekretaris:'📝',bendahara:'💰',bidang:'📚'};
  document.getElementById('ep_idx').value=i;
  document.getElementById('ep_level').value=p.jabatan_level||'ketua';
  document.getElementById('ep_jabatan').value=p.jabatan||'';
  document.getElementById('ep_nama').value=p.nama||'';
  document.getElementById('ep_kelas').value=p.kelas||'';
  document.getElementById('ep_icon').value=p.icon||(DEF_ICON[p.jabatan_level]||'👤');
  document.getElementById('ep_foto').value=p['link photo']||'';
  document.getElementById('ep_desc').value=p.desc||'';
  // Tampilkan preview foto jika ada
  const prev=document.getElementById('ep_foto_prev');
  const thumb=p.photo||exPhoto(p['link photo']||'');
  prev.src=thumb||'';prev.style.display=thumb?'block':'none';
  openModal('pengurusModal');
}
function savePengurus(){
  const i=+document.getElementById('ep_idx').value,idx=S.peng.findIndex(x=>x._i===i);if(idx<0)return;
  const rawLink=document.getElementById('ep_foto').value.trim();
  const thumb=exPhoto(rawLink);
  S.peng[idx]={
    ...S.peng[idx],
    jabatan_level: document.getElementById('ep_level').value,
    jabatan:       document.getElementById('ep_jabatan').value,
    nama:          document.getElementById('ep_nama').value,
    kelas:         document.getElementById('ep_kelas').value,
    icon:          document.getElementById('ep_icon').value.trim(),
    'link photo':  rawLink,
    photo:         thumb,
    desc:          document.getElementById('ep_desc').value,
    _m:true
  };
  if(!S.changes.find(c=>c.sh==='pengurus'&&c.idx===i))
    logC('edit','pengurus',i,S.peng[idx].nama||'Pengurus');
  closeModal('pengurusModal');renderAll();toast('✅ Pengurus disimpan','success');
}
function pengFotoPreview(){
  const raw=document.getElementById('ep_foto').value.trim();
  const thumb=exPhoto(raw);
  const prev=document.getElementById('ep_foto_prev');
  prev.src=thumb||'';prev.style.display=thumb?'block':'none';
}
function addPengurusRow(){
  const DEF_ICON={ketua:'👑',wakil:'🌟',sekretaris:'📝',bendahara:'💰',bidang:'📚'};
  const ni=Date.now();
  S.peng.push({jabatan_level:'bidang',jabatan:'',nama:'',kelas:'','link photo':'',icon:'📚',desc:'',photo:'',_i:ni,_n:true,_m:false});
  logC('add','pengurus',ni,'Pengurus baru');
  renderAll();
  // Langsung buka modal edit untuk pengurus baru
  openPengModal(ni);
}
function delPeng(i){
  if(!confirm('Hapus data pengurus ini?'))return;
  const idx=S.peng.findIndex(p=>p._i===i);
  if(idx<0)return;
  S.peng.splice(idx,1);
  logC('del','pengurus',i,'Pengurus');
  renderAll();toast('🗑️ Pengurus dihapus','warning');
}


/* ═ BADGES & LOG ═ */
function updateBadges(){
  ['dokumentasi','jadwal','detail','notif','anggota'].forEach(k=>document.getElementById('badge-'+k).textContent=0);
  document.getElementById('badge-dokumentasi').textContent=S.dok.filter(d=>d._m||d._n||d._d).length;
  document.getElementById('badge-jadwal').textContent=S.jad.filter(j=>j._m||j._n||j._d).length;
  document.getElementById('badge-detail').textContent=S.det.filter(d=>d._m).length;
  document.getElementById('badge-notif').textContent=S.notif.filter(d=>d._m).length;
  document.getElementById('badge-anggota').textContent=S.ang.filter(a=>a._m||a._n||a._d).length;
  document.getElementById('badge-pengurus').textContent=S.peng.filter(p=>p._m).length;
  document.getElementById('badge-changelog').textContent=S.changes.length;
  document.getElementById('st-changes').textContent=S.changes.length;
  document.getElementById('btnUpload').disabled=S.changes.length===0;
}
function logC(a,sh,idx,lbl){
  // Jika baris ini sudah 'add' (baru), jangan overwrite ke 'edit'
  // — tetap 'add' agar upload pakai append bukan replaceAll
  const existing=S.changes.find(c=>c.idx===idx&&c.sh===sh);
  if(existing&&existing.a==='add'&&a==='edit'){
    existing.lbl=lbl;
    existing.t=new Date().toLocaleTimeString('id',{hour:'2-digit',minute:'2-digit'});
    renderChangelog();updateBadges();return;
  }
  S.changes=S.changes.filter(c=>!(c.idx===idx&&c.sh===sh&&c.a!=='del'));
  S.changes.push({a,sh,idx,lbl,t:new Date().toLocaleTimeString('id',{hour:'2-digit',minute:'2-digit'})});
  renderChangelog();updateBadges();
}
function renderChangelog(){
  const el=document.getElementById('changelogContent');
  if(!S.changes.length){el.innerHTML='<div class="empty"><div class="ei">✅</div><div class="et">Tidak ada perubahan</div><div class="ed">Semua tersinkron</div></div>';return;}
  const ic={add:'➕',edit:'✏️',del:'🗑️',upload:'☁️'};
  const shl={dokumentasi:'📋 Dokumentasi',jadwal:'📅 Jadwal',proker_detail:'📌 Detail',notif_config:'🔔 Notif',anggota:'👥 Anggota',pengurus:'🎌 Pengurus'};
  el.innerHTML='<div class="clog">'+[...S.changes].reverse().map(c=>'<div class="cl-i '+(c.a==='add'?'add':c.a==='edit'?'edit':c.a==='del'?'del':'upload')+'"><span>'+(ic[c.a]||'?')+'</span><div class="cl-lb"><div>'+c.lbl+'</div><div class="cl-sub">'+(shl[c.sh]||c.sh)+'</div></div><span class="cl-t">'+c.t+'</span></div>').join('')+'</div>';
}

/* ═ UPLOAD ═ */

// Cek apakah perubahan pada satu sheet HANYA berupa penambahan baris baru (tidak ada edit/hapus)
function _isAddOnly(sh){
  const chg=S.changes.filter(c=>c.sh===sh);
  return chg.length>0 && chg.every(c=>c.a==='add');
}

// Ambil baris-baris baru (_n:true) untuk suatu sheet
function _getNewRows(sh){
  if(sh==='dokumentasi') return S.dok.filter(d=>d._n&&!d._d);
  if(sh==='jadwal')       return S.jad.filter(j=>j._n&&!j._d);
  if(sh==='anggota')      return S.ang.filter(a=>a._n&&!a._d);
  if(sh==='pengurus')     return S.peng.filter(p=>p._n&&!p._d);
  // detail & notif tidak punya _n — selalu replaceAll
  return [];
}

function handleUpload(){
  if(!S.changes.length){toast('Tidak ada perubahan','warning');return;}
  const sheets=[...new Set(S.changes.map(c=>c.sh))];
  const shLabel={dokumentasi:'📋 Dokumentasi',jadwal:'📅 Jadwal',proker_detail:'📌 Detail Proker',notif_config:'🔔 Notif Config',anggota:'👥 Anggota',pengurus:'🎌 Pengurus'};
  const lines=sheets.map(sh=>{
    const lbl=shLabel[sh]||sh;
    if(_isAddOnly(sh)){
      const n=_getNewRows(sh).length;
      return '• <strong>'+lbl+'</strong> — tambah '+n+' baris baru <span style="color:var(--ok);font-weight:700">(append only, data lama aman)</span>';
    }
    return '• <strong>'+lbl+'</strong> — replace seluruh sheet';
  });
  const hasReplace=sheets.some(sh=>!_isAddOnly(sh));
  document.getElementById('upSummary').innerHTML=
    '<div style="font-weight:700;margin-bottom:8px">Rencana upload:</div>'
    +lines.map(l=>'<div style="padding:3px 0">'+l+'</div>').join('')
    +(hasReplace?'<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--gl);color:var(--gm);font-size:.72rem">⚠️ Sheet yang di-replace: semua baris lama dihapus lalu data terbaru di-insert sekaligus.</div>':'');
  openModal('uploadModal');
}

async function confirmUpload(){
  closeModal('uploadModal');
  const btn=document.getElementById('btnCU');btn.disabled=true;
  const prog=document.getElementById('upProgress'),bar=document.getElementById('upBar'),step=document.getElementById('upStep');
  prog.classList.add('show');bar.style.width='0%';
  setS('loading','Mengupload…');
  const sheets=[...new Set(S.changes.map(c=>c.sh))];
  const shLabel={dokumentasi:'Dokumentasi',jadwal:'Jadwal',proker_detail:'Detail Proker',notif_config:'Notif Config',anggota:'Anggota',pengurus:'Pengurus'};
  let ok=0,fail=0;
  for(let si=0;si<sheets.length;si++){
    const sh=sheets[si];
    const lbl=shLabel[sh]||sh;
    step.textContent='Mengupload '+lbl+' ('+(si+1)+'/'+sheets.length+')…';
    bar.style.width=Math.round(si/sheets.length*100)+'%';
    try{
      if(_isAddOnly(sh)){
        await uploadShAppend(sh, (msg)=>{step.textContent=msg;});
      } else {
        await uploadShFull(sh, (msg)=>{step.textContent=msg;});
      }
      ok++;
    }catch(e){
      fail++;
      toast('❌ Gagal '+lbl+': '+e.message,'error');
      console.error(sh,e);
    }
  }
  bar.style.width='100%';
  step.textContent=ok+' sheet berhasil'+(fail>0?', '+fail+' gagal':'')+'!';
  setTimeout(()=>prog.classList.remove('show'),2500);
  if(!fail){
    S.dok.forEach(d=>{d._m=false;d._n=false;});S.dok=S.dok.filter(d=>!d._d);
    S.jad.forEach(j=>{j._m=false;j._n=false;});S.jad=S.jad.filter(j=>!j._d);
    S.det.forEach(d=>d._m=false);S.notif.forEach(d=>d._m=false);
    S.ang.forEach(a=>{a._m=false;a._n=false;});S.ang=S.ang.filter(a=>!a._d);
    S.peng.forEach(p=>{p._m=false;p._n=false;});
    S.changes=[];Object.keys(BR_DET).forEach(k=>delete BR_DET[k]);
    setS('ok','Tersinkron ✓');toast('🎉 Upload berhasil!','success');
    renderAll();renderChangelog();
  }else{setS('error','Sebagian gagal');toast('⚠️ '+ok+' berhasil, '+fail+' gagal','error');}
  btn.disabled=false;
}

// ── Hitung chunk size adaptif (max ~3200 encoded chars per request) ──
function _safeChunk(hdr, rows){
  if(!rows.length) return 5;
  const sample=encodeURIComponent(JSON.stringify({headers:hdr,rows:[rows[0]]})).length;
  return Math.max(1,Math.floor(3200/sample));
}

// ── APPEND ONLY: hanya insert baris baru, tidak menyentuh data lama ──
async function uploadShAppend(sh, onStep){
  const shLabel={dokumentasi:'Dokumentasi',jadwal:'Jadwal',anggota:'Anggota',pengurus:'Pengurus'};
  const gas={dokumentasi:'proker_dokumentasi',jadwal:'proker_jadwal',anggota:'anggota',pengurus:'pengurus'}[sh];
  if(!gas) throw new Error('Unknown sheet for append: '+sh);
  const hdr=SH[gas];
  const lbl=shLabel[sh]||sh;
  const newRows=_getNewRows(sh);
  if(!newRows.length) return;

  // Konversi ke object-rows sesuai format GAS action=insert
  // JANGAN encodeURIComponent — jsonp() yang handle
  const cs=_safeChunk(hdr, newRows.map(obj=>hdr.map(h=>obj[h]!=null?String(obj[h]):'')));
  const total=Math.ceil(newRows.length/cs);
  for(let i=0,ci=1;i<newRows.length;i+=cs,ci++){
    if(onStep) onStep('Append '+lbl+': baris '+(i+1)+'–'+Math.min(i+cs,newRows.length)+(total>1?' (chunk '+ci+'/'+total+')':'')+'…');
    const objRows=newRows.slice(i,i+cs).map(obj=>{
      const o={};hdr.forEach(h=>{o[h]=obj[h]!=null?String(obj[h]):'';});return o;
    });
    await jsonp({sheet:gas,action:'insert',payload:JSON.stringify({rows:objRows})});
  }
}

// ── REPLACE ALL: kosongkan sheet lalu tulis ulang seluruh data ──
async function uploadShFull(sh, onStep){
  const shLabel={dokumentasi:'Dokumentasi',jadwal:'Jadwal',proker_detail:'Detail Proker',notif_config:'Notif Config',anggota:'Anggota',pengurus:'Pengurus'};
  const gas={dokumentasi:'proker_dokumentasi',jadwal:'proker_jadwal',proker_detail:'proker_detail',notif_config:'proker_notif_config',anggota:'anggota',pengurus:'pengurus'}[sh];
  if(!gas) throw new Error('Unknown sheet: '+sh);
  const hdr=SH[gas];
  let srcRows;
  if(sh==='dokumentasi')srcRows=S.dok.filter(d=>!d._d);
  else if(sh==='jadwal')srcRows=S.jad.filter(j=>!j._d);
  else if(sh==='proker_detail')srcRows=S.det;
  else if(sh==='notif_config')srcRows=S.notif;
  else if(sh==='anggota')srcRows=S.ang.filter(a=>!a._d);
  else if(sh==='pengurus')srcRows=S.peng;
  else throw new Error('Unknown sheet: '+sh);

  // JANGAN encodeURIComponent di sini — jsonp() yang handle
  const rows=srcRows.map(obj=>hdr.map(h=>obj[h]!=null?String(obj[h]):''));
  const fullJson=JSON.stringify({headers:hdr,rows});
  const lbl=shLabel[sh]||sh;

  if(encodeURIComponent(fullJson).length<=3500){
    if(onStep) onStep('Upload '+lbl+'…');
    await jsonp({sheet:gas,action:'replaceAll',payload:fullJson});
  } else {
    if(onStep) onStep('Membersihkan '+lbl+'…');
    await jsonp({sheet:gas,action:'replaceAll',payload:JSON.stringify({headers:hdr,rows:[]})});
    if(!rows.length) return;
    const cs=_safeChunk(hdr,rows);
    const total=Math.ceil(rows.length/cs);
    for(let i=0,ci=1;i<rows.length;i+=cs,ci++){
      if(onStep) onStep('Upload '+lbl+': baris '+(i+1)+'–'+Math.min(i+cs,rows.length)+' (chunk '+ci+'/'+total+')…');
      const objRows=rows.slice(i,i+cs).map(r=>{
        const o={};hdr.forEach((h,j)=>{o[h]=r[j]||'';});return o;
      });
      await jsonp({sheet:gas,action:'insert',payload:JSON.stringify({rows:objRows})});
    }
  }
}

/* ═ HELPERS ═ */
function spl(s){if(!s)return[];return s.split(',').map(v=>v.trim()).filter(Boolean);}
function pBiaya(s){if(!s)return 0;return s.split(',').reduce((a,v)=>a+(parseFloat(v.trim())||0),0);}
function fNum(n){return n.toLocaleString('id');}
function fNum(n){return(+n||0).toLocaleString('id-ID');}
function fDate(s){if(!s)return'–';const d=new Date(s+'T00:00:00');return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function exPhoto(l){if(!l)return'';const m=l.match(/\/d\/([a-zA-Z0-9_-]+)/);return m?'https://lh3.googleusercontent.com/d/'+m[1]:l;}
function pkOpts(sel){return Object.entries(PK).map(([id,info])=>'<option value="'+id+'" '+(id===sel?'selected':'')+'>'+info.i+' #'+id+' — '+info.n+'</option>').join('');}
function setS(type,text){const d=document.getElementById('statusDot');d.className='tb-d '+type;document.getElementById('statusTxt').textContent=text;}
function showPage(p){
  document.querySelectorAll('.ps').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.sb-i').forEach(e=>e.classList.remove('active'));
  const pg=document.getElementById('page-'+p);if(pg)pg.classList.add('active');
  const nv=document.getElementById('nav-'+p);if(nv)nv.classList.add('active');
  closeSidebar();
}
function openModal(id){document.getElementById(id).classList.add('open');document.body.style.overflow='hidden';}
function closeModal(id){document.getElementById(id).classList.remove('open');document.body.style.overflow='';}
document.querySelectorAll('.mov').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)closeModal(o.id);}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.mov.open').forEach(m=>closeModal(m.id));});
function toast(msg,type){const w=document.getElementById('tw');const t=document.createElement('div');t.className='toast '+(type||'');t.textContent=msg;w.appendChild(t);requestAnimationFrame(()=>requestAnimationFrame(()=>t.classList.add('show')));setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),400);},3500);}

init();
