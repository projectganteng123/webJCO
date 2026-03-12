// ============================================================
//  JCOSASI — Google Apps Script (v7)
//  Semua operasi (read & write) via doGet + JSONP
//  BARU di v7: action=replaceAll — ganti seluruh isi sheet
//              sekaligus (1 request, cepat, atomik)
//
//  Deploy: Manage deployments → ✏️ → New version → Deploy
//  Izin : Anyone
//
//  ⚠️  JANGAN ubah action lama (read/upsert/insert/delete/replace)
//       karena dipakai oleh web lain!
// ============================================================

var DATE_COLUMNS = ['estimasi_tanggal','tanggal','tanggal_sesi','tanggal_target','tanggal_mulai','tanggal_selesai'];
var TIME_COLUMNS = ['waktu_mulai','waktu_selesai','jam'];

var SHEET_HEADERS = {
  pengurus:           ['jabatan_level','jabatan','nama','kelas','foto_url','bidang_nama'],
  proker_detail:      ['proker_id','tujuan','waktu_teks','estimasi_tanggal','lokasi','sasaran','pemateri','panitia','rab'],
  proker_jadwal:      ['proker_id','tanggal','jam'],
  proker_activity:    ['proker_id','tanggal','status'],
  proker_notif:       ['proker_id','tipe','judul','isi','tanggal'],
  proker_notif_config:['proker_id','countdown_aktif','ajakan','ajakan_teks','ajakan_sub','wajib_hadir','wajib_hadir_teks','wajib_hadir_sanksi'],
  proker_dokumentasi: ['proker_id','tanggal_sesi','foto_url','keterangan','hadir_peserta','hadir_panitia','hadir_narasumber','materi','waktu_mulai','waktu_selesai','item_biaya','estimasi_biaya_item','biaya_aktual','kendala'],
  anggota:            ['nama','kelas','angkatan','status','no_hp','catatan'],
};

