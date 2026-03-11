import { api, getToken, setAuth, clearAuth, getUsername, getUserId } from "./api.js";

const $app = document.getElementById("app");
const $flash = document.getElementById("flash");

const $authStatus = document.getElementById("authStatus");
const $btnLogout = document.getElementById("btnLogout");
const $btnLoginLink = document.getElementById("btnLoginLink");
const $btnRegisterLink = document.getElementById("btnRegisterLink");
const $btnNavToggle = document.getElementById("btnNavToggle");
const $mainNav = document.getElementById("mainNav");
const $mainAuth = document.getElementById("mainAuth");

/* ---------------- Cookie consent + UTM tracking ----------------
   - Show banner on first visit
   - If accepted:
     - store consent cookie
     - if URL has utm_* → store into cookies and POST to /api/v1/track (no auth, fire-and-forget)
*/

function getCookie(name) {
  const m = document.cookie.match(
    new RegExp(
      "(?:^|; )" +
        name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, "\\$1") +
        "=([^;]*)"
    )
  );
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name, value, maxAgeSeconds = 60 * 60 * 24 * 365) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; path=/; max-age=${maxAgeSeconds}`;
}

function showCookieBanner() {
  const banner = document.getElementById("cookieBanner");
  if (!banner) return;
  banner.style.display = "block";
}

function hideCookieBanner() {
  const banner = document.getElementById("cookieBanner");
  if (!banner) return;
  banner.style.display = "none";
}

function readUtmFromUrl() {
  const params = new URLSearchParams(window.location.search || "");
  const utm = {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
  };
  if (!utm.utm_source && !utm.utm_medium && !utm.utm_campaign) return null;

  Object.keys(utm).forEach((k) => {
    if (!utm[k]) delete utm[k]; // keep only present fields (all optional)
  });
  return utm;
}

function cleanUtmFromUrl() {
  const params = new URLSearchParams(window.location.search || "");
  let changed = false;
  ["utm_source", "utm_medium", "utm_campaign"].forEach((k) => {
    if (params.has(k)) {
      params.delete(k);
      changed = true;
    }
  });
  if (!changed) return;

  const qs = params.toString();
  const newUrl =
    window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
  history.replaceState(null, "", newUrl);
}

function saveUtmToCookies(utm) {
  const month = 60 * 60 * 24 * 30;
  if (utm.utm_source) setCookie("utm_source", utm.utm_source, month);
  if (utm.utm_medium) setCookie("utm_medium", utm.utm_medium, month);
  if (utm.utm_campaign) setCookie("utm_campaign", utm.utm_campaign, month);
}

function sendUtmToBackend(utm) {
  fetch("/api/v1/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(utm),
  }).catch(() => {});
}

function maybeTrackUtm() {
  // prevent spamming on refresh within same session
  if (sessionStorage.getItem("utm_sent") === "1") return;

  const utm = readUtmFromUrl();
  if (!utm) return;

  saveUtmToCookies(utm);
  sendUtmToBackend(utm);
  sessionStorage.setItem("utm_sent", "1");

  cleanUtmFromUrl();
}

function initCookieConsent() {
  const consent = getCookie("cookie_consent"); // "accepted" | "declined" | null
  const acceptBtn = document.getElementById("acceptCookies");
  const declineBtn = document.getElementById("declineCookies");

  if (!consent) {
    showCookieBanner();

    acceptBtn?.addEventListener("click", () => {
      setCookie("cookie_consent", "accepted", 60 * 60 * 24 * 365);
      hideCookieBanner();
      maybeTrackUtm();
    });

    declineBtn?.addEventListener("click", () => {
      setCookie("cookie_consent", "declined", 60 * 60 * 24 * 365);
      hideCookieBanner();
    });

    return;
  }

  // already decided
  hideCookieBanner();
  if (consent === "accepted") {
    maybeTrackUtm();
  }
}

/* ---------------- Helpers ---------------- */

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showFlash(msg, type = "ok") {
  if (!$flash) return;
  $flash.className = "flash " + (type === "err" ? "flash--err" : "flash--ok");
  $flash.textContent = msg;
  $flash.style.display = "block";
  setTimeout(() => {
    $flash.style.display = "none";
  }, 3000);
}

function isAuthed() {
  return Boolean(getToken());
}

function resolveAuthor(obj) {
  return (
    obj?.author_username ||
    obj?.username ||
    obj?.user?.username ||
    obj?.author?.username ||
    "unknown"
  );
}

function avatarUrl(name) {
  return `https://avatars.laravel.cloud/${encodeURIComponent(String(name || "user").trim())}`;
}

