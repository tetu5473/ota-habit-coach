const SHEET_NAME = "habit_coach_db";
const CHUNK_SIZE = 45000;

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (body.app !== "ota-habit-coach") {
      return jsonResponse({ ok: false, reason: "invalid_app" }, 400);
    }

    if (body.action === "save") {
      return saveDatabase(body);
    }

    if (body.action === "load") {
      return loadDatabase();
    }

    return jsonResponse({ ok: false, reason: "unknown_action" }, 400);
  } catch (error) {
    return jsonResponse({ ok: false, reason: "internal_error", message: error.message }, 500);
  }
}

function saveDatabase(body) {
  if (!body.db) {
    return jsonResponse({ ok: false, reason: "missing_db" }, 400);
  }

  const sheet = getDatabaseSheet();
  const updatedAt = body.updatedAt || new Date().toISOString();
  const json = JSON.stringify(body.db);
  const chunks = [];
  for (let index = 0; index < json.length; index += CHUNK_SIZE) {
    chunks.push(json.slice(index, index + CHUNK_SIZE));
  }

  sheet.clear();
  sheet.getRange(1, 1, 1, 3).setValues([["updatedAt", "chunkIndex", "chunk"]]);
  if (chunks.length) {
    sheet.getRange(2, 1, chunks.length, 3).setValues(
      chunks.map((chunk, index) => [updatedAt, index, chunk]),
    );
  }

  PropertiesService.getScriptProperties().setProperty("UPDATED_AT", updatedAt);
  return jsonResponse({
    ok: true,
    updatedAt,
    chunkCount: chunks.length,
    recordCount: Array.isArray(body.db.dailyRecords) ? body.db.dailyRecords.length : 0,
  });
}

function loadDatabase() {
  const sheet = getDatabaseSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse({ ok: true, db: null, reason: "empty_store" });
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  const chunks = values
    .filter((row) => row[2] !== "")
    .sort((left, right) => Number(left[1]) - Number(right[1]));
  const json = chunks.map((row) => row[2]).join("");
  if (!json) {
    return jsonResponse({ ok: true, db: null, reason: "empty_store" });
  }

  const db = JSON.parse(json);
  return jsonResponse({
    ok: true,
    db,
    updatedAt: chunks[0] ? String(chunks[0][0]) : PropertiesService.getScriptProperties().getProperty("UPDATED_AT"),
    chunkCount: chunks.length,
    recordCount: Array.isArray(db.dailyRecords) ? db.dailyRecords.length : 0,
  });
}

function getDatabaseSheet() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = properties.getProperty("SPREADSHEET_ID");
  let spreadsheet;

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create("太田の習慣コーチ 保存データ");
    properties.setProperty("SPREADSHEET_ID", spreadsheet.getId());
  }

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  return sheet;
}

function jsonResponse(body, statusCode) {
  const output = ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
  if (statusCode && output.setResponseCode) {
    output.setResponseCode(statusCode);
  }
  return output;
}
