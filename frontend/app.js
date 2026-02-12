import { api, getToken, setAuth, clearAuth, getUsername } from "./api.js";

const $app = document.getElementById("app");
const $flash = document.getElementById("flash");

const $authStatus = document.getElementById("authStatus");
const $btnLogout = document.getElementById("btnLogout");
const $btnLoginLink = document.getElementById("btnLoginLink");
const $btnRegisterLink = document.getElementById("btnRegisterLink");

function isAuthed() {
  return !!getToken();
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showFlash(message, type = "ok") {
  $flash.className = `flash ${type === "ok" ? "flash--ok" : "flash--err"}`;
  $flash.textContent = message;
  $flash.style.display = "block";
  window.setTimeout(() => ($flash.style.display = "none"), 3200);
}

function renderAuthUI() {
  const authed = isAuthed();
  const user = getUsername();

  $authStatus.textContent = authed ? `přihlášen jako ${user}` : "nepřihlášen";
  $btnLogout.style.display = authed ? "inline-flex" : "none";
  $btnLoginLink.style.display = authed ? "none" : "inline-flex";
  $btnRegisterLink.style.display = authed ? "none" : "inline-flex";

  document.querySelectorAll(".auth-only").forEach(el => {
    el.style.display = authed ? "inline-flex" : "none";
  });
}

$btnLogout.addEventListener("click", () => {
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

  // / -> threads
  if (parts.length === 0) return renderThreads();

  if (parts[0] === "login") return renderLogin();
  if (parts[0] === "register") return renderRegister();
  if (parts[0] === "new-thread") return renderNewThread();
  if (parts[0] === "thread" && parts[1]) return renderThreadDetail(parts[1]);

  return renderNotFound();
}

window.addEventListener("hashchange", route);

// -------- Views --------

async function renderThreads() {
  $app.innerHTML = `
    <h1>Vlákna</h1>
    <div class="card muted">Načítám…</div>
  `;

  try {
    const threads = await api("/threads");

    if (!threads?.length) {
      $app.innerHTML = `
        <h1>Vlákna</h1>
        <div class="card muted">Zatím žádná vlákna.</div>
      `;
      return;
    }

    $app.innerHTML = `
      <h1>Vlákna</h1>
      <div class="list">
        ${threads.map(t => `
          <div class="card">
            <div class="thread__meta">
              <span class="pill">#${escapeHtml(t.id)}</span>
              <span class="pill">${escapeHtml(t.author ?? "")}</span>
              <span class="pill">${escapeHtml(t.created_at ?? "")}</span>
            </div>
            <h3 style="margin-top:10px">
              <a href="#/thread/${encodeURIComponent(t.id)}">${escapeHtml(t.title)}</a>
            </h3>
            <p class="muted">${escapeHtml((t.content ?? "").slice(0, 140))}${(t.content ?? "").length > 140 ? "…" : ""}</p>
          </div>
        `).join("")}
      </div>
    `;
  } catch (e) {
    $app.innerHTML = `<div class="card">Chyba: <b>${escapeHtml(e.message)}</b></div>`;
  }
}

function renderLogin() {
  $app.innerHTML = `
    <h1>Login</h1>
    <div class="card">
      <form id="loginForm">
        <div class="row">
          <div style="flex:1; min-width: 240px;">
            <label class="muted">Username nebo email</label>
            <input name="user" required placeholder="např. pepa / pepa@email.cz" />
          </div>
          <div style="flex:1; min-width: 240px;">
            <label class="muted">Heslo</label>
            <input name="pass" required type="password" placeholder="••••••••" />
          </div>
        </div>
        <div style="height:10px"></div>
        <button class="btn btn--primary" type="submit">Přihlásit</button>
      </form>
      <div class="muted" style="margin-top:10px;">Po loginu se uloží token do localStorage.</div>
    </div>
  `;

  document.getElementById("loginForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const user = String(fd.get("user") || "").trim();
    const pass = String(fd.get("pass") || "");

    try {
      // backend může chtít username/email v jiném poli – uprav si tady
      const data = await api("/auth/login", {
        method: "POST",
        body: { usernameOrEmail: user, password: pass }
      });

      setAuth({ token: data.access_token, username: data.username ?? user });
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
        <div class="row">
          <div style="flex:1; min-width: 240px;">
            <label class="muted">Username</label>
            <input name="username" required minlength="3" placeholder="min 3 znaky" />
          </div>
          <div style="flex:1; min-width: 240px;">
            <label class="muted">Email (volitelné)</label>
            <input name="email" type="email" placeholder="pepa@email.cz" />
          </div>
        </div>
        <div style="height:10px"></div>
        <label class="muted">Heslo</label>
        <input name="password" required minlength="6" type="password" placeholder="min 6 znaků" />
        <div style="height:10px"></div>
        <button class="btn btn--primary" type="submit">Registrovat</button>
      </form>
    </div>
  `;

  document.getElementById("regForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);

    const username = String(fd.get("username") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");

    try {
      await api("/auth/register", {
        method: "POST",
        body: { username, email: email || null, password }
      });
      location.hash = "#/login";
      showFlash("Registrace OK. Teď se přihlas.", "ok");
    } catch (e) {
      showFlash(e.message, "err");
    }
  });
}

function renderNewThread() {
  if (!isAuthed()) {
    location.hash = "#/login";
    showFlash("Musíš se přihlásit.", "err");
    return;
  }

  $app.innerHTML = `
    <h1>Nové vlákno</h1>
    <div class="card">
      <form id="newThreadForm">
        <label class="muted">Nadpis</label>
        <input name="title" required minlength="3" placeholder="např. Jak nasadit Laravel na VPS?" />
        <div style="height:10px"></div>
        <label class="muted">Obsah</label>
        <textarea name="content" required placeholder="Text…"></textarea>
        <div style="height:10px"></div>
        <button class="btn btn--primary" type="submit">Vytvořit</button>
      </form>
    </div>
  `;

  document.getElementById("newThreadForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const title = String(fd.get("title") || "").trim();
    const content = String(fd.get("content") || "").trim();

    try {
      const created = await api("/threads", {
        method: "POST",
        auth: true,
        body: { title, content }
      });
      location.hash = `#/thread/${encodeURIComponent(created.id)}`;
      showFlash("Vlákno vytvořeno.", "ok");
    } catch (e) {
      showFlash(e.message, "err");
    }
  });
}

async function renderThreadDetail(id) {
  $app.innerHTML = `
    <h1>Vlákno #${escapeHtml(id)}</h1>
    <div class="card muted">Načítám…</div>
  `;

  try {
    const thread = await api(`/threads/${encodeURIComponent(id)}`);
    const posts = await api(`/threads/${encodeURIComponent(id)}/posts`);

    $app.innerHTML = `
      <div class="row" style="justify-content:space-between; align-items:flex-end;">
        <div>
          <h1>${escapeHtml(thread.title)}</h1>
          <div class="thread__meta muted">
            <span class="pill">#${escapeHtml(thread.id)}</span>
            <span class="pill">${escapeHtml(thread.author ?? "")}</span>
            <span class="pill">${escapeHtml(thread.created_at ?? "")}</span>
          </div>
        </div>
        <a class="btn" href="#/">← Zpět</a>
      </div>

      <div class="card">
        <p>${escapeHtml(thread.content)}</p>
      </div>



      
      <h2>Příspěvky</h2>
      <div class="list">
        ${(posts?.length ? posts : []).map(p => `
          <div class="card">
            <div class="thread__meta muted">
              <span class="pill">#${escapeHtml(p.id)}</span>
              <span class="pill">${escapeHtml(p.author ?? "")}</span>
              <span class="pill">${escapeHtml(p.created_at ?? "")}</span>
            </div>
            <p style="margin-top:10px">${escapeHtml(p.content)}</p>
          </div>
        `).join("")}
        ${(!posts || posts.length === 0) ? `<div class="card muted">Zatím žádné příspěvky.</div>` : ""}
      </div>

      <div class="card" id="replyBox"></div>
    `;

    renderReplyBox(id);
  } catch (e) {
    $app.innerHTML = `<div class="card">Chyba: <b>${escapeHtml(e.message)}</b></div>`;
  }
}

function renderReplyBox(threadId) {
  const box = document.getElementById("replyBox");
  if (!box) return;

  if (!isAuthed()) {
    box.innerHTML = `
      <div class="muted">Pro přidání příspěvku se přihlas.</div>
      <a class="btn btn--primary" href="#/login">Login</a>
    `;
    return;
  }

  box.innerHTML = `
    <h3 style="margin-top:0">Napsat příspěvek</h3>
    <form id="replyForm">
      <textarea name="content" required placeholder="Odpověď…"></textarea>
      <div style="height:10px"></div>
      <button class="btn btn--primary" type="submit">Odeslat</button>
    </form>
  `;

  document.getElementById("replyForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const content = String(fd.get("content") || "").trim();

    try {
      await api(`/threads/${encodeURIComponent(threadId)}/posts`, {
        method: "POST",
        auth: true,
        body: { content }
      });
      showFlash("Příspěvek přidán.", "ok");
      renderThreadDetail(threadId); // refresh
    } catch (e) {
      showFlash(e.message, "err");
    }
  });
}

function renderNotFound() {
  $app.innerHTML = `
    <h1>404</h1>
    <div class="card">Tahle stránka neexistuje. <a href="#/">Zpět</a></div>
  `;
}

// Init
renderAuthUI();
route();