// Czech "před X ..."
function timeAgo(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (!Number.isFinite(diffSec) || diffSec < 0) return "";

  const forms = (n, one, few, many) => {
    if (n % 100 >= 11 && n % 100 <= 14) return many;
    if (n % 10 === 1) return one;
    if (n % 10 >= 2 && n % 10 <= 4) return few;
    return many;
  };

  const units = [
    { s: 31536000, one: "rokem", few: "roky", many: "lety" },
    { s: 2592000, one: "měsícem", few: "měsíci", many: "měsíci" },
    { s: 86400, one: "dnem", few: "dny", many: "dny" },
    { s: 3600, one: "hodinou", few: "hodinami", many: "hodinami" },
    { s: 60, one: "minutou", few: "minutami", many: "minutami" },
  ];

  for (const u of units) {
    const n = Math.floor(diffSec / u.s);
    if (n >= 1) return `před ${n} ${forms(n, u.one, u.few, u.many)}`;
  }

  return "před chvílí";
}



function closeMobileNav() {
  document.body.classList.remove("nav-open");
  $btnNavToggle?.setAttribute("aria-expanded", "false");
}

function toggleMobileNav() {
  const willOpen = !document.body.classList.contains("nav-open");
  document.body.classList.toggle("nav-open", willOpen);
  $btnNavToggle?.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

function renderAuthUI() {
  const username = getUsername();
  if (username) {
    $authStatus.textContent = `přihlášen jako ${username}`;
    $btnLogout.style.display = "inline-flex";
    $btnLoginLink.style.display = "none";
    $btnRegisterLink.style.display = "none";
    document
      .querySelectorAll(".auth-only")
      .forEach((el) => (el.style.display = "inline-flex"));
  } else {
    $authStatus.textContent = "Nepřihlášen";
    $btnLogout.style.display = "none";
    $btnLoginLink.style.display = "inline-flex";
    $btnRegisterLink.style.display = "inline-flex";
    document
      .querySelectorAll(".auth-only")
      .forEach((el) => (el.style.display = "none"));
  }
}

/* ---------------- Topbar actions ---------------- */

$btnNavToggle?.addEventListener("click", toggleMobileNav);
window.addEventListener("hashchange", closeMobileNav);

document.getElementById("btnTheme")?.addEventListener("click", () => {
  const root = document.documentElement;
  const isDark = root.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

$btnLogout?.addEventListener("click", async () => {
  try {
    await api("/auth/logout", { method: "POST", auth: true });
  } catch {}
  clearAuth();
  renderAuthUI();
  location.hash = "#/login";
  showFlash("Odhlášeno.", "ok");
});

/* ---------------- Router ---------------- */

function route() {
  closeMobileNav();
  const hash = location.hash || "#/";
  const [path, queryString] = hash.slice(1).split("?");
  const parts = path.split("/").filter(Boolean);
  const qs = new URLSearchParams(queryString || "");

  if (parts.length === 0)
    return renderPosts({ page: Number(qs.get("page") || 1) });

  if (parts[0] === "login") return renderLogin();
  if (parts[0] === "register") return renderRegister();
  if (parts[0] === "new-post") return renderNewPost();
  if (parts[0] === "post" && parts[1]) return renderPostDetail(parts[1], { page: Number(qs.get("page") || 1) });

  return renderNotFound();
}

window.addEventListener("hashchange", route);

/* ---------------- Voting (shared handler) ---------------- */

async function handleVoteClick({ kind, id, type, rerender }) {
  if (!isAuthed()) return showFlash("Musíš se přihlásit.", "err");

  try {
    if (kind === "post") {
      await api(`/posts/${encodeURIComponent(id)}/reactions`, {
        method: "POST",
        auth: true,
        body: { type },
      });
    } else {
      await api(`/comments/${encodeURIComponent(id)}/reactions`, {
        method: "POST",
        auth: true,
        body: { type },
      });
    }
    await rerender();
  } catch (e) {
    showFlash(e.message, "err");
  }
}

/* ---------------- Views ---------------- */

async function renderPosts({ page = 1 } = {}) {
  $app.innerHTML = `
    <div class="row" style="justify-content:space-between; align-items:flex-end;">
      <div>
        <h1>Posty</h1>
        <div class="muted">Veřejné čtení • Všechny hanlivé nebo příspěvky, které porušují zákon, budou potrestány</div>
      </div>
    </div>
    <div class="card muted">Načítám…</div>
  `;

  try {
    const perPage = 10;
    const payload = await api(
      `/posts?per_page=${perPage}&page=${encodeURIComponent(page)}`,
      { auth: isAuthed() }
    );

    const posts = payload?.data ?? [];
    const meta = payload?.meta ?? {};

    if (!posts.length) {
      $app.innerHTML = `
        <h1>Posty</h1>
        <div class="card muted">Zatím žádné příspěvky.</div>
      `;
      renderAuthUI();
      return;
    }

    const pager = `
      <div class="row" style="justify-content:space-between; margin-top:12px;">
        <a class="btn" href="#/?page=${Math.max(
          1,
          (meta.current_page || 1) - 1
        )}">← Předchozí</a>
        <div class="muted">Strana ${(meta.current_page || 1)} / ${
      meta.last_page || 1
    }</div>
        <a class="btn" href="#/?page=${Math.min(
          meta.last_page || 1,
          (meta.current_page || 1) + 1
        )}">Další →</a>
      </div>
    `;

    $app.innerHTML = `
      <div class="list">
        ${posts
          .map((p) => {
            const ur = p.user_reaction;
            const author = resolveAuthor(p);

            return `
            <div class="card">
              <div class="row" style="justify-content:space-between; align-items:flex-start;">
                <div style="flex:1">
                  <a href="#/post/${encodeURIComponent(
                    p.id
                  )}" style="text-decoration:none; color:inherit;">
                    <h2 style="margin:0 0 6px 0">${escapeHtml(p.title)}</h2>
                  </a>

                  <div class="metaRow">
                    <div class="userMeta">
                      <img class="avatar" src="${avatarUrl(author)}" alt="${escapeHtml(author)}" loading="lazy" referrerpolicy="no-referrer" />
                      <div class="muted"><b>${escapeHtml(author)}</b></div>
                    </div>
                    <div class="muted">• ${escapeHtml(timeAgo(p.created_at))}</div>
                  </div>
                </div>

                <div class="pill--votes" title="Hlasování">
                  <button class="voteBtn up ${ur === "upvote" ? "active" : ""}"
                    data-action="vote" data-kind="post" data-id="${escapeHtml(
                      p.id
                    )}" data-type="upvote"
                    aria-label="Upvote">▲</button>

                  <span class="voteCount">${Number(p.upvotes_count ?? 0)}</span>

                  <button class="voteBtn down ${
                    ur === "downvote" ? "active" : ""
                  }"
                    data-action="vote" data-kind="post" data-id="${escapeHtml(
                      p.id
                    )}" data-type="downvote"
                    aria-label="Downvote">▼</button>

                  <span class="voteCount">${Number(p.downvotes_count ?? 0)}</span>
                </div>
              </div>

              <div style="margin-top:10px; white-space:pre-wrap;">${escapeHtml(
                p.body || ""
              )}</div>

              ${
                isAuthed() && Number(getUserId()) === Number(p.user_id)
                  ? `
                <div class="row" style="justify-content:flex-end; margin-top:10px; gap:8px;">
                  <button class="btn" data-action="edit-post" data-id="${escapeHtml(
                    p.id
                  )}">Upravit</button>
                  <button class="btn btn--danger" data-action="delete-post" data-id="${escapeHtml(
                    p.id
                  )}">Smazat</button>
                </div>
              `
                  : ""
              }
            </div>
          `;
          })
          .join("")}
      </div>

      ${pager}
    `;

    // bind edit/delete
    $app.querySelectorAll("[data-action='edit-post']").forEach((btn) => {
      btn.addEventListener("click", () =>
        openEditPost(btn.getAttribute("data-id"))
      );
    });

    $app.querySelectorAll("[data-action='delete-post']").forEach((btn) => {
      btn.addEventListener("click", () =>
        doDeletePost(btn.getAttribute("data-id"))
      );
    });

    // voting in list (this was the missing piece!)
    $app.querySelectorAll("[data-action='vote']").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const kind = btn.getAttribute("data-kind");
        const id = btn.getAttribute("data-id");
        const type = btn.getAttribute("data-type");

        await handleVoteClick({
          kind,
          id,
          type,
          rerender: () => renderPosts({ page }),
        });
      });
    });

    renderAuthUI();
  } catch (e) {
    $app.innerHTML = `<div class="card">Chyba: <b>${escapeHtml(
      e.message
    )}</b></div>`;
    renderAuthUI();
  }
}

