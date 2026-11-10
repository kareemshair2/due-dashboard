export const TAB_DEFINITIONS = {
  orders: {
    key: "orders",
    label: "Orders",
    name: "Orders",
    fields: {
      date: ["التاريخ", "تاريخ", "تاريخ الطلب", "Date", "Order Date"],
      customer: ["إسم العميل", "اسم العميل", "العميل", "Customer", "Customer Name"],
      status: ["الحالة", "حالة الطلب", "Status", "Order Status"],
      quantity: ["الكمية", "كمية", "Quantity", "Qty"],
    },
    required: ["date", "customer", "status", "quantity"],
  },
  branches: {
    key: "branches",
    label: "BRANCHES & AGENTS",
    name: "BRANCHES&AGENTS",
    fields: {
      date: ["التاريخ", "تاريخ", "Date"],
      branch: ["الفرع", "Branch", "Agent"],
      pickup: ["عدد PICK UP", "عدد البيك اب", "عدد بيك اب", "PICK UP", "Pickup", "Pickup Count"],
    },
    required: ["date", "branch", "pickup"],
  },
  cars: {
    key: "cars",
    label: "Cars",
    name: "Cars",
    fields: {
      date: ["التاريخ", "تاريخ", "Date"],
      shift: ["وردية", "الوردية", "Shift"],
      driver: ["اسم السائق", "السائق", "Driver", "Driver Name"],
      vehicle: ["العربة", "السيارة", "Vehicle", "Car"],
      start: ["عداد استلام العربية", "عداد استلام العربيه", "عداد الاستلام", "Start Odometer", "Odometer Start"],
      end: ["عداد تسليم العربية", "عداد تسليم العربيه", "عداد التسليم", "End Odometer", "Odometer End"],
      fuel: ["لترات الوقود", "الوقود", "Fuel", "Fuel Liters"],
      cost: ["التكلفة", "Cost"],
      km: ["عدد الكيلوات", "الكيلومترات", "Kilometers", "KM", "Distance"],
    },
    required: ["date", "shift", "driver", "vehicle", "start", "end", "fuel", "cost", "km"],
  },
};

const DIACRITICS = /[\u064B-\u065F\u0670\u0640]/g;
const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\uFEFF]/g;

export function normalizeHeader(value) {
  return String(value ?? "")
    .replace(ZERO_WIDTH, "")
    .replace(DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[:\-#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeKey(value) {
  return String(value ?? "")
    .replace(ZERO_WIDTH, "")
    .replace(DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function mapHeaders(tabKey, headers) {
  const def = TAB_DEFINITIONS[tabKey];
  if (!def) throw new Error(`Unknown tab: ${tabKey}`);
  const normalized = headers.map(normalizeHeader);
  const map = {};
  const missing = [];
  for (const [field, aliases] of Object.entries(def.fields)) {
    const aliasSet = new Set(aliases.map(normalizeHeader));
    const index = normalized.findIndex((header) => aliasSet.has(header));
    if (index >= 0) map[field] = index;
    else if (def.required.includes(field)) missing.push(field);
  }
  return { map, missing };
}

export function isExceptionalBranch(branch, config) {
  const value = normalizeKey(branch);
  return (config.exceptionalBranches || []).some((item) => normalizeKey(item) === value);
}

export function normalizeStatus(status, config) {
  const value = normalizeKey(status);
  if (!value) return null;
  const pickUp = new Set((config.statusAliases?.pickUp || []).map(normalizeKey));
  const hold = new Set((config.statusAliases?.hold || []).map(normalizeKey));
  if (pickUp.has(value)) return "PICK_UP";
  if (hold.has(value)) return "HOLD";
  return "OTHER";
}

export const STATUS_LABELS = {
  PICK_UP: "PICK UP",
  HOLD: "HOLD",
  OTHER: "أخرى",
  UNKNOWN: "غير معروف",
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || "—";
}

export const SEVERITY = {
  critical: { key: "critical", label: "حرجة", rank: 0 },
  warning: { key: "warning", label: "تحذير", rank: 1 },
  info: { key: "info", label: "ملاحظة", rank: 2 },
};

export const FIELD_LABELS = {
  date: "التاريخ",
  customer: "اسم العميل",
  status: "الحالة",
  quantity: "الكمية",
  branch: "الفرع",
  pickup: "عدد PICK UP",
  shift: "الوردية",
  driver: "اسم السائق",
  vehicle: "العربة",
  start: "عداد الاستلام",
  end: "عداد التسليم",
  fuel: "لترات الوقود",
  cost: "التكلفة",
  km: "عدد الكيلوات",
  distance: "المسافة المحسوبة",
};
