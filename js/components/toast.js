import { icon } from "../utils/icons.js";

const ICONS = {
  success: "CheckCircle2",
  error: "AlertCircle",
  warning: "AlertTriangle",
  info: "Info",
};

export function showToast(type, title, message = "", timeout = 3800) {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const node = document.createElement("div");
  node.className = `toast is-${type}`;
  node.innerHTML = `
    ${icon(ICONS[type] || "Info", 17)}
    <div>
      <strong>${title}</strong>
      ${message ? `<p>${message}</p>` : ""}
    </div>
  `;
  root.appendChild(node);
  setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(4px)";
    node.style.transition = "opacity 160ms ease, transform 160ms ease";
    setTimeout(() => node.remove(), 180);
  }, timeout);
}
