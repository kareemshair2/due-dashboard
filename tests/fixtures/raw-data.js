/**
 * Test fixtures shaped like the payload returned by the gviz / Apps Script
 * providers. Headers and values mirror the real DUE sheet, including a helper
 * column and a trailing blank row, so the parser is tested against the same
 * noise it sees in production.
 */

export const testConfig = {
  provider: "gviz",
  spreadsheetId: "test-spreadsheet-id",
  appsScriptUrl: "",
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

export const ordersRaw = {
  key: "orders",
  name: "Orders",
  label: "Orders",
  headers: ["التاريخ", "إسم العميل ", "الحالة", "الكمية", "Helper"],
  rows: [
    ["Date(2026,10,9)", "جو", "PICK UP", 15, "x"],
    ["Date(2026,10,9)", "ايس بوست", "Hold", 20, ""],
    ["Date(2026,10,9)", "انوثه هيربس", "PICK UP", 1, ""],
    ["Date(2026,10,9)", "techno", "PICK UP", 2, ""],
    ["", "", "", "", ""],
  ],
  fetchedAt: "2026-11-09T10:00:00.000Z",
};

export const branchesRaw = {
  key: "branches",
  name: "BRANCHES&AGENTS",
  label: "BRANCHES & AGENTS",
  headers: ["التاريخ", "الفرع", "عدد PICK UP", "Helper"],
  rows: [
    ["Date(2026,10,9)", "Speed", 2, ""],
    ["Date(2026,10,9)", "Gesr El Suez Branch", 11, ""],
    ["Date(2026,10,9)", "Menib Branch", 5, ""],
    ["Date(2026,10,9)", "Kaabo", 0, ""],
    ["Date(2026,10,9)", "Light Speed", 0, ""],
    ["Date(2026,10,9)", "Hold", 20, ""],
    ["", "", "", ""],
  ],
  fetchedAt: "2026-11-09T10:00:00.000Z",
};

export const carsRaw = {
  key: "cars",
  name: "Cars",
  label: "Cars",
  headers: [
    "التاريخ",
    "وردية",
    "اسم السائق",
    "العربة",
    "عداد استلام العربية",
    "عداد تسليم العربية",
    "لترات الوقود",
    "التكلفة",
    "عدد الكيلوات",
    "Helper",
  ],
  rows: [
    ["Date(2026,10,9)", "صباحية", "أحمد", "EV404", 5652, 5940, 33, "", 288, ""],
    ["Date(2026,10,9)", "مسائية", "محمود", "EV404", 5940, 5994, 0, 0, 54, ""],
    ["Date(2026,10,9)", "صباحية", "سامح", "SUZUKI_GT06N", 0, 0, 0, 0, 0, ""],
    ["", "", "", "", "", "", "", "", "", ""],
  ],
  fetchedAt: "2026-11-09T10:00:00.000Z",
};

export const rawTabs = {
  orders: ordersRaw,
  branches: branchesRaw,
  cars: carsRaw,
};

/** A second Cars tab used to exercise end-before-start and mismatch rules. */
export const carsEdgeRaw = {
  key: "cars",
  name: "Cars",
  label: "Cars",
  headers: carsRaw.headers,
  rows: [
    ["2026-11-09", "صباحية", "أحمد", "EV404", 1000, 900, 10, 100, 50, ""],
    ["2026-11-09", "مسائية", "محمود", "EV404", 2000, 2100, 10, 100, 200, ""],
  ],
  fetchedAt: "2026-11-09T10:00:00.000Z",
};