function renderLogin() {
  $app.innerHTML = `
    <h1>Login</h1>
    <div class="card">
      <form id="loginForm">

        <label class="muted">Heslo (to vygenerované při registraci)</label>

        <div class="pwReveal">
          <input
            id="loginPassword"
            class="pwReveal__input"
            type="password"
            name="password"
            required
            minlength="3"
            placeholder="vložit heslo"
          />

          <button class="btn pwReveal__btn" type="button" id="btnToggleLoginPw" aria-label="Ukázat/skrýt heslo">
            👁️
          </button>

          <button class="btn pwReveal__btn" type="button" id="btnCopyLoginPw" aria-label="Kopírovat heslo">
            📋
          </button>
        </div>

        <div style="height:10px"></div>

        <button class="btn btn--primary" type="submit">
          Přihlásit
        </button>

      </form>
    </div>
  `;

  const pwInput = document.getElementById("loginPassword");
  const btnToggle = document.getElementById("btnToggleLoginPw");
  const btnCopy = document.getElementById("btnCopyLoginPw");

  btnToggle?.addEventListener("click", () => {
    pwInput.type = pwInput.type === "password" ? "text" : "password";
  });

  btnCopy?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pwInput.value);
      showFlash("Heslo zkopírováno.", "ok");
    } catch {
      pwInput.select();
      document.execCommand("copy");
      showFlash("Heslo zkopírováno.", "ok");
    }
  });

  document.getElementById("loginForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const password = pwInput.value.trim();

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: { password },
      });

      setAuth({ token: data.token, user: data.user });

      renderAuthUI();
      showFlash("Přihlášení OK.", "ok");
      location.hash = "#/";
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
      const data = await api("/auth/register", {
        method: "POST",
        body: { username },
      });

      setAuth({ token: data.token, user: { id: null, username: data.username } });
      renderAuthUI();

      $app.innerHTML = `
        <h1>Hotovo ✅</h1>
        <div class="card">
          <p><b>Tohle heslo uvidíš jen jednou.</b> Ulož si ho (např. do správce hesel).</p>

          <div class="card" style="background:rgba(0,0,0,.04); border:1px dashed rgba(0,0,0,.25)">
            <div class="muted">Tvůj tajný klíč (password)</div>

            <div class="pwReveal">
              <input id="generatedPassword" class="pwReveal__input" type="password" readonly value="${escapeHtml(
                data.password
              )}" />

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

      const pwInput = document.getElementById("generatedPassword");
      const btnTogglePw = document.getElementById("btnTogglePw");
      const btnCopyPw = document.getElementById("btnCopyPw");

      btnTogglePw?.addEventListener("click", () => {
        if (!pwInput) return;
        pwInput.type = pwInput.type === "password" ? "text" : "password";
      });

      btnCopyPw?.addEventListener("click", async () => {
        if (!pwInput) return;
        try {
          await navigator.clipboard.writeText(pwInput.value);
          showFlash("Heslo zkopírováno do schránky.", "ok");
        } catch {
          pwInput.type = "text";
          pwInput.select();
          document.execCommand("copy");
          pwInput.type = "password";
          showFlash("Heslo zkopírováno.", "ok");
        }
      });

      // optionally refresh auth/me if backend supports
      try {
        const me = await api("/auth/me", { auth: true });
        setAuth({ token: getToken(), user: me });
        renderAuthUI();
      } catch {}
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
      const created = await api("/posts", {
        method: "POST",
        auth: true,
        body: { title, body },
      });
      const id = created?.data?.id;
      location.hash = id ? `#/post/${encodeURIComponent(id)}` : "#/";
      showFlash("Příspěvek vytvořen.", "ok");
    } catch (e) {
      showFlash(e.message, "err");
    }
  });
}

