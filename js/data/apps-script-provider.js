function jsonpRequest(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const callbackName = `__due_jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    let timer = null;

    function cleanup() {
      if (timer) clearTimeout(timer);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("تعذر الاتصال بـ Apps Script. راجع الرابط أو صلاحيات النشر."));
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error("انتهت مهلة الاتصال بـ Apps Script."));
    }, timeoutMs);

    const separator = url.includes("?") ? "&" : "?";
    script.src = `${url}${separator}callback=${callbackName}`;
    script.async = true;
    document.head.appendChild(script);
  });
}

export async function fetchAppsScriptAll(config, { force = false } = {}) {
  if (!config.appsScriptUrl) {
    throw new Error("رابط Apps Script غير مضبوط في js/config.js");
  }
  const url = new URL(config.appsScriptUrl);
  if (force) url.searchParams.set("nocache", "1");
  const payload = await jsonpRequest(url.toString());
  if (!payload || payload.ok !== true) {
    throw new Error(payload?.error || "استجابة غير صالحة من Apps Script");
  }
  return {
    provider: "apps-script",
    tabs: payload.tabs || {},
    errors: payload.errors || [],
    fetchedAt: payload.fetchedAt ? new Date(payload.fetchedAt).getTime() : Date.now(),
    meta: payload.meta || {},
    force,
  };
}
