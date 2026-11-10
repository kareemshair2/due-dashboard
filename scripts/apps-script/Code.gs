/**
 * DUE Operations Dashboard — Google Sheets read-only proxy.
 *
 * This Web App reads the Orders, BRANCHES&AGENTS, and Cars tabs and returns
 * the same tab/header/row shape that the dashboard's gviz provider produces.
 *
 * Security model:
 * - Read-only. This file contains no write calls and no credentials.
 * - The spreadsheet ID has a built-in fallback (DEFAULT_SPREADSHEET_ID) and can
 *   be overridden safely with the SPREADSHEET_ID Script Property — useful to
 *   point the same deployment at another spreadsheet without editing code.
 * - The deployment URL is a bearer URL. Anyone who has it can read the sheets
 *   allowed by the deployment, so keep it private and rotate the deployment
 *   if it leaks.
 * - Required OAuth scope: https://www.googleapis.com/auth/spreadsheets.readonly
 */

var DEFAULTS = {
  SHEET_ORDERS: "Orders",
  SHEET_BRANCHES: "BRANCHES&AGENTS",
  SHEET_CARS: "Cars",
  CACHE_SECONDS: "300",
  MAX_ROWS: "5000",
};

// Fallback used when Script Properties are not set.
// Script Properties (SPREADSHEET_ID) override this value, so you can point the
// same deployment at a different spreadsheet without editing the code.
var DEFAULT_SPREADSHEET_ID = "15V6Lvg9cqBb7xsT6Z4vS7nn6RRRm_JVd5eytqKaLvt8";

var TAB_LABELS = {
  orders: "Orders",
  branches: "BRANCHES & AGENTS",
  cars: "Cars",
};

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var cacheSeconds = Number(props.getProperty("CACHE_SECONDS") || DEFAULTS.CACHE_SECONDS);
  var maxRows = Number(props.getProperty("MAX_ROWS") || DEFAULTS.MAX_ROWS);
  var spreadsheetId = (props.getProperty("SPREADSHEET_ID") || DEFAULT_SPREADSHEET_ID).trim();
  return {
    spreadsheetId: spreadsheetId,
    sheetNames: {
      orders: (props.getProperty("SHEET_ORDERS") || DEFAULTS.SHEET_ORDERS).trim(),
      branches: (props.getProperty("SHEET_BRANCHES") || DEFAULTS.SHEET_BRANCHES).trim(),
      cars: (props.getProperty("SHEET_CARS") || DEFAULTS.SHEET_CARS).trim(),
    },
    cacheSeconds: Number.isFinite(cacheSeconds) ? Math.max(0, Math.min(cacheSeconds, 21600)) : 300,
    maxRows: Number.isFinite(maxRows) ? Math.max(1, Math.min(maxRows, 50000)) : 5000,
  };
}

function hashKey_(value) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
  return digest
    .map(function (byte) {
      var normalized = (byte & 0xff) + 0x100;
      return normalized.toString(16).slice(1);
    })
    .join("")
    .slice(0, 40);
}

function cacheKey_(config) {
  var raw = [
    config.spreadsheetId,
    config.sheetNames.orders,
    config.sheetNames.branches,
    config.sheetNames.cars,
    config.maxRows,
  ].join("|");
  return "due:v1:" + hashKey_(raw);
}

function serializeCell_(value, timeZone) {
  if (value === null || value === undefined || value === "") return null;
  if (Object.prototype.toString.call(value) === "[object Date]") {
    if (isNaN(value.getTime())) return null;
    return Utilities.formatDate(value, timeZone, "yyyy-MM-dd");
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value;
  var text = String(value).trim();
  return text === "" ? null : text;
}

function isBlankRow_(row) {
  for (var i = 0; i < row.length; i += 1) {
    var value = row[i];
    if (value !== null && value !== undefined && String(value).trim() !== "") return false;
  }
  return true;
}

function readTab_(spreadsheet, tabKey, sheetName, maxRows, timeZone) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('التاب "' + sheetName + '" غير موجود في الشيت.');
  }

  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var fetchedAt = new Date().toISOString();

  if (lastRow === 0 || lastColumn === 0) {
    return {
      key: tabKey,
      name: sheetName,
      label: TAB_LABELS[tabKey] || sheetName,
      headers: [],
      rows: [],
      totalRows: 0,
      truncated: false,
      fetchedAt: fetchedAt,
    };
  }

  var readRows = Math.min(lastRow, maxRows);
  var values = sheet.getRange(1, 1, readRows, lastColumn).getValues();
  var headers = values[0].map(function (header) {
    return header === null || header === undefined ? "" : String(header).trim();
  });

  var rows = [];
  for (var index = 1; index < values.length; index += 1) {
    var row = values[index].map(function (cell) {
      return serializeCell_(cell, timeZone);
    });
    rows.push(row);
  }

  while (rows.length && isBlankRow_(rows[rows.length - 1])) {
    rows.pop();
  }

  return {
    key: tabKey,
    name: sheetName,
    label: TAB_LABELS[tabKey] || sheetName,
    headers: headers,
    rows: rows,
    totalRows: Math.max(0, lastRow - 1),
    truncated: lastRow > maxRows,
    fetchedAt: fetchedAt,
  };
}

