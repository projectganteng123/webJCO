/**
 * ============================================================
 *  JCOSASI — Modul Cetak Laporan Dokumentasi Sesi
 *  Menggunakan:
 *    PDF  → jsPDF + jsPDF-AutoTable  (loaded on-demand)
 *    Excel → SheetJS / xlsx           (loaded on-demand)
 *
 *  Fungsi publik:
 *    openLaporanModal()   — buka dialog pilih sesi & format
 * ============================================================
 */

/* ════════════════════════════════════════════════════
   KONSTANTA & UTIL
════════════════════════════════════════════════════ */
const LAP = {
  PURPLE_DARK  : [74,  30, 140],
  PURPLE_MID   : [107, 52, 175],
  PURPLE_LIGHT : [240, 234, 250],
  WHITE        : [255, 255, 255],
  GREY_DARK    : [50,  45,  75],
  GREY_MID     : [120, 115, 145],
  GREY_LIGHT   : [226, 223, 240],
  RED_ACCENT   : [192,  57,  43],
};

function lapFDate(s) {
  if (!s) return '—';
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
}
function lapFTime(s) { return s || '—'; }
function lapFRp(val) {
  const n = String(val||'').split(',').reduce((a,v)=>a+(parseFloat(v)||0),0);
  return n > 0 ? 'Rp ' + n.toLocaleString('id-ID') : '—';
}
function lapSpl(s) { return (s||'').split(',').map(v=>v.trim()).filter(Boolean); }
function lapZip(names, klases) {
  const ns = lapSpl(names), ks = lapSpl(klases);
  return ns.map((n,i) => n + (ks[i] ? ' (' + ks[i] + ')' : ''));
}
function lapPkName(pid) {
  return (typeof PK !== 'undefined' && PK[pid]) ? PK[pid].n : 'Proker #' + pid;
}

/* Load script dari CDN (sekali saja) */
function _loadScript(url) {
  return new Promise((res, rej) => {
    if (document.querySelector('script[data-lib="' + url + '"]')) { res(); return; }
    const sc = document.createElement('script');
    sc.src = url;
    sc.setAttribute('data-lib', url);
    sc.onload  = res;
    sc.onerror = () => rej(new Error('Gagal load: ' + url));
    document.head.appendChild(sc);
  });
}

async function _loadJsPDF() {
  await _loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await _loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
}
async function _loadXLSX() {
  await _loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
}

