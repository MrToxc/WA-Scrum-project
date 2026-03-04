import { api, getToken, setAuth, clearAuth, getUsername, getUserId } from "./api.js";

const $app = document.getElementById("app");
const $flash = document.getElementById("flash");

const $authStatus = document.getElementById("authStatus");
const $btnLogout = document.getElementById("btnLogout");
const $btnLoginLink = document.getElementById("btnLoginLink");
const $btnRegisterLink = document.getElementById("btnRegisterLink");
const $btnTheme = document.getElementById("btnTheme");

// -------- Theme (light/dark) --------
function getPreferredTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  if ($btnTheme) {
    $btnTheme.textContent = isDark ? "☀️" : "🌙";
    $btnTheme.setAttribute("aria-label", isDark ? "Přepnout na světlý režim" : "Přepnout na tmavý režim");
    $btnTheme.title = isDark ? "Světlý režim" : "Tmavý režim";
  }
}

function toggleTheme() {
  const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next);
  applyTheme(next);
}

applyTheme(getPreferredTheme());

$btnTheme?.addEventListener("click", toggleTheme);

function isAuthed() {
  return !!getToken();
}


function renderVotes({ kind, id, upvotes_count = 0, downvotes_count = 0, user_reaction = null }) {
  const upActive = user_reaction === "upvote" ? "is-active" : "";
  const downActive = user_reaction === "downvote" ? "is-active" : "";
  return `
    <button class="voteBtn ${post.user_reaction === 'upvote' ? 'voteBtn--activeUp' : ''}" 
        data-type="upvote">▲</button>

  <span class="voteCount">${post.upvotes_count}</span>

  <button class="voteBtn ${post.user_reaction === 'downvote' ? 'voteBtn--activeDown' : ''}" 
        data-type="downvote">▼</button>

  <span class="voteCount">${post.downvotes_count}</span>
  `;
}

async function toggleReaction({ kind, id, type }) {
  if (!isAuthed()) {
    showFlash("Pro hlasování se musíš přihlásit.", "err");
    return;
  }
  const base = kind === "comment" ? "comments" : "posts";
  await api(`/${base}/${encodeURIComponent(id)}/reactions`, { method: "POST", auth: true, body: { type } });
}

// Delegovaný handler pro hlasování (funguje ve všech obrazovkách)
$app.addEventListener("click", async (e) => {
  const btn = e.target?.closest?.("[data-action='vote']");
  if (!btn) return;

  e.preventDefault();
  const kind = btn.getAttribute("data-kind");
  const id = btn.getAttribute("data-id");
  const type = btn.getAttribute("data-vote");

  try {
    await toggleReaction({ kind, id, type });
    // přerender podle aktuálního hashe (zachová stránku/detail)
    route();
  } catch (err) {
    showFlash(err?.message ?? String(err), "err");
  }
});


function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function avatarUrl(username) {
  const u = String(username ?? "").trim();
  return `https://avatars.laravel.cloud/${encodeURIComponent(u || "user")}`;
}

function avatarImg(username, size = 22) {
  // avatars.laravel.cloud generuje SVG/PNG – držíme jednoduché <img>
  const url = avatarUrl(username);
  return `<img class="avatar" src="${escapeHtml(url)}" alt="" width="${size}" height="${size}" loading="lazy" referrerpolicy="no-referrer" />`;
}

function fmtDate(s) {
  // backend posílá ISO 8601 – jen lehká humanizace
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleString();
}