// ── doGet: semua operasi via GET + JSONP ──────────────────────
function doGet(e) {
  var cb     = e.parameter.callback || '';
  var sheet  = e.parameter.sheet   || 'pengurus';
  var action = e.parameter.action  || 'read';

  try {
    var result;

    if (action === 'read') {
      result = { status: 'ok', data: getSheetData(sheet) };

    } else if (action === 'replaceAll') {
      // ── BARU: ganti seluruh isi sheet sekaligus ──
      // payload = { headers: [...kolom...], rows: [[...],[...], ...] }
      var payload = JSON.parse(decodeURIComponent(e.parameter.payload || '{}'));
      result = { status: 'ok', replaced: replaceAllRows(sheet, payload.headers, payload.rows || []) };

    } else {
      // ── Operasi lama — tidak diubah ──────────────
      var payload2 = {};
      if (e.parameter.payload) payload2 = JSON.parse(decodeURIComponent(e.parameter.payload));

      var ss  = SpreadsheetApp.getActiveSpreadsheet();
      var sh  = ss.getSheetByName(sheet);
      if (!sh) throw new Error('Sheet "' + sheet + '" tidak ditemukan');
      var headers = getOrCreateHeaders(sh, sheet);

      if (action === 'upsert') {
        var keyCol = payload2.key || headers[0];
        var keyIdx = headers.indexOf(keyCol);
        if (keyIdx < 0) throw new Error('Kolom "' + keyCol + '" tidak ditemukan');
        var all = sh.getDataRange().getValues();
        var found = false;
        for (var i = 1; i < all.length; i++) {
          if (String(all[i][keyIdx]).trim() === String(payload2.keyValue).trim()) {
            sh.getRange(i+1, 1, 1, headers.length).setValues([buildRow(headers, payload2.row)]);
            found = true; break;
          }
        }
        if (!found) sh.appendRow(buildRow(headers, payload2.row));
        result = { status: 'ok', action: found ? 'updated' : 'inserted' };

      } else if (action === 'insert') {
        var rows = payload2.rows || [payload2.row];
        rows.forEach(function(r) { sh.appendRow(buildRow(headers, r)); });
        result = { status: 'ok', inserted: rows.length };

      } else if (action === 'delete') {
        var kIdx = headers.indexOf(payload2.key || headers[0]);
        result = { status: 'ok', deleted: deleteByKey(sh, kIdx, payload2.keyValue) };

      } else if (action === 'replace') {
        var kIdx2 = headers.indexOf(payload2.key || 'proker_id');
        if (kIdx2 >= 0 && payload2.keyValue !== undefined) deleteByKey(sh, kIdx2, payload2.keyValue);
        (payload2.rows || []).forEach(function(r) { sh.appendRow(buildRow(headers, r)); });
        result = { status: 'ok', replaced: (payload2.rows || []).length };

      } else {
        throw new Error('Action tidak dikenal: ' + action);
      }
    }

    var out = JSON.stringify(result);
    if (cb) return ContentService.createTextOutput(cb + '(' + out + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var errOut = JSON.stringify({ status: 'error', message: err.message });
    if (cb) return ContentService.createTextOutput(cb + '(' + errOut + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(errOut).setMimeType(ContentService.MimeType.JSON);
  }
}

// ── replaceAllRows ─────────────────────────────────────────────
// Hapus semua data baris (baris 2 ke bawah), tulis header baru
// (jika berbeda), lalu batch-insert semua rows sekaligus.
// Ini jauh lebih cepat dari N × upsert/replace per proker_id.
function replaceAllRows(sheetName, headers, rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('Sheet "' + sheetName + '" tidak ditemukan');

  // Tulis header di baris pertama
  if (headers && headers.length > 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  // Hapus semua baris data (baris 2 ke bawah) jika ada
  var lastRow = sh.getLastRow();
  if (lastRow > 1) {
    sh.deleteRows(2, lastRow - 1);
  }

  // Batch insert semua rows sekaligus (1 setValues call = sangat cepat)
  if (rows && rows.length > 0) {
    var numCols = headers ? headers.length : rows[0].length;
    // Pastikan semua rows punya panjang yang sama
    var normalized = rows.map(function(row) {
      var r = [];
      for (var c = 0; c < numCols; c++) {
        r.push(row[c] !== undefined && row[c] !== null ? String(row[c]) : '');
      }
      return r;
    });
    sh.getRange(2, 1, normalized.length, numCols).setValues(normalized);
  }

  return rows ? rows.length : 0;
}

// ── Helpers ──────────────────────────────────────────────────
function getOrCreateHeaders(sheet, shName) {
  var vals = sheet.getDataRange().getValues();
  if (vals.length > 0 && vals[0].some(function(c) { return c !== ''; }))
    return vals[0].map(function(h) { return h.toString().trim(); });
  var def = SHEET_HEADERS[shName];
  if (!def) throw new Error('Tidak ada definisi header untuk ' + shName);
  sheet.getRange(1, 1, 1, def.length).setValues([def]);
  return def;
}
function buildRow(headers, obj) {
  return headers.map(function(h) { var v = obj[h]; return (v === undefined || v === null) ? '' : v.toString(); });
}
function deleteByKey(sheet, kIdx, keyVal) {
  var all = sheet.getDataRange().getValues(); var del = 0;
  for (var i = all.length - 1; i >= 1; i--) {
    if (String(all[i][kIdx]).trim() === String(keyVal).trim()) { sheet.deleteRow(i + 1); del++; }
  }
  return del;
}

// ── getSheetData ──────────────────────────────────────────────
function getSheetData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet "' + sheetName + '" tidak ditemukan');
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  var headers = rows[0].map(function(h) { return h.toString().trim(); });
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i]; var isEmpty = true;
    for (var k = 0; k < row.length; k++) { if (row[k] !== '' && row[k] !== null) { isEmpty = false; break; } }
    if (isEmpty) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var cv = normalizeValue(headers[j], row[j]);
      if (headers[j] === 'proker_id') cv = normalizeId(cv);
      obj[headers[j]] = cv;
    }
    result.push(obj);
  }
  return result;
}

function normalizeId(val) {
  if (val === '' || val === null || val === undefined) return '';
  var n = parseInt(val.toString().trim(), 10);
  if (isNaN(n)) return val.toString().trim();
  return n < 10 ? '0' + n : '' + n;
}
function normalizeValue(header, val) {
  if (val === '' || val === null || val === undefined) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    if (TIME_COLUMNS.indexOf(header) !== -1) return toHHMM(val);
    if (DATE_COLUMNS.indexOf(header) !== -1) return toYMD(val);
    return val.toString();
  }
  var str = val.toString().trim();
  if (TIME_COLUMNS.indexOf(header) !== -1 && str !== '') { var pt = tryParseDate(str); if (pt) return toHHMM(pt); }
  if (DATE_COLUMNS.indexOf(header) !== -1 && str !== '') { var pd = tryParseDate(str); if (pd) return toYMD(pd); }
  return str;
}
function toHHMM(d) { var h=String(d.getHours()),m=String(d.getMinutes()); return (h.length<2?'0'+h:h)+':'+(m.length<2?'0'+m:m); }
function toYMD(d) { var y=String(d.getFullYear()),m=String(d.getMonth()+1),dd=String(d.getDate()); return y+'-'+(m.length<2?'0'+m:m)+'-'+(dd.length<2?'0'+dd:dd); }
function tryParseDate(str) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) { var p=str.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }
  if (/^\d{1,2}:\d{2}$/.test(str)) { var tp=str.split(':'),d=new Date(1899,11,30); d.setHours(+tp[0],+tp[1],0,0); return d; }
  var dmy=str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(dmy) return new Date(+dmy[3],+dmy[2]-1,+dmy[1]);
  var a=new Date(str); return isNaN(a.getTime())?null:a;
}