/* ════════════════════════════════════════════════════
   MODAL DIALOG PILIH SESI
════════════════════════════════════════════════════ */
function openLaporanModal() {
  // Hapus modal lama jika ada
  const old = document.getElementById('laporanModal');
  if (old) old.remove();

  // Kumpulkan pilihan proker dari data yang ada
  const prokerList = [...new Set(
    (typeof S !== 'undefined' ? S.dok : []).filter(d=>!d._d).map(d=>d.proker_id)
  )].sort();

  // Kumpulkan sesi individual (sorted terbaru dulu)
  const sesiList = (typeof S !== 'undefined' ? S.dok : [])
    .filter(d=>!d._d)
    .sort((a,b) => b.tanggal_sesi > a.tanggal_sesi ? 1 : -1);

  const prokerOpts = prokerList.map(pid =>
    `<option value="pk:${pid}">${lapPkName(pid)} (#${pid})</option>`
  ).join('');

  const sesiOpts = sesiList.map(s =>
    `<option value="sesi:${s._i}">[${s.tanggal_sesi||'?'}] ${s.keterangan||(lapPkName(s.proker_id))} (#${s.proker_id})</option>`
  ).join('');

  const html = `
<div class="mov open" id="laporanModal" onclick="if(event.target===this)closeLaporanModal()">
  <div class="modal" style="max-width:460px">
    <div class="m-h">
      <span>🖨️</span>
      <span class="m-t">Cetak Laporan Dokumentasi</span>
      <button class="m-x" onclick="closeLaporanModal()">✕</button>
    </div>

    <!-- Cakupan -->
    <div class="fg">
      <div class="fl">Cakupan Laporan</div>
      <div style="display:flex;flex-direction:column;gap:7px;margin-top:2px">
        <label class="lap-radio-lbl">
          <input type="radio" name="lapScope" value="all" checked onchange="lapScopeChange()"/>
          <span>Semua sesi (${sesiList.length} sesi)</span>
        </label>
        <label class="lap-radio-lbl">
          <input type="radio" name="lapScope" value="proker" onchange="lapScopeChange()"/>
          <span>Per program kerja</span>
        </label>
        <label class="lap-radio-lbl">
          <input type="radio" name="lapScope" value="sesi" onchange="lapScopeChange()"/>
          <span>Satu sesi tertentu</span>
        </label>
      </div>
    </div>

    <!-- Sub-pilihan -->
    <div class="fg" id="lapSubAll" style="display:none">
      <div class="fhint">Semua sesi akan dimasukkan ke dalam laporan.</div>
    </div>
    <div class="fg" id="lapSubProker" style="display:none">
      <div class="fl">Pilih Program Kerja</div>
      <select class="fsel" id="lapProkerSel">${prokerOpts}</select>
    </div>
    <div class="fg" id="lapSubSesi" style="display:none">
      <div class="fl">Pilih Sesi</div>
      <select class="fsel" id="lapSesiSel">${sesiOpts}</select>
    </div>

    <!-- Format -->
    <div class="fg" style="margin-top:4px">
      <div class="fl">Format Output</div>
      <div style="display:flex;gap:10px;margin-top:4px">
        <button class="lap-fmt-btn active" id="lapBtnPDF" onclick="lapSelectFmt('pdf')">
          📄 PDF
        </button>
        <button class="lap-fmt-btn" id="lapBtnExcel" onclick="lapSelectFmt('excel')">
          📊 Excel
        </button>
        <button class="lap-fmt-btn" id="lapBtnCSV" onclick="lapSelectFmt('csv')">
          📋 CSV
        </button>
      </div>
    </div>

    <!-- Keterangan judul opsional -->
    <div class="fg">
      <div class="fl">Judul Laporan <span class="flb">Opsional</span></div>
      <input type="text" class="fi" id="lapJudul" placeholder="Contoh: Laporan Kegiatan Semester 1"/>
    </div>

    <div id="lapStatus" style="font-size:.76rem;color:var(--gm);text-align:center;min-height:1.2em"></div>

    <div class="m-f">
      <button class="btn-cancel" onclick="closeLaporanModal()">Batal</button>
      <button class="btn-save" id="lapBtnCetak" onclick="jalankanCetak()">🖨️ Cetak</button>
    </div>
  </div>
</div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  lapScopeChange();
  _lapFmt = 'pdf';
}

let _lapFmt = 'pdf';

function closeLaporanModal() {
  const m = document.getElementById('laporanModal');
  if (m) m.remove();
}

function lapScopeChange() {
  const scope = document.querySelector('input[name="lapScope"]:checked')?.value || 'all';
  document.getElementById('lapSubAll').style.display    = scope==='all'    ? '' : 'none';
  document.getElementById('lapSubProker').style.display = scope==='proker' ? '' : 'none';
  document.getElementById('lapSubSesi').style.display   = scope==='sesi'   ? '' : 'none';
}

function lapSelectFmt(fmt) {
  _lapFmt = fmt;
  // ID tombol: lapBtnPDF, lapBtnExcel, lapBtnCSV (huruf besar semua untuk 3-huruf)
  const idMap = { pdf:'lapBtnPDF', excel:'lapBtnExcel', csv:'lapBtnCSV' };
  Object.entries(idMap).forEach(([f, id]) => {
    document.getElementById(id)?.classList.toggle('active', f===fmt);
  });
}

/* ════════════════════════════════════════════════════
   KUMPULKAN DATA SESI YANG DIPILIH
════════════════════════════════════════════════════ */
function _getSesiForLaporan() {
  const scope = document.querySelector('input[name="lapScope"]:checked')?.value || 'all';
  let list = (typeof S !== 'undefined' ? S.dok : []).filter(d=>!d._d);

  if (scope === 'proker') {
    const val = document.getElementById('lapProkerSel')?.value || '';
    const pid  = val.replace('pk:','');
    list = list.filter(d => d.proker_id === pid);
  } else if (scope === 'sesi') {
    const val = document.getElementById('lapSesiSel')?.value || '';
    const idx  = parseInt(val.replace('sesi:',''));
    list = list.filter(d => d._i === idx);
  }

  return list.sort((a,b) => a.tanggal_sesi > b.tanggal_sesi ? 1 : -1);
}

/* ════════════════════════════════════════════════════
   ENTRY POINT — DISPATCH FORMAT
════════════════════════════════════════════════════ */
async function jalankanCetak() {
  const btn = document.getElementById('lapBtnCetak');
  const st  = document.getElementById('lapStatus');
  const sesi = _getSesiForLaporan();
  if (!sesi.length) { st.textContent = '⚠️ Tidak ada sesi yang sesuai filter.'; return; }

  btn.disabled = true;
  st.textContent = 'Menyiapkan…';

  try {
    if (_lapFmt === 'pdf')         await cetakPDF(sesi);
    else if (_lapFmt === 'excel')  await cetakExcel(sesi);
    else if (_lapFmt === 'csv')    await cetakCSV(sesi);
    st.textContent = '✅ Selesai!';
    setTimeout(() => closeLaporanModal(), 1200);
  } catch(e) {
    st.textContent = '❌ Gagal: ' + e.message;
    console.error('[Laporan]', e);
  } finally {
    btn.disabled = false;
  }
}

/* ════════════════════════════════════════════════════
   LOGO HELPER — load logo sebagai dataURL
════════════════════════════════════════════════════ */
function _loadLogoDataURL() {
  return new Promise(res => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img,0,0);
        res(c.toDataURL('image/png'));
      } catch(_) { res(null); }
    };
    img.onerror = () => res(null);
    img.src = 'logo-jcosasi.png';
  });
}

function _loadImgDataURL(url) {
  return new Promise(res => {
    if (!url) { res(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        const MAX = 800;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        res({ data: c.toDataURL('image/jpeg', 0.82), w, h });
      } catch(_) { res(null); }
    };
    img.onerror = () => res(null);
    img.src = url;
  });
}

/* Konversi URL Google Drive ke thumbnail langsung */
function _gdriveThumb(url) {
  if (!url) return url;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? 'https://lh3.googleusercontent.com/d/' + m[1] : url;
}

/* ════════════════════════════════════════════════════
   PDF GENERATOR — HTML print approach (sesuai panduan rekap-script.js)
   Bangun string HTML lengkap → window.open → window.print()
   Tidak butuh library eksternal untuk PDF.
════════════════════════════════════════════════════ */
function cetakPDF(sesiList) {
  // ── Helper lokal ──
  function rupiah(v) {
    const n = parseFloat(String(v||'').replace(/[^\d.]/g,''))||0;
    return n > 0 ? 'Rp\u202f' + n.toLocaleString('id-ID') : '\u2014';
  }
  function tglPanjang(s) {
    if (!s) return '\u2014';
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  }
  function durasi(a, b) {
    if (!a || !b) return '';
    const [h1,m1]=a.split(':').map(Number), [h2,m2]=b.split(':').map(Number);
    const tot = (h2*60+m2)-(h1*60+m1);
    if (tot<=0) return '';
    return (tot>=60?Math.floor(tot/60)+' jam ':'')+((tot%60)?(tot%60)+' menit':'');
  }
  function gdrive(url) {
    if (!url) return '';
    const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m ? 'https://lh3.googleusercontent.com/d/'+m[1] : url;
  }
  function fotoLayout(urls) {
    if (!urls.length) return '';
    // Layout adaptif sesuai panduan
    const rows = [];
    if (urls.length === 1) {
      rows.push(`<div class="foto-row"><div class="foto-cell" style="--fh:180px"><img src="${urls[0]}" alt="Foto 1"/><div class="foto-cap">Foto 1</div></div></div>`);
    } else if (urls.length === 2) {
      rows.push(`<div class="foto-row">${urls.map((u,i)=>`<div class="foto-cell" style="--fh:150px"><img src="${u}" alt="Foto ${i+1}"/><div class="foto-cap">Foto ${i+1}</div></div>`).join('')}</div>`);
    } else if (urls.length === 3) {
      rows.push(`<div class="foto-row"><div class="foto-cell" style="--fh:155px"><img src="${urls[0]}" alt="Foto 1"/><div class="foto-cap">Foto 1</div></div></div>`);
      rows.push(`<div class="foto-row">${[1,2].map(i=>`<div class="foto-cell" style="--fh:120px"><img src="${urls[i]}" alt="Foto ${i+1}"/><div class="foto-cap">Foto ${i+1}</div></div>`).join('')}</div>`);
    } else if (urls.length === 4) {
      rows.push(`<div class="foto-row">${[0,1].map(i=>`<div class="foto-cell" style="--fh:130px"><img src="${urls[i]}" alt="Foto ${i+1}"/><div class="foto-cap">Foto ${i+1}</div></div>`).join('')}</div>`);
      rows.push(`<div class="foto-row">${[2,3].map(i=>`<div class="foto-cell" style="--fh:130px"><img src="${urls[i]}" alt="Foto ${i+1}"/><div class="foto-cap">Foto ${i+1}</div></div>`).join('')}</div>`);
    } else {
      // 5+
      rows.push(`<div class="foto-row"><div class="foto-cell" style="--fh:150px"><img src="${urls[0]}" alt="Foto 1"/><div class="foto-cap">Foto 1</div></div></div>`);
      for (let i = 1; i < urls.length; i += 2) {
        const pair = urls.slice(i, i+2).map((u,j)=>`<div class="foto-cell" style="--fh:115px"><img src="${u}" alt="Foto ${i+j+1}"/><div class="foto-cap">Foto ${i+j+1}</div></div>`).join('');
        rows.push(`<div class="foto-row">${pair}</div>`);
      }
    }
    return rows.join('');
  }
  function hadirTable(title, namaStr, kelasStr, peranColor) {
    const nms = lapSpl(namaStr), kls = lapSpl(kelasStr);
    if (!nms.length) return '';
    const rows = nms.map((n,i)=>`<tr>
      <td class="td-no">${i+1}</td>
      <td>${n}</td>
      <td>${kls[i]||'\u2014'}</td>
      <td><div class="ttd-line"></div></td>
    </tr>`).join('');
    return `
    <h3 class="sec-head" style="border-color:${peranColor}">
      <span style="background:${peranColor}">${title}</span>
      <span class="sec-count">${nms.length} orang</span>
    </h3>
    <table class="tbl-hadir">
      <thead><tr><th style="width:36px">No</th><th>Nama</th><th style="width:110px">Kelas</th><th style="width:130px">Tanda Tangan</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  const judul = document.getElementById('lapJudul')?.value.trim()
    || 'Laporan Dokumentasi Sesi';
  const now   = new Date();
  const tglCetak = now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const totalSesi    = sesiList.length;
  const totalPeserta = sesiList.reduce((a,s)=>a+lapSpl(s.hadir_peserta).length,0);
  const totalBiaya   = sesiList.reduce((a,s)=>{
    return a+(s.biaya_aktual||'').split(',').reduce((b,v)=>b+(parseFloat(v)||0),0);
  },0);

  // ── CSS seluruhnya inline ──
  const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:210mm;min-height:297mm;font-family:'Segoe UI',Arial,sans-serif;font-size:9.5pt;color:#1e1a2e;background:#fff}
body{padding:16mm 16mm 14mm}

/* KOP */
.kop{display:flex;align-items:center;gap:14px;padding-bottom:10px;border-bottom:2.5px solid #3D1A5E;margin-bottom:14px}
.kop-logo{width:52px;height:52px;object-fit:contain;flex-shrink:0}
.kop-logo-fallback{width:52px;height:52px;background:#3D1A5E;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20pt;color:#fff;flex-shrink:0}
.kop-text{flex:1}
.kop-org{font-size:13pt;font-weight:700;color:#3D1A5E;line-height:1.2}
.kop-sub{font-size:8.5pt;color:#5a4e7a;margin-top:1px}
.kop-tgl{font-size:7.5pt;color:#7a6e9a;text-align:right;white-space:nowrap;flex-shrink:0}

/* COVER */
.cover{text-align:center;padding:30mm 0 24mm;border-bottom:2px solid #d9c8f5;margin-bottom:20px;page-break-after:always}
.cover-badge{display:inline-block;background:#f0eafa;color:#3D1A5E;border:1px solid #d9c8f5;border-radius:99px;font-size:8pt;font-weight:600;padding:3px 14px;margin-bottom:12px;letter-spacing:.04em}
.cover-title{font-size:20pt;font-weight:800;color:#2c0a4a;line-height:1.2;margin-bottom:6px}
.cover-sub{font-size:10.5pt;color:#5a4e7a;margin-bottom:20px}
.cover-stats{display:flex;justify-content:center;gap:14px;margin:20px 0}
.cst{background:#f8f5ff;border:1.5px solid #d9c8f5;border-radius:10px;padding:12px 20px;text-align:center;min-width:70px}
.cst-n{font-size:15pt;font-weight:800;color:#3D1A5E}
.cst-l{font-size:7.5pt;color:#7a6e9a;margin-top:2px}
.cover-date{font-size:8pt;color:#9a8eba;margin-top:16px}

/* SECTION TITLE */
.sesi-block{page-break-inside:avoid;margin-bottom:28px}
.sesi-head{background:#3D1A5E;color:#fff;border-radius:7px 7px 0 0;padding:9px 14px;display:flex;justify-content:space-between;align-items:center}
.sesi-head-left{display:flex;flex-direction:column;gap:2px}
.sesi-num{font-size:7.5pt;color:rgba(255,255,255,.65);font-weight:600;letter-spacing:.06em}
.sesi-judul{font-size:12pt;font-weight:700}
.sesi-head-right{text-align:right}
.sesi-tgl{font-size:9pt;font-weight:600;color:rgba(255,255,255,.9)}
.sesi-waktu{font-size:7.5pt;color:rgba(255,255,255,.65);margin-top:1px}

/* INFO GRID */
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1.5px solid #d9c8f5;border-top:none;border-radius:0 0 7px 7px;overflow:hidden;margin-bottom:12px}
.info-cell{padding:7px 12px;background:#f8f5ff;border-right:1px solid #d9c8f5;border-bottom:1px solid #d9c8f5}
.info-cell:nth-child(even){border-right:none}
.info-cell:nth-last-child(-n+2){border-bottom:none}
.info-lbl{font-size:7pt;font-weight:700;color:#8070a8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
.info-val{font-size:9pt;color:#2c0a4a;font-weight:600}

/* TEXT BOX */
.text-box{border:1.5px solid #d9c8f5;border-radius:7px;padding:8px 12px;margin-bottom:10px;background:#f8f5ff}
.text-box.kendala{background:#fff5f5;border-color:#fecaca}
.text-box-label{font-size:7pt;font-weight:700;color:#8070a8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.text-box-val{font-size:9pt;color:#2c0a4a;line-height:1.55;white-space:pre-wrap}

/* SECTION HEADING */
.sec-head{display:flex;align-items:center;gap:10px;font-size:9.5pt;font-weight:700;color:#2c0a4a;margin:14px 0 6px;padding-left:4px;border-left:4px solid #3D1A5E}
.sec-head span:first-child{background:#3D1A5E;color:#fff;padding:2px 10px;border-radius:4px;font-size:8.5pt}
.sec-count{font-size:8pt;color:#8070a8;font-weight:400}

/* TABEL HADIR */
.tbl-hadir{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:8.5pt}
.tbl-hadir th{background:#3D1A5E;color:#fff;padding:6px 10px;text-align:left;font-size:8pt;font-weight:600;letter-spacing:.03em}
.tbl-hadir td{padding:6px 10px;border-bottom:1px solid #ece8f8;vertical-align:middle}
.tbl-hadir tr:nth-child(even) td{background:#f8f5ff}
.tbl-hadir tr:last-child td{border-bottom:none}
.td-no{color:#8070a8;text-align:center;font-size:8pt}
.ttd-line{border-bottom:1px solid #bba8d8;height:28px;margin:0 10px}

/* TABEL BIAYA */
.tbl-biaya{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:8.5pt}
.tbl-biaya th{background:#3D1A5E;color:#fff;padding:6px 10px;text-align:left;font-size:8pt;font-weight:600}
.tbl-biaya td{padding:6px 10px;border-bottom:1px solid #ece8f8}
.tbl-biaya tr:nth-child(even) td{background:#f8f5ff}
.tbl-biaya tr:last-child td{border-bottom:none}
.tbl-biaya tfoot td{background:#ede0f8;font-weight:700;color:#2c0a4a;border-top:2px solid #d9c8f5}
.td-rp{text-align:right;font-variant-numeric:tabular-nums}

/* FOTO */
.foto-section{margin-bottom:14px}
.foto-row{display:flex;gap:8px;margin-bottom:8px}
.foto-cell{flex:1;display:flex;flex-direction:column;gap:3px}
.foto-cell img{width:100%;height:var(--fh,150px);object-fit:contain;border:1px solid #d9c8f5;border-radius:5px;background:#f8f5ff}
.foto-cap{font-size:7pt;color:#8070a8;text-align:center}

/* TTD AREA */
.ttd-area{display:flex;gap:12px;margin-top:20px;padding-top:14px;border-top:1px solid #d9c8f5}
.ttd-col{flex:1;text-align:center}
.ttd-role{font-size:7.5pt;font-weight:700;color:#8070a8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.ttd-name-box{height:52px;border-bottom:1.5px solid #3D1A5E;margin:0 10px}
.ttd-label{font-size:8pt;color:#2c0a4a;margin-top:5px}

/* TOMBOL CETAK */
.print-btn{position:fixed;bottom:24px;right:24px;background:#3D1A5E;color:#fff;border:none;border-radius:99px;padding:11px 24px;font-size:10pt;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(61,26,94,.35);font-family:inherit;z-index:9999}
.print-btn:hover{background:#5a2e8a}

/* OVERLAY PANDUAN */
.save-guide-overlay{position:fixed;inset:0;background:rgba(30,10,60,.7);z-index:99999;display:flex;align-items:center;justify-content:center}
.save-guide-box{background:#fff;border-radius:14px;padding:28px 32px;max-width:380px;width:90%;box-shadow:0 12px 48px rgba(0,0,0,.3)}
.save-guide-title{font-size:13pt;font-weight:700;color:#2c0a4a;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.save-guide-step{display:flex;gap:10px;margin-bottom:10px;align-items:flex-start}
.save-guide-num{background:#3D1A5E;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8.5pt;font-weight:700;flex-shrink:0;margin-top:1px}
.save-guide-text{font-size:9pt;color:#3a3060;line-height:1.55}
.save-guide-text strong{color:#2c0a4a}
.save-guide-btn{display:block;width:100%;margin-top:18px;background:#3D1A5E;color:#fff;border:none;border-radius:8px;padding:10px 0;font-size:10pt;font-weight:700;cursor:pointer;font-family:inherit}
.save-guide-fname{background:#f0eafa;color:#3D1A5E;border-radius:5px;padding:2px 8px;font-size:8pt;font-weight:600;word-break:break-all;margin-top:6px;display:inline-block}

@media print{
  .print-btn,.save-guide-overlay{display:none!important}
  body{padding:12mm 14mm 10mm}
  .sesi-block{page-break-inside:avoid}
  .cover{page-break-after:always}
}`;

  // ── Body: cover ──
  const coverHtml = `
<div class="cover">
  <div class="cover-badge">JCOSASI — Dokumentasi Kegiatan</div>
  <div class="cover-title">${judul}</div>
  <div class="cover-sub">Tahun Kepengurusan 2026–2027</div>
  <div class="cover-stats">
    <div class="cst"><div class="cst-n">${totalSesi}</div><div class="cst-l">Total Sesi</div></div>
    <div class="cst"><div class="cst-n">${totalPeserta}</div><div class="cst-l">Total Peserta</div></div>
    <div class="cst"><div class="cst-n">Rp\u202f${totalBiaya.toLocaleString('id-ID')}</div><div class="cst-l">Total Biaya</div></div>
  </div>
  <div class="cover-date">Dicetak: ${tglCetak}</div>
</div>`;

  // ── Body: per sesi ──
  const sesiHtml = sesiList.map((s, si) => {
    const pkNm   = lapPkName(s.proker_id);
    const dur    = durasi(s.waktu_mulai, s.waktu_selesai);
    const fUrls  = lapSpl(s.foto_url).map(gdrive).filter(Boolean);
    const items  = lapSpl(s.item_biaya);
    const ests   = lapSpl(s.estimasi_biaya_item);
    const akts   = lapSpl(s.biaya_aktual);
    const totalA = akts.reduce((a,v)=>a+(parseFloat(v)||0),0);

    // Info grid
    const infoGrid = `
<div class="info-grid">
  <div class="info-cell"><div class="info-lbl">Program Kerja</div><div class="info-val">${pkNm}</div></div>
  <div class="info-cell"><div class="info-lbl">No. Proker</div><div class="info-val">#${s.proker_id}</div></div>
  <div class="info-cell"><div class="info-lbl">Tanggal</div><div class="info-val">${tglPanjang(s.tanggal_sesi)}</div></div>
  <div class="info-cell"><div class="info-lbl">Waktu</div><div class="info-val">${s.waktu_mulai||'—'}${s.waktu_selesai?'&nbsp;–&nbsp;'+s.waktu_selesai:''}${dur?' ('+dur+')':''}</div></div>
  <div class="info-cell"><div class="info-lbl">Total Hadir</div><div class="info-val">${lapSpl(s.hadir_peserta).length} peserta, ${lapSpl(s.hadir_panitia).length} panitia</div></div>
  <div class="info-cell"><div class="info-lbl">Total Biaya Aktual</div><div class="info-val">${totalA>0?'Rp\u202f'+totalA.toLocaleString('id-ID'):'—'}</div></div>
</div>`;

    // Text boxes
    const ketBox   = s.keterangan ? `<div class="text-box"><div class="text-box-label">📋 Keterangan Kegiatan</div><div class="text-box-val">${s.keterangan}</div></div>` : '';
    const matBox   = s.materi     ? `<div class="text-box"><div class="text-box-label">📖 Materi &amp; Progress</div><div class="text-box-val">${s.materi}</div></div>` : '';
    const kendBox  = s.kendala    ? `<div class="text-box kendala"><div class="text-box-label">⚠️ Kendala &amp; Evaluasi</div><div class="text-box-val">${s.kendala}</div></div>` : '';

    // Tabel hadir — Nama dan Kelas kolom terpisah
    const hadirSec = `
<h3 class="sec-head"><span>✅ Daftar Hadir</span></h3>
${hadirTable('Peserta',    s.hadir_peserta,    s.kelas_peserta,    '#1D4ED8')}
${hadirTable('Panitia',    s.hadir_panitia,    s.kelas_panitia,    '#065F46')}
${hadirTable('Narasumber', s.hadir_narasumber, s.kelas_narasumber, '#92400E')}`;

    // Tabel biaya
    let biayaSec = '';
    if (items.length) {
      const biayaRows = items.map((item,i)=>`<tr>
        <td>${item||'—'}</td>
        <td class="td-rp">${ests[i]?rupiah(ests[i]):'—'}</td>
        <td class="td-rp">${akts[i]?rupiah(akts[i]):'—'}</td>
      </tr>`).join('');
      biayaSec = `
<h3 class="sec-head"><span>💰 Rincian Biaya</span></h3>
<table class="tbl-biaya">
  <thead><tr><th>Item</th><th style="width:110px;text-align:right">Estimasi</th><th style="width:110px;text-align:right">Aktual</th></tr></thead>
  <tbody>${biayaRows}</tbody>
  <tfoot><tr><td><strong>TOTAL</strong></td><td class="td-rp">${rupiah(ests.reduce((a,v)=>a+(parseFloat(v)||0),0))}</td><td class="td-rp"><strong>${rupiah(totalA)}</strong></td></tr></tfoot>
</table>`;
    }

    // Foto
    let fotoSec = '';
    if (fUrls.length) {
      fotoSec = `<h3 class="sec-head"><span>📷 Foto Kegiatan</span><span class="sec-count">${fUrls.length} foto</span></h3>
<div class="foto-section">${fotoLayout(fUrls)}</div>`;
    }

    // Tanda tangan
    const ttdSec = `
<div class="ttd-area">
  <div class="ttd-col"><div class="ttd-role">Ketua Pelaksana</div><div class="ttd-name-box"></div><div class="ttd-label">( .......................... )</div></div>
  <div class="ttd-col"><div class="ttd-role">Sekretaris</div><div class="ttd-name-box"></div><div class="ttd-label">( .......................... )</div></div>
  <div class="ttd-col"><div class="ttd-role">Mengetahui / Pembina</div><div class="ttd-name-box"></div><div class="ttd-label">( .......................... )</div></div>
</div>`;

    return `
<div class="sesi-block">
  <div class="sesi-head">
    <div class="sesi-head-left">
      <div class="sesi-num">SESI ${si+1} / ${sesiList.length} &nbsp;·&nbsp; ${pkNm}</div>
      <div class="sesi-judul">${s.keterangan || pkNm}</div>
    </div>
    <div class="sesi-head-right">
      <div class="sesi-tgl">${tglPanjang(s.tanggal_sesi)}</div>
      <div class="sesi-waktu">${s.waktu_mulai||''}${s.waktu_selesai?' – '+s.waktu_selesai:''}${dur?' ('+dur+')':''}</div>
    </div>
  </div>
  ${infoGrid}
  ${ketBox}${matBox}${kendBox}
  ${hadirSec}
  ${biayaSec}
  ${fotoSec}
  ${ttdSec}
</div>`;
  }).join('<hr style="border:none;border-top:2px dashed #d9c8f5;margin:20px 0"/>');

  // KOP
  const kopHtml = `
<div class="kop">
  <img class="kop-logo" src="logo-jcosasi.png" alt="Logo JCOSASI" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
  <div class="kop-logo-fallback" style="display:none">🎌</div>
  <div class="kop-text">
    <div class="kop-org">JCOSASI — Japanese Club SMA Negeri</div>
    <div class="kop-sub">Dokumen Laporan Kegiatan &nbsp;·&nbsp; Tahun Kepengurusan 2026–2027</div>
  </div>
  <div class="kop-tgl">Dicetak:<br/>${tglCetak}</div>
</div>`;

  const fileName = 'Laporan_JCOSASI_' + new Date().toISOString().slice(0,10) + '.pdf';

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<title>${judul}</title>
<style>${css}</style>
</head>
<body>
${kopHtml}
${coverHtml}
${sesiHtml}

<button class="print-btn" onclick="showPrintGuide('${fileName}')">🖨️ Cetak / Simpan PDF</button>

<script>
function showPrintGuide(fn) {
  var old = document.getElementById('saveGuideOverlay');
  if (old) old.remove();
  var el = document.createElement('div');
  el.id = 'saveGuideOverlay';
  el.className = 'save-guide-overlay';
  el.innerHTML = '<div class="save-guide-box">'
    + '<div class="save-guide-title">🖨️ Cara Simpan sebagai PDF</div>'
    + '<div class="save-guide-step"><div class="save-guide-num">1</div><div class="save-guide-text">Klik tombol <strong>Cetak Sekarang</strong> di bawah.</div></div>'
    + '<div class="save-guide-step"><div class="save-guide-num">2</div><div class="save-guide-text">Di jendela cetak, ubah <strong>Printer/Destination</strong> menjadi <strong>"Save as PDF"</strong>.</div></div>'
    + '<div class="save-guide-step"><div class="save-guide-num">3</div><div class="save-guide-text">Klik <strong>Save</strong> dan simpan dengan nama:<br/><span class="save-guide-fname">'+fn+'</span></div></div>'
    + '<button class="save-guide-btn" onclick="doActualPrint()">🖨️ Cetak Sekarang</button>'
    + '</div>';
  document.body.appendChild(el);
}
function doActualPrint() {
  var el = document.getElementById('saveGuideOverlay');
  if (el) el.remove();
  setTimeout(function(){ window.print(); }, 150);
}
</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Pop-up diblokir browser. Izinkan pop-up untuk halaman ini lalu coba lagi.');
    return;
  }
  win.document.write(html);
  win.document.close();
}


/* ════════════════════════════════════════════════════
   EXCEL GENERATOR
════════════════════════════════════════════════════ */
async function cetakExcel(sesiList) {
  const st = document.getElementById('lapStatus');
  st.textContent = 'Memuat library Excel…';
  await _loadXLSX();
  const XLSX = window.XLSX;

  st.textContent = 'Menyusun data Excel…';

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Ringkasan ──
  const ringkasanData = [
    ['LAPORAN DOKUMENTASI SESI — JCOSASI'],
    [document.getElementById('lapJudul')?.value.trim() || ''],
    ['Dicetak:', new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})],
    [],
    ['No','Program Kerja','Tanggal','Waktu Mulai','Waktu Selesai','Keterangan',
     'Jml Peserta','Jml Panitia','Jml Narasumber','Total Biaya (Rp)',
     'Peserta','Kelas Peserta','Panitia','Kelas Panitia','Narasumber','Kelas Narasumber',
     'Materi','Kendala','Item Biaya','Estimasi Biaya','Biaya Aktual','URL Foto'],
  ];

  sesiList.forEach((s, i) => {
    const totalAkt = (s.biaya_aktual||'').split(',').reduce((a,v)=>a+(parseFloat(v)||0),0);
    ringkasanData.push([
      i+1,
      lapPkName(s.proker_id),
      s.tanggal_sesi || '',
      s.waktu_mulai  || '',
      s.waktu_selesai|| '',
      s.keterangan   || '',
      lapSpl(s.hadir_peserta).length,
      lapSpl(s.hadir_panitia).length,
      lapSpl(s.hadir_narasumber).length,
      totalAkt || '',
      s.hadir_peserta   || '',
      s.kelas_peserta   || '',
      s.hadir_panitia   || '',
      s.kelas_panitia   || '',
      s.hadir_narasumber|| '',
      s.kelas_narasumber|| '',
      s.materi   || '',
      s.kendala  || '',
      s.item_biaya           || '',
      s.estimasi_biaya_item  || '',
      s.biaya_aktual         || '',
      s.foto_url || '',
    ]);
  });

  const ws1 = XLSX.utils.aoa_to_sheet(ringkasanData);
  // Lebar kolom
  ws1['!cols'] = [
    {wch:4},{wch:28},{wch:14},{wch:10},{wch:12},{wch:30},
    {wch:10},{wch:10},{wch:14},{wch:16},
    {wch:30},{wch:20},{wch:30},{wch:20},{wch:30},{wch:20},
    {wch:40},{wch:30},{wch:25},{wch:20},{wch:18},{wch:40},
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Semua Sesi');

  // ── Sheet 2: Per-Sesi (detail hadir baris per orang) ──
  const detailData = [
    ['No Sesi','Program Kerja','Tanggal','Keterangan','Peran','Nama','Kelas']
  ];
  sesiList.forEach((s, si) => {
    const prokerNm = lapPkName(s.proker_id);
    const addRows = (peran, namaStr, kelasStr) => {
      const nms = lapSpl(namaStr), kls = lapSpl(kelasStr);
      nms.forEach((n,i) => detailData.push([
        si+1, prokerNm, s.tanggal_sesi||'', s.keterangan||'',
        peran, n, kls[i]||''
      ]));
    };
    addRows('Peserta',    s.hadir_peserta,    s.kelas_peserta);
    addRows('Panitia',    s.hadir_panitia,    s.kelas_panitia);
    addRows('Narasumber', s.hadir_narasumber, s.kelas_narasumber);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(detailData);
  ws2['!cols'] = [{wch:8},{wch:28},{wch:14},{wch:30},{wch:12},{wch:28},{wch:16}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Detail Hadir');

  // ── Sheet 3: Biaya ──
  const biayaData = [
    ['No Sesi','Program Kerja','Tanggal','Keterangan','Item Biaya','Estimasi (Rp)','Aktual (Rp)']
  ];
  sesiList.forEach((s, si) => {
    const items = lapSpl(s.item_biaya);
    const ests  = lapSpl(s.estimasi_biaya_item);
    const akts  = lapSpl(s.biaya_aktual);
    if (!items.length) {
      biayaData.push([si+1, lapPkName(s.proker_id), s.tanggal_sesi||'', s.keterangan||'','—','—','—']);
    } else {
      items.forEach((item,i) => biayaData.push([
        si+1, lapPkName(s.proker_id), s.tanggal_sesi||'', s.keterangan||'',
        item,
        parseFloat(ests[i])||'',
        parseFloat(akts[i])||'',
      ]));
    }
  });
  const ws3 = XLSX.utils.aoa_to_sheet(biayaData);
  ws3['!cols'] = [{wch:8},{wch:28},{wch:14},{wch:30},{wch:28},{wch:16},{wch:16}];
  XLSX.utils.book_append_sheet(wb, ws3, 'Biaya');

  const filename = 'Laporan_JCOSASI_' + new Date().toISOString().slice(0,10) + '.xlsx';
  XLSX.writeFile(wb, filename);
}

/* ════════════════════════════════════════════════════
   CSV GENERATOR
════════════════════════════════════════════════════ */
async function cetakCSV(sesiList) {
  function esc(v) {
    const s = String(v==null?'':v).replace(/"/g,'""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? '"'+s+'"' : s;
  }
  const headers = ['No','Program Kerja','Tanggal','Waktu Mulai','Waktu Selesai',
    'Keterangan','Peserta','Kelas Peserta','Panitia','Kelas Panitia',
    'Narasumber','Kelas Narasumber','Materi','Kendala',
    'Item Biaya','Estimasi Biaya','Biaya Aktual','URL Foto'];
  const rows = [headers.map(esc).join(',')];
  sesiList.forEach((s,i) => {
    rows.push([
      i+1, lapPkName(s.proker_id), s.tanggal_sesi||'', s.waktu_mulai||'',
      s.waktu_selesai||'', s.keterangan||'',
      s.hadir_peserta||'', s.kelas_peserta||'',
      s.hadir_panitia||'', s.kelas_panitia||'',
      s.hadir_narasumber||'', s.kelas_narasumber||'',
      s.materi||'', s.kendala||'',
      s.item_biaya||'', s.estimasi_biaya_item||'', s.biaya_aktual||'',
      s.foto_url||'',
    ].map(esc).join(','));
  });
  const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type:'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Laporan_JCOSASI_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
