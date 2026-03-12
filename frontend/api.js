export const API_BASE =
  location.hostname === "127.0.0.1" || location.hostname === "localhost"
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

export function getAvatarUrl(username) {
  const safeName = encodeURIComponent(username || "User");
  return `https://avatars.laravel.cloud/${safeName}`;
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
    const first = Array.isArray(data.errors[firstField])
      ? data.errors[firstField][0]
      : data.errors[firstField];
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

export async function fetchCurrentUser() {
  return api("/auth/me", { auth: true });
}

export async function fetchPosts() {
  return api("/posts", { auth: true });
}

export async function fetchPost(id) {
  return api(`/posts/${id}`, { auth: true });
}

export async function sendPostVote(postId, type) {
  return api(`/posts/${postId}/${type}`, {
    method: "POST",
    auth: true,
  });
}

export async function sendCommentVote(commentId, type) {
  return api(`/comments/${commentId}/${type}`, {
    method: "POST",
    auth: true,
  });
}

export function normalizeVoteState(item) {
  return {
    ...item,
    user_vote:
      item?.user_vote ??
      item?.user_reaction ??
      item?.userReaction ??
      item?.current_user_vote ??
      item?.my_vote ??
      null,
    upvotes_count:
      item?.upvotes_count ??
      item?.upvotes ??
      item?.likes_count ??
      0,
    downvotes_count:
      item?.downvotes_count ??
      item?.downvotes ??
      item?.dislikes_count ??
      0,
  };
}

export function mergeVotedItem(oldItem, serverData) {
  const normalized = normalizeVoteState(serverData || {});
  return {
    ...oldItem,
    ...serverData,
    user_vote: normalized.user_vote,
    upvotes_count: normalized.upvotes_count,
    downvotes_count: normalized.downvotes_count,
  };
}

export function trackUtm(utm) {
  return api("/track", { method: "POST", body: utm, auth: false });
}