function timeAgo(s) {
  if (!s) return "";
  const d = new Date(s);
  const t = d.getTime();
  if (Number.isNaN(t)) return String(s);

  const diffMs = Date.now() - t;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 10) return "právě teď";
  if (diffSec < 60) return `před ${diffSec} s`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `před ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `před ${diffH} h`;

  const diffD = Math.floor(diffH / 24);
  return `před ${diffD} d`;
}

function isEdited(createdAt, updatedAt) {
  if (!createdAt || !updatedAt) return false;
  const c = new Date(createdAt).getTime();
  const u = new Date(updatedAt).getTime();
  if (Number.isNaN(c) || Number.isNaN(u)) return false;
  return (u - c) > 5000; // README: tolerance 5s
}

function showFlash(message, type = "ok") {
  $flash.className = `flash ${type === "ok" ? "flash--ok" : "flash--err"}`;
  $flash.textContent = message;
  $flash.style.display = "block";
  window.setTimeout(() => ($flash.style.display = "none"), 3200);
}

// -------- Modal (for edit dialogs) --------
function openModal({ title = "", contentHtml = "", onSubmit = null, submitText = "Uložit" } = {}) {
  // Close existing modal if any
  document.getElementById("modalBackdrop")?.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "modalBackdrop";
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="modal__header">
        <div class="modal__title">${escapeHtml(title)}</div>
      </div>
      <div class="modal__body">${contentHtml}</div>
      <div class="modal__footer">
        <button class="btn" type="button" data-modal-cancel>Zrušit</button>
        <button class="btn btn--primary" type="submit" form="modalForm">${escapeHtml(submitText)}</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const modal = backdrop.querySelector(".modal");
  const cancelBtn = backdrop.querySelector("[data-modal-cancel]");

  function close() {
    document.removeEventListener("keydown", onKey);
    backdrop.remove();
  }

  function onKey(e) {
    if (e.key === "Escape") close();
  }

  document.addEventListener("keydown", onKey);

  // click outside closes
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  cancelBtn.addEventListener("click", close);

  const form = backdrop.querySelector("#modalForm");
  if (form && typeof onSubmit === "function") {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const ok = await onSubmit(new FormData(form), close);
      if (ok) close();
    });
  }

  // focus first input/textarea
  window.setTimeout(() => {
    modal.querySelector("input, textarea, button")?.focus();
  }, 0);

  return { close };
}

function renderAuthUI() {
  const authed = isAuthed();
  const user = getUsername();

  $authStatus.innerHTML = authed
    ? `<span class="authStatus">${avatarImg(user, 20)}<span>přihlášen jako <b>${escapeHtml(user ?? "?")}</b></span></span>`
    : "nepřihlášen";
  $btnLogout.style.display = authed ? "inline-flex" : "none";
  $btnLoginLink.style.display = authed ? "none" : "inline-flex";
  $btnRegisterLink.style.display = authed ? "none" : "inline-flex";

  document.querySelectorAll(".auth-only").forEach(el => {
    el.style.display = authed ? "inline-flex" : "none";
  });
}

$btnLogout.addEventListener("click", async () => {
  try { await api("/auth/logout", { method: "POST", auth: true }); } catch { /* ignore */ }
  clearAuth();
  renderAuthUI();
  location.hash = "#/";
  showFlash("Odhlášeno.", "ok");
});

// -------- Router (hash-based) --------
function route() {
  const hash = location.hash || "#/";
  const [path, queryString] = hash.slice(1).split("?");
  const parts = path.split("/").filter(Boolean);
  const qs = new URLSearchParams(queryString || "");

  // / -> posts
  if (parts.length === 0) return renderPosts({ page: Number(qs.get("page") || 1) });

  if (parts[0] === "login") return renderLogin();
  if (parts[0] === "register") return renderRegister();
  if (parts[0] === "new-post") return renderNewPost();
  if (parts[0] === "post" && parts[1]) return renderPostDetail(parts[1]);

  return renderNotFound();
}

window.addEventListener("hashchange", route);

// -------- Views --------

async function renderPosts({ page = 1 } = {}) {
  $app.innerHTML = `
    <div class="row" style="justify-content:space-between; align-items:flex-end;">
      <div>
        <h1>Posty</h1>
        <div class="muted">Veřejné čtení • Všechny hanlivé nebo urážlivé příspěvky budou potrestány</div>
      </div>

    </div>
    <div class="card muted">Načítám…</div>
  `;

  try {
    const perPage = 10;
    const payload = await api(`/posts?per_page=${perPage}&page=${encodeURIComponent(page)}`, { auth: isAuthed() });
    const posts = payload?.data ?? [];
    const meta = payload?.meta ?? {};

    if (!posts.length) {
      $app.innerHTML = `
        <h1>Posty</h1>
        <div class="card muted">Zatím žádné posty.</div>
      `;
      renderAuthUI();
      return;
    }

    const currentUserId = getUserId();

    const pager = `
      <div class="row" style="justify-content:space-between; align-items:center; margin-top:14px;">
        <div class="muted">Stránka ${escapeHtml(meta.page ?? page)} / ${escapeHtml(meta.last_page ?? 1)} • Celkem ${escapeHtml(meta.total ?? posts.length)}</div>
        <div class="row" style="gap:8px;">
          <a class="btn" href="#/?page=${Math.max(1, (meta.page ?? page) - 1)}" ${((meta.page ?? page) <= 1) ? 'aria-disabled="true" style="pointer-events:none;opacity:.5"' : ""}>←</a>
          <a class="btn" href="#/?page=${Math.min((meta.last_page ?? page), (meta.page ?? page) + 1)}" ${((meta.page ?? page) >= (meta.last_page ?? page)) ? 'aria-disabled="true" style="pointer-events:none;opacity:.5"' : ""}>→</a>
        </div>
      </div>
    `;

    $app.innerHTML = `
      <div class="row" style="justify-content:space-between; align-items:flex-end;">
        <div>
          <h1>Posty</h1>
          <div class="muted">Veřejné čtení • Všechny hanlivé nebo urážlivé příspěvky budou potrestány</div>
        </div>
  
      </div>

      <div class="list">
        ${posts.map(p => {
          const edited = isEdited(p.created_at, p.updated_at);
          const isMine = currentUserId != null && p?.user?.id === currentUserId;
          return `
            <div class="card">
              <div class="thread__meta">
                <span class="pill">#${escapeHtml(p.id)}</span>
                <span class="pill pill--user">${avatarImg(p?.user?.username, 18)}${escapeHtml(p?.user?.username ?? "")}</span>
                <span class="pill" title="${escapeHtml(fmtDate(p.created_at))}">${escapeHtml(timeAgo(p.created_at))}${edited ? " • Edited" : ""}</span>
                <span class="pill">💬 ${escapeHtml(p.comments_count ?? 0)}</span>
                ${renderVotes({ kind: "post", id: p.id, upvotes_count: p.upvotes_count, downvotes_count: p.downvotes_count, user_reaction: p.user_reaction })}
              </div>

              <h3 style="margin-top:10px">
                <a href="#/post/${encodeURIComponent(p.id)}">${escapeHtml(p.title)}</a>
              </h3>
              <p class="muted content">${escapeHtml(String(p.body ?? "").slice(0, 160))}${String(p.body ?? "").length > 160 ? "…" : ""}</p>

              ${isMine ? `
                <div class="row" style="justify-content:flex-end; margin-top:10px; gap:8px;">
                  <button class="btn" data-action="edit-post" data-id="${escapeHtml(p.id)}">Upravit</button>
                  <button class="btn btn--danger" data-action="delete-post" data-id="${escapeHtml(p.id)}">Smazat</button>
                </div>
              ` : ""}
            </div>
          `;
        }).join("")}
      </div>

      ${pager}
    `;

    // bind edit/delete (delegace)
    $app.querySelectorAll("[data-action='edit-post']").forEach(btn => {
      btn.addEventListener("click", () => openEditPost(btn.getAttribute("data-id")));
    });
    $app.querySelectorAll("[data-action='delete-post']").forEach(btn => {
      btn.addEventListener("click", () => doDeletePost(btn.getAttribute("data-id")));
    });

    renderAuthUI();
  } catch (e) {
    $app.innerHTML = `<div class="card">Chyba: <b>${escapeHtml(e.message)}</b></div>`;
    renderAuthUI();
  }
}

function renderLogin() {
  $app.innerHTML = `
    <h1>Login</h1>
    <div class="card">
      <form id="loginForm">
        <label class="muted">Heslo (to vygenerované při registraci)</label>
        <input name="pass" required type="password" placeholder="••••••••" />
        <div style="height:10px"></div>
        <button class="btn btn--primary" type="submit">Přihlásit</button>
      </form>
      <div class="muted" style="margin-top:10px;">Pozn.: přihlášení vždy zruší staré tokeny (jen 1 aktivní přihlášení).</div>
    </div>
  `;

  document.getElementById("loginForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const pass = String(fd.get("pass") || "");

    try {
      const data = await api("/auth/login", { method: "POST", body: { password: pass } });
      setAuth({ token: data.token, user: data.user });
      renderAuthUI();
      location.hash = "#/";
      showFlash("Přihlášení OK.", "ok");
    } catch (e) {
      showFlash(e.message, "err");
    }
  });
}

function renderRegister() {
  $app.innerHTML = `
    <h1>Registrace</h1>
    <div class="card">
      <form id="regForm">
        <label class="muted">Username</label>
        <input name="username" required minlength="3" placeholder="např. tester1" />
        <div style="height:10px"></div>
        <button class="btn btn--primary" type="submit">Vytvořit účet</button>
      </form>

      <div class="muted" style="margin-top:10px;">
        Účet se vytváří jen pomocí <b>username</b> a backend ti vygeneruje <b>heslo</b>.
      </div>
    </div>
  `;

  document.getElementById("regForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const username = String(fd.get("username") || "").trim();

    try {
      const data = await api("/auth/register", { method: "POST", body: { username } });

      // Backend vrátí {username, password, token}
      setAuth({ token: data.token, user: { id: null, username: data.username } });
      renderAuthUI();

      // "Password reveal" screen (jen tady)
      $app.innerHTML = `
        <h1>Hotovo ✅</h1>
        <div class="card">
          <p><b>Tohle heslo uvidíš jen jednou.</b> Ulož si ho (např. do správce hesel).</p>
          <div class="card" style="background:rgba(0,0,0,.04); border:1px dashed rgba(0,0,0,.25)">
            <div class="muted">Tvůj tajný klíč (password)</div>
