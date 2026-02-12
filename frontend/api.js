// api.js
export const API_BASE = "http://127.0.0.1:8000"; 
// ↑ změň na váš backend (Laravel/Symfony) URL, např. https://vase-domena.cz

export function getToken() {
  return localStorage.getItem("token");
}
export function setAuth({ token, username }) {
  if (token) localStorage.setItem("token", token);
  if (username) localStorage.setItem("username", username);
}
export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
}
export function getUsername() {
  return localStorage.getItem("username");
}

async function parseJsonSafe(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return { raw: text }; }
}

// Jedno místo pro HTTP volání
export async function api(path, { method = "GET", body = null, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    // očekáváme { error: "..."} nebo { message: "..."} z backendu
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}




/**
 * Očekávané endpointy backendu:
 * POST /auth/register {username,email?,password}
 * POST /auth/login {usernameOrEmail,password} -> {access_token, username}
 * GET  /threads
 * POST /threads (auth) {title, content}
 * GET  /threads/:id
 * GET  /threads/:id/posts
 * POST /threads/:id/posts (auth) {content}
 */