async function renderPostDetail(id, { page = 1 } = {}) {
  $app.innerHTML = `<div class="card muted">Načítám…</div>`;

  try {
    const postWrap = await api(`/posts/${encodeURIComponent(id)}`, {
      auth: isAuthed(),
    });
    const p = postWrap?.data;

    const commentsWrap = await api(`/posts/${encodeURIComponent(id)}/comments?page=${encodeURIComponent(page)}&per_page=8`, {
      auth: isAuthed(),
    });
    const comments = commentsWrap?.data ?? [];
    const commentsMeta = commentsWrap?.meta ?? {};

    const ur = p?.user_reaction;
    const author = resolveAuthor(p);

    $app.innerHTML = `
      <div class="row" style="justify-content:space-between; align-items:flex-end;">
        <a class="btn" href="#/">← Zpět</a>

        <div class="pill--votes" title="Hlasování">
          <button class="voteBtn up ${ur === "upvote" ? "active" : ""}"
            data-action="vote" data-kind="post" data-id="${escapeHtml(p.id)}" data-type="upvote">▲</button>
          <span class="voteCount">${Number(p.upvotes_count ?? 0)}</span>

          <button class="voteBtn down ${ur === "downvote" ? "active" : ""}"
            data-action="vote" data-kind="post" data-id="${escapeHtml(p.id)}" data-type="downvote">▼</button>
          <span class="voteCount">${Number(p.downvotes_count ?? 0)}</span>
        </div>
      </div>

      <div class="card" style="margin-top:12px;">
        <h1 style="margin-top:0">${escapeHtml(p.title)}</h1>

        <div class="metaRow">
          <div class="userMeta">
            <img class="avatar" src="${avatarUrl(author)}" alt="${escapeHtml(author)}" loading="lazy" referrerpolicy="no-referrer" />
            <div class="muted" <b>${escapeHtml(author)}</b></div>
          </div>
          <div class="muted">• ${escapeHtml(timeAgo(p.created_at))}</div>
        </div>

        <div style="margin-top:12px; white-space:pre-wrap;">${escapeHtml(
          p.body || ""
        )}</div>

        ${
          isAuthed() && Number(getUserId()) === Number(p.user_id)
            ? `
          <div class="row" style="justify-content:flex-end; margin-top:10px; gap:8px;">
            <button class="btn" data-action="edit-post" data-id="${escapeHtml(
              p.id
            )}">Upravit</button>
            <button class="btn btn--danger" data-action="delete-post" data-id="${escapeHtml(
              p.id
            )}">Smazat</button>
          </div>
        `
            : ""
        }
      </div>

      <div class="card" style="margin-top:12px;">
        <h2 style="margin-top:0">Komentáře</h2>

        ${
          comments.length
            ? comments
                .map((c) => {
                  const cur = c.user_reaction;
                  const cauthor = resolveAuthor(c);

                  return `
            <div class="card" style="margin-top:10px;">
              <div class="row" style="justify-content:space-between; align-items:flex-start;">
                <div>
                  <div class="metaRow">
                    <div class="userMeta">
                      <img class="avatar" src="${avatarUrl(cauthor)}" alt="${escapeHtml(cauthor)}" loading="lazy" referrerpolicy="no-referrer" />
                      <div class="muted"><b>${escapeHtml(cauthor)}</b></div>
                    </div>
                    <div class="muted">• ${escapeHtml(timeAgo(c.created_at))}</div>
                  </div>
                </div>

                <div class="pill--votes" title="Hlasování">
                  <button class="voteBtn up ${
                    cur === "upvote" ? "active" : ""
                  }" data-action="vote" data-kind="comment" data-id="${escapeHtml(
                    c.id
                  )}" data-type="upvote">▲</button>
                  <span class="voteCount">${Number(c.upvotes_count ?? 0)}</span>

                  <button class="voteBtn down ${
                    cur === "downvote" ? "active" : ""
                  }" data-action="vote" data-kind="comment" data-id="${escapeHtml(
                    c.id
                  )}" data-type="downvote">▼</button>
                  <span class="voteCount">${Number(c.downvotes_count ?? 0)}</span>
                </div>
              </div>

              <div style="margin-top:10px; white-space:pre-wrap;">${escapeHtml(
                c.body || ""
              )}</div>
            </div>
          `;
                })
                .join("")
            : `<div class="muted">Zatím žádné komentáře.</div>`
        }

        ${comments.length ? `
          <div class="row commentsPager" style="justify-content:space-between; margin-top:12px;">
            <a class="btn ${Number(commentsMeta.page || commentsMeta.current_page || 1) <= 1 ? "is-disabled" : ""}" href="#/post/${encodeURIComponent(id)}?page=${Math.max(1, Number(commentsMeta.page || commentsMeta.current_page || 1) - 1)}">← Předchozí</a>
            <div class="muted">Komentáře ${Number(commentsMeta.page || commentsMeta.current_page || 1)} / ${Number(commentsMeta.last_page || 1)}</div>
            <a class="btn ${Number(commentsMeta.page || commentsMeta.current_page || 1) >= Number(commentsMeta.last_page || 1) ? "is-disabled" : ""}" href="#/post/${encodeURIComponent(id)}?page=${Math.min(Number(commentsMeta.last_page || 1), Number(commentsMeta.page || commentsMeta.current_page || 1) + 1)}">Další →</a>
          </div>
        ` : ""}

        ${
          isAuthed()
            ? `
          <div style="height:14px"></div>
          <form id="newCommentForm">
            <label class="muted">Napsat komentář</label>
            <textarea name="body" required minlength="2" maxlength="8191" placeholder="Komentář…"></textarea>
            <div style="height:10px"></div>
            <button class="btn btn--primary" type="submit">Přidat</button>
          </form>
        `
            : `<div class="muted">Pro psaní komentářů se přihlas.</div>`
        }
      </div>
    `;

    // edit/delete
    $app.querySelector("[data-action='edit-post']")?.addEventListener("click", (e) => {
      const pid = e.currentTarget.getAttribute("data-id");
      openEditPost(pid);
    });

    $app.querySelector("[data-action='delete-post']")?.addEventListener("click", (e) => {
      const pid = e.currentTarget.getAttribute("data-id");
      doDeletePost(pid);
    });

    // new comment
    document.getElementById("newCommentForm")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const body = String(fd.get("body") || "").trim();

      try {
        await api(`/posts/${encodeURIComponent(id)}/comments`, {
          method: "POST",
          auth: true,
          body: { body },
        });
        showFlash("Komentář přidán.", "ok");
        await renderPostDetail(id, { page });
      } catch (e) {
        showFlash(e.message, "err");
      }
    });

    // voting in detail
    $app.querySelectorAll("[data-action='vote']").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const kind = btn.getAttribute("data-kind");
        const rid = btn.getAttribute("data-id");
        const type = btn.getAttribute("data-type");

        await handleVoteClick({
          kind,
          id: rid,
          type,
          rerender: () => renderPostDetail(id, { page }),
        });
      });
    });

    renderAuthUI();
  } catch (e) {
    $app.innerHTML = `<div class="card">Chyba: <b>${escapeHtml(e.message)}</b></div>`;
    renderAuthUI();
  }
}