<div class="pwReveal">
  <input id="generatedPassword" class="pwReveal__input" type="password" readonly value="${escapeHtml(data.password)}" />
  <button class="btn pwReveal__btn" type="button" id="btnTogglePw" aria-label="Ukázat/skrýt heslo">👁️</button>
  <button class="btn pwReveal__btn" type="button" id="btnCopyPw" aria-label="Kopírovat heslo">📋</button>
</div>
<div class="muted" style="margin-top:8px;">Tip: klikni na 👁️ pro zobrazení nebo na 📋 pro zkopírování.</div>
          </div>
          <div class="row" style="gap:8px; margin-top:12px; flex-wrap:wrap;">
            <a class="btn btn--primary" href="#/">Pokračovat na posty</a>
            <a class="btn" href="#/login">Přejít na login</a>
          </div>
        </div>
      `;


// Password buttons
const pwInput = document.getElementById("generatedPassword");
const btnTogglePw = document.getElementById("btnTogglePw");
const btnCopyPw = document.getElementById("btnCopyPw");

if (btnTogglePw && pwInput) {
  btnTogglePw.addEventListener("click", () => {
    pwInput.type = pwInput.type === "password" ? "text" : "password";
  });
}

if (btnCopyPw && pwInput) {
  btnCopyPw.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pwInput.value);
      showFlash("Heslo zkopírováno do schránky.", "ok");
    } catch {
      // Fallback
      pwInput.type = "text";
      pwInput.select();
      document.execCommand("copy");
      pwInput.type = "password";
      showFlash("Heslo zkopírováno.", "ok");
    }
  });
}

      // doplníme user_id přes /auth/me (pokud token už funguje)
      try {
        const me = await api("/auth/me", { auth: true });
        setAuth({ token: getToken(), user: me });
        renderAuthUI();
      } catch { /* ignore */ }

    } catch (e) {
      showFlash(e.message, "err");
    }
  });
}

function renderNewPost() {
  if (!isAuthed()) {
    location.hash = "#/login";
    showFlash("Musíš se přihlásit.", "err");
    return;
  }

  $app.innerHTML = `
    <div class="row" style="justify-content:space-between; align-items:flex-end;">
      <h1>Nový post</h1>
      <a class="btn" href="#/">← Zpět</a>
    </div>

    <div class="card">
      <form id="newPostForm">
        <label class="muted">Nadpis</label>
        <input name="title" required minlength="5" maxlength="255" placeholder="min 5 znaků" />
        <div style="height:10px"></div>
        <label class="muted">Text</label>
        <textarea name="body" required minlength="5" maxlength="8191" placeholder="Text…"></textarea>
        <div style="height:10px"></div>
        <button class="btn btn--primary" type="submit">Vytvořit</button>
      </form>
    </div>
  `;

  document.getElementById("newPostForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const title = String(fd.get("title") || "").trim();
    const body = String(fd.get("body") || "").trim();

    try {
      const created = await api("/posts", { method: "POST", auth: true, body: { title, body } });
      const id = created?.data?.id;
      location.hash = id ? `#/post/${encodeURIComponent(id)}` : "#/";
      showFlash("Příspěvek vytvořen.", "ok");
    } catch (e) {
      showFlash(e.message, "err");
    }
  });
}

