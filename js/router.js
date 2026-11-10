export const ROUTES = ["overview", "orders", "branches", "cars", "data-quality", "settings"];

export function parseRoute() {
  const raw = window.location.hash.replace(/^#\/?/, "").split("?")[0].trim();
  return ROUTES.includes(raw) ? raw : "overview";
}

export function navigate(route) {
  if (!ROUTES.includes(route)) return;
  const next = `#/${route}`;
  if (window.location.hash === next) return;
  window.location.hash = next;
}

export function startRouter(onChange) {
  window.addEventListener("hashchange", () => onChange(parseRoute()));
  return parseRoute();
}
