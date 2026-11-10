/**
 * Copy this file to js/config.js and fill in the values.
 * Do not put secrets here. The Apps Script URL is a bearer URL, keep it private.
 */
export const config = {
  provider: "apps-script", // "apps-script" | "gviz"
  spreadsheetId: "YOUR_SPREADSHEET_ID",
  appsScriptUrl: "YOUR_APPS_SCRIPT_WEB_APP_URL",
  sheetNames: {
    orders: "Orders",
    branches: "BRANCHES&AGENTS",
    cars: "Cars",
  },
  exceptionalBranches: ["Hold", "HOLD", "معلق"],
  statusAliases: {
    pickUp: ["PICK UP", "PICKUP", "PICK-UP", "بيك اب"],
    hold: ["HOLD", "Hold", "معلق"],
  },
  dateOrder: "DMY",
  currency: "EGP",
  locale: "ar-EG",
  autoRefreshMinutes: 0,
  cacheTtlMinutes: 15,
};