async function renderPostDetail(id) {
  $app.innerHTML = `
    <h1>Post #${escapeHtml(id)}</h1>
    <div class="card muted">Načítám…</div>
  `;

  try {
    const postWrap = await api(`/posts/${encodeURIComponent(id)}`, { auth: isAuthed() });
    const post = postWrap?.data;
    const commentsWrap = await api(`/posts/${encodeURIComponent(id)}/comments`, { auth: isAuthed() });
    const comments = commentsWrap?.data ?? [];

    const currentUserId = getUserId();
    const isMinePost = currentUserId != null && post?.user?.id === currentUserId;

    const editedPost = isEdited(post?.created_at, post?.updated_at);

    $app.innerHTML = `
      <div class="row" style="justify-content:space-between; align-items:flex-end;">
        <div>
          <h1>${escapeHtml(post?.title ?? "")}</h1>
          <div class="thread__meta muted">
            <span class="pill">#${escapeHtml(post?.id ?? id)}</span>
            <span class="pill pill--user">${avatarImg(post?.user?.username, 18)}${escapeHtml(post?.user?.username ?? "")}</span>
            <span class="pill" title="${escapeHtml(fmtDate(post?.created_at))}">${escapeHtml(timeAgo(post?.created_at))}${editedPost ? " • Edited" : ""}</span>
            <span class="pill">💬 ${escapeHtml(post?.comments_count ?? comments.length)}</span>
            ${renderVotes({ kind: "post", id: post?.id ?? id, upvotes_count: post?.upvotes_count, downvotes_count: post?.downvotes_count, user_reaction: post?.user_reaction })}
          </div>
        </div>
        <a class="btn" href="#/">← Zpět</a>
      </div>

      <div class="card">
        <p class="content" style="white-space:pre-wrap">${escapeHtml(post?.body ?? "")}</p>
        ${isMinePost ? `
          <div class="row" style="justify-content:flex-end; margin-top:10px; gap:8px;">
            <button class="btn" id="btnEditPost">Upravit</button>
            <button class="btn btn--danger" id="btnDeletePost">Smazat</button>
          </div>
        ` : ""}
      </div>

      <h2>Komentáře</h2>
      <div class="list">
        ${comments.map(c => {
          const edited = isEdited(c.created_at, c.updated_at);
          const isMine = currentUserId != null && c?.user?.id === currentUserId;
          return `
            <div class="card">
              <div class="thread__meta muted">
                <span class="pill">#${escapeHtml(c.id)}</span>
                <span class="pill pill--user">${avatarImg(c?.user?.username, 18)}${escapeHtml(c?.user?.username ?? "")}</span>
                <span class="pill" title="${escapeHtml(fmtDate(c.created_at))}">${escapeHtml(timeAgo(c.created_at))}${edited ? " • Edited" : ""}</span>
                ${renderVotes({ kind: "comment", id: c.id, upvotes_count: c.upvotes_count, downvotes_count: c.downvotes_count, user_reaction: c.user_reaction })}
              </div>
              <p class="content" style="margin-top:10px; white-space:pre-wrap">${escapeHtml(c.body)}</p>
              ${isMine ? `
                <div class="row" style="justify-content:flex-end; margin-top:10px; gap:8px;">
                  <button class="btn" data-action="edit-comment" data-id="${escapeHtml(c.id)}">Upravit</button>
                  <button class="btn btn--danger" data-action="delete-comment" data-id="${escapeHtml(c.id)}">Smazat</button>
                </div>
              ` : ""}
            </div>
          `;
        }).join("")}
        ${comments.length === 0 ? `<div class="card muted">Zatím žádné komentáře.</div>` : ""}
      </div>

      <div class="card" id="commentBox"></div>
    `;

    if (isMinePost) {
      document.getElementById("btnEditPost").addEventListener("click", () => openEditPost(id, post));
      document.getElementById("btnDeletePost").addEventListener("click", () => doDeletePost(id));
    }

    $app.querySelectorAll("[data-action='edit-comment']").forEach(btn => {
      btn.addEventListener("click", () => openEditComment(btn.getAttribute("data-id"), id));
    });
    $app.querySelectorAll("[data-action='delete-comment']").forEach(btn => {
      btn.addEventListener("click", () => doDeleteComment(btn.getAttribute("data-id"), id));
    });

    renderCommentBox(id);
    renderAuthUI();
  } catch (e) {
    $app.innerHTML = `<div class="card">Chyba: <b>${escapeHtml(e.message)}</b></div>`;
    renderAuthUI();
  }
}

