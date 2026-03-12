// ============================================================
//  JCOSASI — Google Apps Script (Final)
//  Mendukung semua sheet: pengurus, proker_detail,
//  proker_notif, proker_activity, proker_dokumentasi
//
//  CARA DEPLOY:
//  1. Paste kode ini ke Apps Script
//  2. Save → Deploy → New deployment (atau edit & New version)
//  3. Execute as: Me | Who has access: Anyone
// ============================================================

function doGet(e) {
  const sheetName = e.parameter.sheet    || 'pengurus';
  const callback  = e.parameter.callback || '';
  const filterId  = e.parameter.id       || '';  // untuk filter proker_id

  try {
    let data = getSheetData(sheetName);

    // Filter berdasarkan proker_id jika ada
    if (filterId && data.length > 0 && data[0].hasOwnProperty('proker_id')) {
      data = data.filter(row => row.proker_id === filterId);
    }

    return respond({ status: 'ok', data: data }, callback);
  } catch (err) {
    return respond({ status: 'error', message: err.message }, callback);
  }
}

function getSheetData(sheetName) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) throw new Error('Sheet "' + sheetName + '" tidak ditemukan');

  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.toString().trim());
  const result  = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every(cell => cell === '' || cell === null)) continue;
    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = row[j] !== undefined ? row[j].toString().trim() : '';
    });
    result.push(obj);
  }
  return result;
}

// Response JSON + JSONP
function respond(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