function buildPayload_(skipCache) {
  var config = getConfig_();
  if (!config.spreadsheetId) {
    throw new Error("SPREADSHEET_ID غير مضبوط في Script Properties.");
  }

  var cache = CacheService.getScriptCache();
  var key = cacheKey_(config);

  if (!skipCache) {
    var cached = cache.get(key);
    if (cached) {
      try {
        var cachedPayload = JSON.parse(cached);
        cachedPayload.meta.cacheHit = true;
        return cachedPayload;
      } catch (error) {
        // Ignore a malformed cache entry and read the spreadsheet instead.
      }
    }
  }

  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  var timeZone = spreadsheet.getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  var tabs = {};
  var errors = [];
  var keys = ["orders", "branches", "cars"];

  for (var i = 0; i < keys.length; i += 1) {
    var tabKey = keys[i];
    try {
      tabs[tabKey] = readTab_(
        spreadsheet,
        tabKey,
        config.sheetNames[tabKey],
        config.maxRows,
        timeZone,
      );
    } catch (error) {
      errors.push({
        tab: tabKey,
        message: error && error.message ? error.message : String(error),
      });
    }
  }

  var payload = {
    ok: true,
    provider: "apps-script",
    spreadsheetId: config.spreadsheetId,
    fetchedAt: new Date().toISOString(),
    tabs: tabs,
    errors: errors,
    meta: {
      title: spreadsheet.getName(),
      timeZone: timeZone,
      source: "Apps Script Proxy",
      cacheHit: false,
      cacheSeconds: config.cacheSeconds,
      maxRows: config.maxRows,
    },
  };

  if (config.cacheSeconds > 0 && errors.length === 0) {
    try {
      cache.put(key, JSON.stringify(payload), config.cacheSeconds);
    } catch (error) {
      // CacheService has a per-entry size limit. A cache miss is not fatal.
    }
  }

  return payload;
}

function isValidCallback_(callback) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(callback);
}

function respond_(payload, callback) {
  var json = JSON.stringify(payload);
  if (callback && isValidCallback_(callback)) {
    return ContentService.createTextOutput(callback + "(" + json + ");").setMimeType(
      ContentService.MimeType.JAVASCRIPT,
    );
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doGet(event) {
  var params = event && event.parameter ? event.parameter : {};
  var callback = params.callback || "";
  var skipCache = params.nocache === "1";

  try {
    var payload = buildPayload_(skipCache);
    return respond_(payload, callback);
  } catch (error) {
    return respond_(
      {
        ok: false,
        provider: "apps-script",
        error: error && error.message ? error.message : String(error),
        fetchedAt: new Date().toISOString(),
      },
      callback,
    );
  }
}

/**
 * Run this manually in the Apps Script editor after setting Script Properties.
 * It logs a compact summary without printing the full data set.
 */
function testConnection() {
  var payload = buildPayload_(true);
  var summary = {
    ok: payload.ok,
    spreadsheet: payload.meta.title,
    timeZone: payload.meta.timeZone,
    errors: payload.errors,
    tabs: {},
  };
  Object.keys(payload.tabs).forEach(function (key) {
    var tab = payload.tabs[key];
    summary.tabs[key] = {
      name: tab.name,
      headers: tab.headers.length,
      rows: tab.rows.length,
      truncated: tab.truncated,
    };
  });
  Logger.log(JSON.stringify(summary, null, 2));
  return summary;
}

/**
 * Optional helper for editors. The deployment works without any Script
 * Properties (DEFAULT_SPREADSHEET_ID is used). Setting these overrides the
 * built-in defaults.
 */
function showRequiredProperties() {
  var lines = [
    "(no Script Properties required for the default spreadsheet)",
    "Overrides you may set:",
    "SPREADSHEET_ID = <another Google Sheets file id>",
    "SHEET_ORDERS = Orders",
    "SHEET_BRANCHES = BRANCHES&AGENTS",
    "SHEET_CARS = Cars",
    "CACHE_SECONDS = 300",
    "MAX_ROWS = 5000",
  ];
  Logger.log(lines.join("\n"));
  return lines;
}
