import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const code = readFileSync(resolve(root, "scripts/apps-script/Code.gs"), "utf8");
const manifest = JSON.parse(
  readFileSync(resolve(root, "scripts/apps-script/appsscript.json"), "utf8"),
);

describe("Apps Script proxy: security", () => {
  it("requests only the read-only Sheets scope", () => {
    expect(manifest.oauthScopes).toEqual([
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ]);
  });

  it("contains no write calls", () => {
    for (const forbidden of [
      "setValues",
      "setValue(",
      "appendRow",
      "deleteRow",
      "deleteRows",
      "clearContent",
      "clearContents",
      "insertRow",
      "insertRows",
      "sort(",
      "UrlFetchApp",
      "DriveApp",
      "GmailApp",
    ]) {
      expect(code).not.toContain(forbidden);
    }
  });

  it("contains no private key or client secret", () => {
    expect(code).not.toMatch(/private_key/);
    expect(code).not.toMatch(/client_secret/);
    expect(code).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----/);
  });

  it("works out of the box with a built-in default spreadsheet id", () => {
    expect(code).toContain('var DEFAULT_SPREADSHEET_ID = "15V6Lvg9cqBb7xsT6Z4vS7nn6RRRm_JVd5eytqKaLvt8";');
    expect(code).toContain('props.getProperty("SPREADSHEET_ID") || DEFAULT_SPREADSHEET_ID');
  });

  it("reads configuration from Script Properties", () => {
    expect(code).toContain("PropertiesService.getScriptProperties()");
    expect(code).toContain("SPREADSHEET_ID");
    expect(code).toContain("SHEET_ORDERS");
    expect(code).toContain("SHEET_BRANCHES");
    expect(code).toContain("SHEET_CARS");
  });
});

describe("Apps Script proxy: contract", () => {
  it("implements doGet and returns JSONP when a callback is supplied", () => {
    expect(code).toContain("function doGet(event)");
    expect(code).toContain("params.callback");
    expect(code).toContain("ContentService.createTextOutput");
    expect(code).toContain("ContentService.MimeType.JAVASCRIPT");
    expect(code).toContain("ContentService.MimeType.JSON");
  });

  it("validates JSONP callback names", () => {
    expect(code).toContain("function isValidCallback_");
    expect(code).toContain("[A-Za-z_$]");
  });

  it("returns the tab shape the dashboard expects", () => {
    for (const field of ["headers", "rows", "label", "name", "fetchedAt", "truncated"]) {
      expect(code).toContain(field);
    }
    expect(code).toContain("tabs[tabKey]");
    expect(code).toContain("errors.push");
  });

  it("formats dates as yyyy-MM-dd using the spreadsheet time zone", () => {
    expect(code).toContain("getSpreadsheetTimeZone()");
    expect(code).toContain('Utilities.formatDate(value, timeZone, "yyyy-MM-dd")');
  });

  it("supports cache bypass for testing and a bounded cache window", () => {
    expect(code).toContain('params.nocache === "1"');
    expect(code).toContain("CacheService.getScriptCache()");
    expect(code).toContain("Math.min(cacheSeconds, 21600)");
  });

  it("provides a manual connection test", () => {
    expect(code).toContain("function testConnection()");
    expect(code).toContain("function showRequiredProperties()");
  });
});