function renderNotFound() {
  $app.innerHTML = `
    <h1>404</h1>
    <div class="card">Tahle stránka neexistuje. <a href="#/">Zpět</a></div>
  `;
  renderAuthUI();
}

async function openEditPost(id) {
  if (!isAuthed()) return;

  let current = { title: "", body: "" };
  try {
    const wrap = await api(`/posts/${encodeURIComponent(id)}`);
    current.title = String(wrap?.data?.title ?? "");
    current.body = String(wrap?.data?.body ?? "");
  } catch {}

  $app.innerHTML = `
    <div class="row" style="justify-content:space-between; align-items:flex-end;">
      <h1>Upravit post</h1>
      <a class="btn" href="#/">← Zpět</a>
    </div>

    <div class="card">
      <form id="editPostForm">
        <label class="muted">Nadpis</label>
        <input name="title" required minlength="5" maxlength="255" value="${escapeHtml(
          current.title
        )}" />
        <div style="height:10px"></div>
        <label class="muted">Text</label>
        <textarea name="body" required minlength="5" maxlength="8191">${escapeHtml(
          current.body
        )}</textarea>
        <div style="height:10px"></div>
        <button class="btn btn--primary" type="submit">Uložit</button>
      </form>
    </div>
  `;

  document.getElementById("editPostForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const title = String(fd.get("title") || "").trim();
    const body = String(fd.get("body") || "").trim();

    try {
      await api(`/posts/${encodeURIComponent(id)}`, {
        method: "PUT",
        auth: true,
        body: { title, body },
      });
      showFlash("Uloženo.", "ok");
      location.hash = `#/post/${encodeURIComponent(id)}`;
    } catch (e) {
      showFlash(e.message, "err");
    }
  });
}

async function doDeletePost(id) {
  if (!isAuthed()) return;
  if (!confirm("Opravdu smazat příspěvek? (smažou se i komentáře)")) return;

  try {
    await api(`/posts/${encodeURIComponent(id)}`, {
      method: "DELETE",
      auth: true,
    });
    showFlash("Příspěvek smazán.", "ok");
    location.hash = "#/";
  } catch (e) {
    showFlash(e.message, "err");
  }
}

/* ---------------- init ---------------- */
initCookieConsent();
route();
renderAuthUI();