function renderCommentBox(postId) {
  const box = document.getElementById("commentBox");
  if (!box) return;

  if (!isAuthed()) {
    box.innerHTML = `
      <div class="muted">Pro přidání komentáře se přihlas.</div>
      <a class="btn btn--primary" href="#/login">Login</a>
    `;
    return;
  }

  box.innerHTML = `
    <h3 style="margin-top:0">Přidat komentář</h3>
    <form id="commentForm">
      <textarea name="body" required minlength="2" maxlength="2000" placeholder="Komentář…"></textarea>
      <div style="height:10px"></div>
      <button class="btn btn--primary" type="submit">Odeslat</button>
    </form>
  `;

  document.getElementById("commentForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const body = String(fd.get("body") || "").trim();

    try {
      await api(`/posts/${encodeURIComponent(postId)}/comments`, { method: "POST", auth: true, body: { body } });
      showFlash("Komentář přidán.", "ok");
      renderPostDetail(postId);
    } catch (e) {
      showFlash(e.message, "err");
    }
  });
}

// ---- Mutations (edit/delete) ----

async function openEditPost(id, existingPost = null) {
  if (!isAuthed()) return;

  let post = existingPost;
  try {
    if (!post) {
      const wrap = await api(`/posts/${encodeURIComponent(id)}`, { auth: isAuthed() });
      post = wrap?.data;
    }
  } catch (e) {
    showFlash(e.message, "err");
    return;
  }

  const currentTitle = String(post?.title ?? "");
  const currentBody = String(post?.body ?? "");

  const contentHtml = `
    <form id="modalForm" class="modal-form">
      <label class="muted">Nadpis <span class="muted" style="font-weight:400;">(volitelné)</span></label>
      <input name="title" type="text" maxlength="255" value="${escapeHtml(currentTitle)}" />
      <div style="height:10px"></div>
      <label class="muted">Text</label>
      <textarea name="body" required minlength="1" maxlength="8191">${escapeHtml(currentBody)}</textarea>
    </form>
  `;

  openModal({
    title: "Upravit příspěvek",
    contentHtml,
    submitText: "Uložit",
    onSubmit: async (fd) => {
      const titleRaw = String(fd.get("title") ?? "").trim();
      const bodyRaw = String(fd.get("body") ?? "").trim();
      const title = titleRaw || currentTitle.trim();

      if (!bodyRaw) {
        showFlash("Text nesmí být prázdný.", "err");
        return false;
      }

      try {
        await api(`/posts/${encodeURIComponent(id)}`, { method: "PUT", auth: true, body: { title, body: bodyRaw } });
        showFlash("Příspěvek upraven.", "ok");
        // refresh current view
        if ((location.hash || "").startsWith(`#/post/${id}`)) renderPostDetail(id);
        else renderPosts();
        return true;
      } catch (e) {
        showFlash(e.message, "err");
        return false;
      }
    }
  });
}

