const ACCESS_CODE_KEY = "dog-training-tracker-cloud-code";

function headers(accessCode = "") {
  const result = { Accept: "application/json" };
  const code = String(accessCode || "").trim();
  if (code) result["x-kennel-access-code"] = code;
  return result;
}

async function parseResponse(response) {
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { error: text || response.statusText };
  }

  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || `Cloud sync failed (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export function getCloudAccessCode() {
  try {
    return localStorage.getItem(ACCESS_CODE_KEY) || "";
  } catch {
    return "";
  }
}

export function setCloudAccessCode(value) {
  try {
    const clean = String(value || "").trim();
    if (clean) localStorage.setItem(ACCESS_CODE_KEY, clean);
    else localStorage.removeItem(ACCESS_CODE_KEY);
  } catch {
    // Ignore unavailable localStorage.
  }
}

export async function fetchCloudState(accessCode = "") {
  const response = await fetch("/api/sync", { method: "GET", headers: headers(accessCode) });
  return parseResponse(response);
}

export async function saveCloudState(state, accessCode = "", mode = "merge") {
  const response = await fetch("/api/sync", {
    method: "POST",
    headers: { ...headers(accessCode), "Content-Type": "application/json" },
    body: JSON.stringify({ state, mode }),
  });
  return parseResponse(response);
}

export function describeCloudError(error) {
  if (error?.status === 401) return "Cloud access code required or incorrect.";
  if (error?.status === 500 && /DATABASE_URL/i.test(String(error?.message || ""))) return "Cloud database is not configured yet.";
  if (error?.message?.includes("Unexpected token") || error?.message?.includes("not found")) return "Cloud API not available in this environment. Deploy to Vercel or run with Vercel dev.";
  return error?.message || "Cloud sync is currently unavailable.";
}
