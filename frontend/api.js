
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

export function setAuth({ token, user }) {
  if (token) localStorage.setItem("token", token);
  if (user?.username) localStorage.setItem("username", user.username);
  if (user?.id != null) localStorage.setItem("user_id", String(user.id));
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("user_id");
}

async function parseJsonSafe(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return { raw: text }; }
}

function pickLaravelError(data, status) {
  if (data?.errors && typeof data.errors === "object") {
    const firstField = Object.keys(data.errors)[0];
    const first = Array.isArray(data.errors[firstField]) ? data.errors[firstField][0] : data.errors[firstField];
    if (first) return String(first);
  }

  const raw = String(data?.error || data?.message || "").trim();
  const map = {
    "Unauthorized": "Musíš se přihlásit.",
    "Forbidden": "Na tohle nemáš oprávnění.",
    "Not Found": "Požadovaný obsah nebyl nalezen.",
    "The given data was invalid.": "Odeslaná data nejsou platná.",
    "Validation error": "Odeslaná data nejsou platná.",
    "Too Many Attempts.": "Zkus to prosím znovu za chvíli.",
  };

  if (map[raw]) return map[raw];
  if (status === 401) return "Musíš se přihlásit.";
  if (status == 403) return "Na tohle nemáš oprávnění.";
  if (status == 404) return "Požadovaný obsah nebyl nalezen.";
  if (status >= 500) return "Na serveru nastala chyba.";
  return raw || `HTTP ${status}`;
}

// Jedno místo pro HTTP volání
export async function api(path, { method = "GET", body = null, auth = false } = {}) {
  const headers = { "Accept": "application/json" };
  if (body != null) headers["Content-Type"] = "application/json";
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
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

/**
 * API (v1) – podle README:
 * AUTH:
 *  - POST /auth/register {username} -> {username, password, token}
 *  - POST /auth/login {password} -> {token, user:{id, username}}
 *  - POST /auth/logout (auth)
 *  - GET  /auth/me (auth) -> {id, username}
 *
 * POSTS:
 *  - GET /posts?per_page=10&page=1 -> {data:[...], meta:{...}}
 *  - GET /posts/{id} -> {data:{...}}
 *  - POST /posts (auth) {title, body} -> {data:post}
 *  - PUT /posts/{id} (auth+autor)
 *  - DELETE /posts/{id} (auth+autor)
 *
 * COMMENTS:
 *  - GET /posts/{post}/comments -> {data:[...]}
 *  - POST /posts/{post}/comments (auth) {body} -> {data:comment}
 *  - PUT /comments/{comment} (auth+autor)
 *  - DELETE /comments/{comment} (auth+autor)
 */

/**
 * Fire-and-forget UTM tracking (anonymous).
 * POST /api/v1/track
 * Body: { utm_source?, utm_medium?, utm_campaign? }
 * Response: { message: "OK" }
 */
export function trackUtm(utm) {
  // do not throw if endpoint is down; caller decides whether to await
  return api("/track", { method: "POST", body: utm, auth: false });
}
