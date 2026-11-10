import { normalizeKey } from "../data/schema.js";
import { formatDateRange } from "../utils/formatters.js";

const ARRAY_KEYS = [
  "statuses",
  "customers",
  "branches",
  "vehicles",
  "drivers",
  "shifts",
  "severities",
  "tabs",
];

export function createFilters() {
  return {
    preset: "all",
    from: "",
    to: "",
    search: "",
    statuses: [],
    customers: [],
    branches: [],
    vehicles: [],
    drivers: [],
    shifts: [],
    severities: [],
    tabs: [],
  };
}

export function resetFilters(filters) {
  Object.assign(filters, createFilters());
  return filters;
}

export function inDateRange(iso, from, to) {
  if (!from && !to) return true;
  if (!iso) return false;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

export function matchesSearch(values, term) {
  if (!term) return true;
  const needle = normalizeKey(term);
  if (!needle) return true;
  return values.some((value) => normalizeKey(value ?? "").includes(needle));
}

export function distinctValues(rows, getter) {
  const set = new Set();
  for (const row of rows) {
    const value = getter(row);
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      set.add(String(value).trim());
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ar"));
}

function selectedMatch(value, selected) {
  if (!selected || selected.length === 0) return true;
  return selected.includes(value);
}

export function filterOrders(rows, filters) {
  return rows.filter((row) => {
    if (!inDateRange(row.date, filters.from, filters.to)) return false;
    if (!selectedMatch(row.status, filters.statuses)) return false;
    if (!selectedMatch(row.customer, filters.customers)) return false;
    if (filters.search && !matchesSearch([row.customer, row.statusRaw, row.status], filters.search)) {
      return false;
    }
    return true;
  });
}

export function filterBranches(rows, filters, { includeExceptional = false } = {}) {
  return rows.filter((row) => {
    if (!includeExceptional && row.isExceptional) return false;
    if (!inDateRange(row.date, filters.from, filters.to)) return false;
    if (!selectedMatch(row.branch, filters.branches)) return false;
    if (filters.search && !matchesSearch([row.branch], filters.search)) return false;
    return true;
  });
}

export function filterExceptionalBranches(rows, filters) {
  return rows.filter((row) => {
    if (!row.isExceptional) return false;
    return inDateRange(row.date, filters.from, filters.to);
  });
}

export function filterCars(rows, filters) {
  return rows.filter((row) => {
    if (!inDateRange(row.date, filters.from, filters.to)) return false;
    if (!selectedMatch(row.vehicle, filters.vehicles)) return false;
    if (!selectedMatch(row.driver, filters.drivers)) return false;
    if (!selectedMatch(row.shift, filters.shifts)) return false;
    if (
      filters.search &&
      !matchesSearch([row.driver, row.vehicle, row.shift], filters.search)
    ) {
      return false;
    }
    return true;
  });
}

export function countActiveFilters(filters) {
  let count = 0;
  if (filters.from || filters.to) count += 1;
  if (filters.search) count += 1;
  for (const key of ARRAY_KEYS) {
    count += (filters[key] || []).length;
  }
  return count;
}

function labelFor(options, key, value) {
  const field = options?.[key];
  const items = Array.isArray(field) ? field : field?.items;
  const match = items?.find((item) => item.value === value);
  return match?.label ?? value;
}

export function buildChips(filters, options = {}) {
  const chips = [];
  if (filters.from || filters.to) {
    chips.push({
      key: "range",
      value: "",
      label: formatDateRange(filters.from, filters.to),
    });
  }
  if (filters.search) {
    chips.push({ key: "search", value: "", label: `بحث: ${filters.search}` });
  }
  for (const key of ARRAY_KEYS) {
    const values = filters[key] || [];
    if (!values.length) continue;
    if (values.length === 1) {
      chips.push({ key, value: values[0], label: labelFor(options, key, values[0]) });
    } else {
      chips.push({
        key,
        value: "",
        label: `${labelFor(options, key, values[0])} +${values.length - 1}`,
      });
    }
  }
  return chips;
}

export function removeChip(filters, key, value) {
  if (key === "range") {
    filters.from = "";
    filters.to = "";
    filters.preset = "all";
    return;
  }
  if (key === "search") {
    filters.search = "";
    return;
  }
  if (ARRAY_KEYS.includes(key)) {
    if (!value) {
      filters[key] = [];
    } else {
      filters[key] = (filters[key] || []).filter((item) => item !== value);
    }
  }
}
