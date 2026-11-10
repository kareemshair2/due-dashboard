import { TAB_DEFINITIONS, mapHeaders, normalizeKey, normalizeStatus, isExceptionalBranch } from "./schema.js";
import { parseDate } from "../utils/date-utils.js";
import { parseNumber } from "../utils/number-utils.js";

export class SchemaError extends Error {
  constructor(tabKey, missing, headers) {
    super(`أعمدة مطلوبة غير موجودة في تاب ${TAB_DEFINITIONS[tabKey]?.label || tabKey}: ${missing.join(", ")}`);
    this.name = "SchemaError";
    this.tabKey = tabKey;
    this.missing = missing;
    this.headers = headers;
  }
}

function cell(row, index) {
  if (index === undefined || index === null) return null;
  const value = row[index];
  return value === undefined ? null : value;
}

function text(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function hasAny(values) {
  return values.some((value) => value !== null && value !== undefined && String(value).trim() !== "");
}

function buildRaw(headers, row, map) {
  const raw = {};
  for (const [field, index] of Object.entries(map)) {
    raw[field] = cell(row, index);
    raw[`__header_${field}`] = headers[index] || "";
  }
  return raw;
}

function parseOrdersRow(row, index, map, headers, config) {
  const dateRaw = cell(row, map.date);
  const customerRaw = cell(row, map.customer);
  const statusRaw = cell(row, map.status);
  const quantityRaw = cell(row, map.quantity);
  if (!hasAny([dateRaw, customerRaw, quantityRaw])) return null;

  const parsedDate = parseDate(dateRaw, config.dateOrder);
  return {
    __row: index + 2,
    __index: index,
    tab: "orders",
    date: parsedDate.iso,
    dateRaw,
    dateAmbiguous: parsedDate.ambiguous,
    dateSource: parsedDate.source,
    customer: text(customerRaw) || null,
    customerRaw,
    statusRaw,
    status: normalizeStatus(statusRaw, config),
    quantity: parseNumber(quantityRaw),
    quantityRaw,
    raw: buildRaw(headers, row, map),
  };
}

function parseBranchesRow(row, index, map, headers, config) {
  const dateRaw = cell(row, map.date);
  const branchRaw = cell(row, map.branch);
  const pickupRaw = cell(row, map.pickup);
  if (!hasAny([dateRaw, branchRaw, pickupRaw])) return null;

  const parsedDate = parseDate(dateRaw, config.dateOrder);
  const branch = text(branchRaw) || null;
  return {
    __row: index + 2,
    __index: index,
    tab: "branches",
    date: parsedDate.iso,
    dateRaw,
    dateAmbiguous: parsedDate.ambiguous,
    dateSource: parsedDate.source,
    branch,
    branchRaw,
    branchNorm: normalizeKey(branch),
    pickup: parseNumber(pickupRaw),
    pickupRaw,
    isExceptional: branch ? isExceptionalBranch(branch, config) : false,
    raw: buildRaw(headers, row, map),
  };
}

function parseCarsRow(row, index, map, headers, config) {
  const dateRaw = cell(row, map.date);
  const driverRaw = cell(row, map.driver);
  const vehicleRaw = cell(row, map.vehicle);
  const startRaw = cell(row, map.start);
  const endRaw = cell(row, map.end);
  const fuelRaw = cell(row, map.fuel);
  const costRaw = cell(row, map.cost);
  const kmRaw = cell(row, map.km);
  if (!hasAny([dateRaw, driverRaw, vehicleRaw, startRaw, endRaw, fuelRaw, costRaw])) return null;

  const parsedDate = parseDate(dateRaw, config.dateOrder);
  const start = parseNumber(startRaw);
  const end = parseNumber(endRaw);
  const fuel = parseNumber(fuelRaw);
  const cost = parseNumber(costRaw);
  const km = parseNumber(kmRaw);

  const bothPresent = start !== null && end !== null;
  const nonNegative = bothPresent && start >= 0 && end >= 0;
  const ordered = nonNegative && end >= start;
  const notBothZero = !(start === 0 && end === 0);
  const isOdometerValid = Boolean(bothPresent && nonNegative && ordered && notBothZero);
  const distance = isOdometerValid ? end - start : null;
  const isTrip = distance !== null && distance > 0;
  const fuelEfficiency = isTrip && fuel !== null && fuel > 0 ? distance / fuel : null;
  const costPerKm = isTrip && cost !== null && cost >= 0 ? cost / distance : null;
  const kmMismatch = distance !== null && km !== null ? km - distance : null;

  return {
    __row: index + 2,
    __index: index,
    tab: "cars",
    date: parsedDate.iso,
    dateRaw,
    dateAmbiguous: parsedDate.ambiguous,
    dateSource: parsedDate.source,
    shift: text(cell(row, map.shift)) || null,
    driver: text(driverRaw) || null,
    vehicle: text(vehicleRaw) || null,
    start,
    end,
    fuel,
    cost,
    kmRaw: km,
    distance,
    isOdometerValid,
    isTrip,
    fuelEfficiency,
    costPerKm,
    kmMismatch,
    isZeroReading: start === 0 && end === 0,
    isEndBeforeStart: bothPresent && end < start,
    hasFuelWithoutDistance: fuel !== null && fuel > 0 && distance === null,
    hasCostWithoutDistance: cost !== null && cost > 0 && distance === null,
    raw: buildRaw(headers, row, map),
  };
}

const ROW_PARSERS = {
  orders: parseOrdersRow,
  branches: parseBranchesRow,
  cars: parseCarsRow,
};

export function parseTab(tabKey, raw, config) {
  const def = TAB_DEFINITIONS[tabKey];
  if (!def) throw new Error(`Unknown tab: ${tabKey}`);
  if (!raw) throw new Error(`تاب ${def.label} غير موجود في استجابة البيانات.`);
  const headers = raw.headers || [];
  const { map, missing } = mapHeaders(tabKey, headers);
  if (missing.length) throw new SchemaError(tabKey, missing, headers);

  const parseRow = ROW_PARSERS[tabKey];
  const rows = [];
  let skippedRows = 0;
  (raw.rows || []).forEach((row, index) => {
    const parsed = parseRow(row, index, map, headers, config);
    if (parsed) rows.push(parsed);
    else skippedRows += 1;
  });

  return {
    key: tabKey,
    label: def.label,
    name: def.name,
    headers,
    schema: map,
    rows,
    skippedRows,
    fetchedAt: raw.fetchedAt || Date.now(),
  };
}

export function parseAll(rawTabs, config) {
  const data = { orders: [], branches: [], cars: [] };
  const meta = {};
  const errors = [];

  for (const key of Object.keys(TAB_DEFINITIONS)) {
    const raw = rawTabs?.[key];
    if (!raw) {
      errors.push({ tab: key, message: `تاب ${TAB_DEFINITIONS[key].label} غير موجود.` });
      continue;
    }
    try {
      const parsed = parseTab(key, raw, config);
      data[key] = parsed.rows;
      meta[key] = {
        label: parsed.label,
        name: parsed.name,
        headers: parsed.headers,
        schema: parsed.schema,
        count: parsed.rows.length,
        skippedRows: parsed.skippedRows,
        fetchedAt: parsed.fetchedAt,
      };
    } catch (error) {
      errors.push({ tab: key, message: error.message, detail: error });
    }
  }

  return { data, meta, errors };
}
