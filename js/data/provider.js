import { fetchGvizAll } from "./gviz-provider.js";
import { fetchAppsScriptAll } from "./apps-script-provider.js";

export function getProviderName(config) {
  return config.provider === "apps-script" ? "Apps Script Proxy" : "Google Sheets (gviz)";
}

export function validateConfig(config) {
  const problems = [];
  if (!config?.spreadsheetId) problems.push("Spreadsheet ID غير مضبوط.");
  if (config?.provider === "apps-script" && !config?.appsScriptUrl) {
    problems.push("رابط Apps Script غير مضبوط.");
  }
  return problems;
}

export async function fetchAll(config, options = {}) {
  if (config.provider === "apps-script") {
    return fetchAppsScriptAll(config, options);
  }
  return fetchGvizAll(config, options);
}
