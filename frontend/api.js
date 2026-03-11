export const API_BASE = location.hostname === "127.0.0.1" || location.hostname === "localhost"
  ? "http://127.0.0.1:8000/api/v1"
  : "/api/v1";

export function getToken() {
  return localStorage.getItem("token");
}

export function getUsername() {
  return localStorage.getItem("username");
}

export function getUserId() {
  const v = localStorage.getItem("user_id");
  return v ? Number(v) : null;
}

export function isAdmin() {
  return localStorage.getItem("is_admin") === "true";
}

export function setAuth({ token, user }) {
  if (token) localStorage.setItem("token", token);
  if (user?.username) localStorage.setItem("username", user.username);
  if (user?.id != null) localStorage.setItem("user_id", String(user.id));
  if (user?.is_admin != null) localStorage.setItem("is_admin", String(Boolean(user.is_admin)));
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("user_id");
  localStorage.removeItem("is_admin");
}

async function parseJsonSafe(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

function pickLaravelError(data, status) {
  if (data?.errors && typeof data.errors === "object") {
    const firstField = Object.keys(data.errors)[0];
    const first = Array.isArray(data.errors[firstField]) ? data.errors[firstField][0] : data.errors[firstField];
    if (first) return String(first);
  }

  const raw = String(data?.error || data?.message || "").trim();
  const map = {
    Unauthorized: "Musíš se přihlásit.",
    Forbidden: "Na tohle nemáš oprávnění.",
    "Not Found": "Požadovaný obsah nebyl nalezen.",
    "The given data was invalid.": "Odeslaná data nejsou platná.",
    "Validation error": "Odeslaná data nejsou platná.",
    "Too Many Attempts.": "Zkus to prosím znovu za chvíli.",
    "Unauthenticated.": "Musíš se přihlásit.",
  };

  if (map[raw]) return map[raw];
  if (status === 401) return "Musíš se přihlásit.";
  if (status === 403) return "Na tohle nemáš oprávnění.";
  if (status === 404) return "Požadovaný obsah nebyl nalezen.";
  if (status >= 500) return "Na serveru nastala chyba.";
  return raw || `HTTP ${status}`;
}

export async function api(path, { method = "GET", body = null, auth = false } = {}) {
  const headers = { Accept: "application/json" };
  if (body != null) headers["Content-Type"] = "application/json";
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : null,
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(pickLaravelError(data, res.status));
  }
  return data;
}

export function trackUtm(utm) {
  return api("/track", { method: "POST", body: utm, auth: false });
}