async function doDeletePost(id) {
  if (!isAuthed()) return;
  if (!confirm("Opravdu smazat příspěvek? (smažou se i komentáře)")) return;

  try {
    await api(`/posts/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
    showFlash("Příspěvek smazán.", "ok");
    location.hash = "#/";
  } catch (e) {
    showFlash(e.message, "err");
  }
}

async function openEditComment(commentId, postId = null) {
  if (!isAuthed()) return;

  // Prefill text
  let current = "";
  try {
    const wrap = await api(`/comments/${encodeURIComponent(commentId)}`);
    current = String(wrap?.data?.body ?? "");
  } catch { /* ignore */ }

  const contentHtml = `
    <form id="modalForm" class="modal-form">
      <label class="muted">Text</label>
      <textarea name="body" required minlength="1" maxlength="8191">${escapeHtml(current)}</textarea>
    </form>
  `;

  openModal({
    title: "Upravit komentář",
    contentHtml,
    submitText: "Uložit",
    onSubmit: async (fd) => {
      const bodyRaw = String(fd.get("body") ?? "").trim();
      if (!bodyRaw) {
        showFlash("Text nesmí být prázdný.", "err");
        return false;
      }

      try {
        await api(`/comments/${encodeURIComponent(commentId)}`, { method: "PUT", auth: true, body: { body: bodyRaw } });
        showFlash("Komentář upraven.", "ok");
        if (postId) renderPostDetail(postId);
        else route();
        return true;
      } catch (e) {
        showFlash(e.message, "err");
        return false;
      }
    },
  });
}

async function doDeleteComment(commentId, postId) {
  if (!isAuthed()) return;
  if (!confirm("Opravdu smazat komentář?")) return;

  try {
    await api(`/comments/${encodeURIComponent(commentId)}`, { method: "DELETE", auth: true });
    showFlash("Komentář smazán.", "ok");
    renderPostDetail(postId);
  } catch (e) {
    showFlash(e.message, "err");
  }
}

function renderNotFound() {
  $app.innerHTML = `
    <h1>404</h1>
    <div class="card">Tahle stránka neexistuje. <a href="#/">Zpět</a></div>
  `;
}

// Init: pokud mám token, ověřím /auth/me (jinak token smažu)
(async function init() {
  renderAuthUI();

  if (getToken()) {
    try {
      const me = await api("/auth/me", { auth: true });
      setAuth({ token: getToken(), user: me });
    } catch {
      clearAuth();
    }
  }

  renderAuthUI();
  route();
})();
