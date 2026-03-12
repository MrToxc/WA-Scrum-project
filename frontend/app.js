import {
  api,
  getToken,
  setAuth,
  clearAuth,
  getUsername,
  getUserId,
  isAdmin,
  normalizeVoteState,
  mergeVotedItem,
  getAvatarUrl,
} from "./api.js";

const $app = document.getElementById("app");
const $flash = document.getElementById("flash");

const $authStatus = document.getElementById("authStatus");
const $btnLogout = document.getElementById("btnLogout");
const $btnLoginLink = document.getElementById("btnLoginLink");
const $btnRegisterLink = document.getElementById("btnRegisterLink");
const $btnNavToggle = document.getElementById("btnNavToggle");
const $mainNav = document.getElementById("mainNav");
const $mainAuth = document.getElementById("mainAuth");

function getCookie(name) {
  const m = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)")
  );
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name, value, maxAgeSeconds = 60 * 60 * 24 * 365) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}`;
}
function getUserReaction(entity) {
  return entity?.user_reaction ?? entity?.user_vote ?? null;
}

function renderReactionControls(entity, kind) {
  const ur = getUserReaction(entity);
  return `
    <div class="pill--votes" title="Hlasování" data-vote-box data-kind="${kind}" data-id="${escapeHtml(entity.id)}">
      <button class="voteBtn voteBtn--up ${ur === "upvote" ? "is-active" : ""}" data-action="vote" data-kind="${kind}" data-id="${escapeHtml(entity.id)}" data-type="upvote" aria-label="Upvote">▲</button>
      <span class="voteCount" data-role="upvotes">${Number(entity.upvotes_count ?? 0)}</span>
      <button class="voteBtn voteBtn--down ${ur === "downvote" ? "is-active" : ""}" data-action="vote" data-kind="${kind}" data-id="${escapeHtml(entity.id)}" data-type="downvote" aria-label="Downvote">▼</button>
      <span class="voteCount" data-role="downvotes">${Number(entity.downvotes_count ?? 0)}</span>
    </div>
  `;
}

function showCookieBanner() {
  const banner = document.getElementById("cookieBanner");
  if (banner) banner.style.display = "block";
}

function hideCookieBanner() {
  const banner = document.getElementById("cookieBanner");
  if (banner) banner.style.display = "none";
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
    if (!utm[k]) delete utm[k];
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
  const newUrl = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
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
  if (sessionStorage.getItem("utm_sent") === "1") return;
  const utm = readUtmFromUrl();
  if (!utm) return;
  saveUtmToCookies(utm);
  sendUtmToBackend(utm);
  sessionStorage.setItem("utm_sent", "1");
  cleanUtmFromUrl();
}

function initCookieConsent() {
  const consent = getCookie("cookie_consent");
  const acceptBtn = document.getElementById("acceptCookies");
  const declineBtn = document.getElementById("declineCookies");

  if (!consent) {
    showCookieBanner();

    acceptBtn?.addEventListener("click", () => {
      setCookie("cookie_consent", "accepted");
      hideCookieBanner();
      maybeTrackUtm();
    });

    declineBtn?.addEventListener("click", () => {
      setCookie("cookie_consent", "declined");
      hideCookieBanner();
    });
    return;
  }

  hideCookieBanner();
  if (consent === "accepted") maybeTrackUtm();
}

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
  return obj?.author_username || obj?.username || obj?.user?.username || obj?.author?.username || "unknown";
}

function buildAvatarUrl(author) {
  return getAvatarUrl(author);
}

function normalizeEntity(entity) {
  const normalized = normalizeVoteState(entity || {});
  return {
    ...entity,
    ...normalized,
    user_reaction: normalized.user_vote,
  };
}

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

function getPageMeta(meta) {
  const current = Number(meta?.page || meta?.current_page || 1);
  const last = Number(meta?.last_page || 1);
  return { current, last };
}

function canManageOwnContent(ownerId) {
  return isAuthed() && Number(getUserId()) === Number(ownerId);
}

function canAdminManage() {
  return isAuthed() && isAdmin();
}

function renderReactionControls(entity, kind) {
  const ur = getUserReaction(entity);
  return `
    <div class="pill--votes" title="Hlasování" data-vote-box data-kind="${kind}" data-id="${escapeHtml(entity.id)}">
      <button class="voteBtn voteBtn--up ${ur === "upvote" ? "is-active" : ""}" data-action="vote" data-kind="${kind}" data-id="${escapeHtml(entity.id)}" data-type="upvote" aria-label="Upvote">▲</button>
      <span class="voteCount" data-role="upvotes">${Number(entity.upvotes_count ?? 0)}</span>
      <button class="voteBtn voteBtn--down ${ur === "downvote" ? "is-active" : ""}" data-action="vote" data-kind="${kind}" data-id="${escapeHtml(entity.id)}" data-type="downvote" aria-label="Downvote">▼</button>
      <span class="voteCount" data-role="downvotes">${Number(entity.downvotes_count ?? 0)}</span>
    </div>
  `;
}
function renderAuthor(author) {
  const safeAuthor = escapeHtml(author);
  const avatarUrl = escapeHtml(buildAvatarUrl(author));
  return `
    <div class="userMeta">
      <img class="avatar" src="${avatarUrl}" alt="Avatar uživatele ${safeAuthor}" loading="lazy" referrerpolicy="no-referrer" />
      <div class="muted"><b>${safeAuthor}</b></div>
    </div>
  `;
}

function renderPostActions(post) {
  const own = canManageOwnContent(post.user_id);
  const admin = canAdminManage();
  if (!own && !admin) return "";

  return `
    <div class="row actionRow">
      ${own ? `<button class="btn" data-action="edit-post" data-id="${escapeHtml(post.id)}">Upravit</button>` : ""}
      ${own ? `<button class="btn btn--danger" data-action="delete-post" data-id="${escapeHtml(post.id)}">Smazat</button>` : ""}
      ${admin ? `<button class="btn btn--danger" data-action="admin-delete-post" data-id="${escapeHtml(post.id)}">Admin smazat</button>` : ""}
      ${admin ? `<button class="btn btn--danger" data-action="admin-delete-user" data-id="${escapeHtml(post.user_id)}" data-username="${escapeHtml(resolveAuthor(post))}">Admin smazat uživatele</button>` : ""}
    </div>
  `;
}

function renderCommentActions(comment) {
  const own = canManageOwnContent(comment.user_id);
  const admin = canAdminManage();
  if (!own && !admin) return "";

  return `
    <div class="row actionRow">
      ${own ? `<button class="btn" data-action="edit-comment" data-id="${escapeHtml(comment.id)}" data-body="${escapeHtml(comment.body || "")}">Upravit</button>` : ""}
      ${own ? `<button class="btn btn--danger" data-action="delete-comment" data-id="${escapeHtml(comment.id)}">Smazat</button>` : ""}
      ${admin ? `<button class="btn btn--danger" data-action="admin-delete-comment" data-id="${escapeHtml(comment.id)}">Admin smazat</button>` : ""}
      ${admin ? `<button class="btn btn--danger" data-action="admin-delete-user" data-id="${escapeHtml(comment.user_id)}" data-username="${escapeHtml(resolveAuthor(comment))}">Admin smazat uživatele</button>` : ""}
    </div>
  `;
}

function renderAuthUI() {
  const username = getUsername();
  if (username) {
    $authStatus.textContent = `Přihlášen jako ${username}${isAdmin() ? " • admin" : ""}`;
    $btnLogout.style.display = "inline-flex";
    $btnLoginLink.style.display = "none";
    $btnRegisterLink.style.display = "none";
    document.querySelectorAll(".auth-only").forEach((el) => (el.style.display = "inline-flex"));
  } else {
    $authStatus.textContent = "Nepřihlášen";
    $btnLogout.style.display = "none";
    $btnLoginLink.style.display = "inline-flex";
    $btnRegisterLink.style.display = "inline-flex";
    document.querySelectorAll(".auth-only").forEach((el) => (el.style.display = "none"));
  }
}

$btnNavToggle?.addEventListener("click", toggleMobileNav);
window.addEventListener("hashchange", closeMobileNav);

document.getElementById("btnTheme")?.addEventListener("click", () => {
  const root = document.documentElement;
  const isDarkMode = root.classList.toggle("dark");
  localStorage.setItem("theme", isDarkMode ? "dark" : "light");
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

function route() {
  closeMobileNav();
  const hash = location.hash || "#/";
  const [path, queryString] = hash.slice(1).split("?");
  const parts = path.split("/").filter(Boolean);
  const qs = new URLSearchParams(queryString || "");

  if (parts.length === 0) return renderPosts({ page: Number(qs.get("page") || 1) });
  if (parts[0] === "login") return renderLogin();
  if (parts[0] === "register") return renderRegister();
  if (parts[0] === "new-post") return renderNewPost();
  if (parts[0] === "post" && parts[1]) return renderPostDetail(parts[1], { page: Number(qs.get("page") || 1) });
  return renderNotFound();
}

window.addEventListener("hashchange", route);

function patchVoteBoxOptimistic({ kind, id, type }) {
  const selector = `[data-vote-box][data-kind="${kind}"][data-id="${CSS.escape(String(id))}"]`;
  const boxes = document.querySelectorAll(selector);

  boxes.forEach((box) => {
    const upBtn = box.querySelector('[data-type="upvote"]');
    const downBtn = box.querySelector('[data-type="downvote"]');
    const upCount = box.querySelector('[data-role="upvotes"]');
    const downCount = box.querySelector('[data-role="downvotes"]');
    if (!upBtn || !downBtn || !upCount || !downCount) return;

    let up = Number(upCount.textContent || 0);
    let down = Number(downCount.textContent || 0);

    const wasUp = upBtn.classList.contains("is-active");
    const wasDown = downBtn.classList.contains("is-active");

    if (type === "upvote") {
      if (wasUp) {
        up = Math.max(0, up - 1);
        upBtn.classList.remove("is-active");
      } else {
        up += 1;
        upBtn.classList.add("is-active");

        if (wasDown) {
          down = Math.max(0, down - 1);
          downBtn.classList.remove("is-active");
        }
      }
    }

    if (type === "downvote") {
      if (wasDown) {
        down = Math.max(0, down - 1);
        downBtn.classList.remove("is-active");
      } else {
        down += 1;
        downBtn.classList.add("is-active");

        if (wasUp) {
          up = Math.max(0, up - 1);
          upBtn.classList.remove("is-active");
        }
      }
    }

    upCount.textContent = String(up);
    downCount.textContent = String(down);
  });
}

async function handleVoteClick({ btn, kind, id, type }) {
  if (!isAuthed()) return showFlash("Musíš se přihlásit.", "err");
  if (btn?.dataset.loading === "1") return;

  try {
    if (btn) btn.dataset.loading = "1";

    const path = kind === "post"
      ? `/posts/${encodeURIComponent(id)}/reactions`
      : `/comments/${encodeURIComponent(id)}/reactions`;

    await api(path, {
      method: "POST",
      auth: true,
      body: { type },
    });

    await route();
  } catch (e) {
    showFlash(e.message, "err");
  } finally {
    if (btn) delete btn.dataset.loading;
  }
}

function bindVoteButtons() {
  $app.querySelectorAll("[data-action='vote']").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await handleVoteClick({
        btn,
        kind: btn.getAttribute("data-kind"),
        id: btn.getAttribute("data-id"),
        type: btn.getAttribute("data-type"),
      });
    });
  });
}

async function renderPosts({ page = 1 } = {}) {
  $app.innerHTML = `
    <div class="row pageHead">
      <div>
        <h1>Posty</h1>
        <div class="muted">Veřejné čtení • Porušení pravidel může být moderováno.</div>
      </div>
    </div>
    <div class="card muted">Načítám…</div>
  `;

  try {
    const perPage = 10;
    const payload = await api(`/posts?per_page=${perPage}&page=${encodeURIComponent(page)}`, { auth: isAuthed() });
    const posts = (payload?.data ?? []).map((p) => ({
  ...p,
  user_reaction: p?.user_reaction ?? p?.user_vote ?? null,
}));
    const meta = getPageMeta(payload?.meta ?? {});

    if (!posts.length) {
      $app.innerHTML = `
        <h1>Posty</h1>
        <div class="card muted">Zatím žádné příspěvky.</div>
      `;
      renderAuthUI();
      return;
    }

    $app.innerHTML = `
      <div class="list">
        ${posts.map((p) => {
          const author = resolveAuthor(p);
          return `
            <div class="card postCard">
              <div class="row cardHead">
                <div style="flex:1; min-width:0;">
                  <a href="#/post/${encodeURIComponent(p.id)}" class="postLink">
                    <h2 class="postTitle">${escapeHtml(p.title)}</h2>
                  </a>
                  <div class="metaRow">
                    ${renderAuthor(author)}
                    <div class="muted">• ${escapeHtml(timeAgo(p.created_at))}</div>
                    <div class="muted">• ${Number(p.comments_count ?? 0)} komentářů</div>
                  </div>
                </div>
                ${renderReactionControls(p, "post")}
              </div>

              <div class="postBody postBody--preview">${escapeHtml(p.body || "")}</div>
              <a class="postMoreLink" href="#/post/${encodeURIComponent(p.id)}">Zobrazit celý příspěvek →</a>
              ${renderPostActions(p)}
            </div>
          `;
        }).join("")}
      </div>

      <div class="row pagerRow">
        <a class="btn ${meta.current <= 1 ? "is-disabled" : ""}" href="#/?page=${Math.max(1, meta.current - 1)}">← Předchozí</a>
        <div class="muted">Strana ${meta.current} / ${meta.last}</div>
        <a class="btn ${meta.current >= meta.last ? "is-disabled" : ""}" href="#/?page=${Math.min(meta.last, meta.current + 1)}">Další →</a>
      </div>
    `;

    bindPostListActions(page);
    bindVoteButtons();
    renderAuthUI();
  } catch (e) {
    $app.innerHTML = `<div class="card">Chyba: <b>${escapeHtml(e.message)}</b></div>`;
    renderAuthUI();
  }
}

function bindPostListActions(page) {
  $app.querySelectorAll("[data-action='edit-post']").forEach((btn) => {
    btn.addEventListener("click", () => openEditPost(btn.getAttribute("data-id")));
  });

  $app.querySelectorAll("[data-action='delete-post']").forEach((btn) => {
    btn.addEventListener("click", () => doDeletePost(btn.getAttribute("data-id")));
  });

  $app.querySelectorAll("[data-action='admin-delete-post']").forEach((btn) => {
    btn.addEventListener("click", () => doAdminDeletePost(btn.getAttribute("data-id"), () => renderPosts({ page })));
  });

  $app.querySelectorAll("[data-action='admin-delete-user']").forEach((btn) => {
    btn.addEventListener("click", () => doAdminDeleteUser(btn.getAttribute("data-id"), btn.getAttribute("data-username"), () => renderPosts({ page })));
  });
}

function renderLogin() {
  $app.innerHTML = `
    <h1>Login</h1>
    <div class="card">
      <form id="loginForm">
        <label class="muted">Heslo (vygenerované při registraci)</label>
        <div class="pwReveal">
          <input id="loginPassword" class="pwReveal__input" type="password" name="password" required minlength="3" placeholder="vložit heslo" />
          <button class="btn pwReveal__btn" type="button" id="btnToggleLoginPw" aria-label="Ukázat/skrýt heslo">👁️</button>
          
        </div>
        <div style="height:10px"></div>
        <button class="btn btn--primary" type="submit">Přihlásit</button>
      </form>
    </div>
  `;

  const pwInput = document.getElementById("loginPassword");
  document.getElementById("btnToggleLoginPw")?.addEventListener("click", () => {
    pwInput.type = pwInput.type === "password" ? "text" : "password";
  });

  document.getElementById("btnCopyLoginPw")?.addEventListener("click", async () => {
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
      const data = await api("/auth/login", { method: "POST", body: { password } });
      setAuth({ token: data.token, user: data.user });
      await hydrateAuthFromMe();
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
        <input name="username" required minlength="3" maxlength="50" placeholder="např. tester1" />
        <div style="height:10px"></div>
        <button class="btn btn--primary" type="submit">Vytvořit účet</button>
      </form>
      <div class="muted" style="margin-top:10px;">Účet se vytváří jen pomocí <b>username</b> a backend ti vygeneruje <b>heslo</b>.</div>
    </div>
  `;

  document.getElementById("regForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const username = String(fd.get("username") || "").trim();

    try {
      const data = await api("/auth/register", { method: "POST", body: { username } });
      setAuth({ token: data.token, user: { id: null, username: data.username, is_admin: data.is_admin } });
      renderAuthUI();

      $app.innerHTML = `
        <h1>Hotovo ✅</h1>
        <div class="card">
          <p><b>Tohle heslo uvidíš jen jednou.</b> Ulož si ho.</p>
          <div class="card secretCard">
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

      const pwInput = document.getElementById("generatedPassword");
      document.getElementById("btnTogglePw")?.addEventListener("click", () => {
        pwInput.type = pwInput.type === "password" ? "text" : "password";
      });

      document.getElementById("btnCopyPw")?.addEventListener("click", async () => {
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

      await hydrateAuthFromMe();
      renderAuthUI();
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
    <div class="row pageHead">
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

async function renderPostDetail(id, { page = 1 } = {}) {
  $app.innerHTML = `<div class="card muted">Načítám…</div>`;

  try {
    const postWrap = await api(`/posts/${encodeURIComponent(id)}`, { auth: isAuthed() });
    const p = {
      ...(postWrap?.data || {}),
      user_reaction: postWrap?.data?.user_reaction ?? postWrap?.data?.user_vote ?? null,
    };
    const commentsWrap = await api(`/posts/${encodeURIComponent(id)}/comments?page=${encodeURIComponent(page)}&per_page=10`, { auth: isAuthed() });
    const comments = (commentsWrap?.data ?? []).map((c) => ({
      ...c,
      user_reaction: c?.user_reaction ?? c?.user_vote ?? null,
    }));
    const commentsMeta = getPageMeta(commentsWrap?.meta ?? {});
    const author = resolveAuthor(p);

    $app.innerHTML = `
      <div class="row pageHead">
        <a class="btn" href="#/">← Zpět</a>
        ${renderReactionControls(p, "post")}
      </div>

      <div class="card" style="margin-top:12px;">
        <h1 style="margin-top:0">${escapeHtml(p.title)}</h1>
        <div class="metaRow">
          ${renderAuthor(author)}
          <div class="muted">• ${escapeHtml(timeAgo(p.created_at))}</div>
          <div class="muted">• ${Number(p.comments_count ?? 0)} komentářů</div>
        </div>
        <div class="postBody">${escapeHtml(p.body || "")}</div>
        ${renderPostActions(p)}
      </div>

      <div class="card" style="margin-top:12px;">
        <h2 style="margin-top:0">Komentáře</h2>

        ${comments.length ? comments.map((c) => {
          const cauthor = resolveAuthor(c);
          return `
            <div class="card commentCard">
              <div class="row cardHead">
                <div>
                  <div class="metaRow">
                    ${renderAuthor(cauthor)}
                    <div class="muted">• ${escapeHtml(timeAgo(c.created_at))}</div>
                  </div>
                </div>
                ${renderReactionControls(c, "comment")}
              </div>
              <div class="postBody">${escapeHtml(c.body || "")}</div>
              ${renderCommentActions(c)}
            </div>
          `;
        }).join("") : `<div class="muted">Zatím žádné komentáře.</div>`}

        <div class="row pagerRow ${comments.length ? "" : "hidden"}">
          <a class="btn ${commentsMeta.current <= 1 ? "is-disabled" : ""}" href="#/post/${encodeURIComponent(id)}?page=${Math.max(1, commentsMeta.current - 1)}">← Předchozí</a>
          <div class="muted">Komentáře ${commentsMeta.current} / ${commentsMeta.last}</div>
          <a class="btn ${commentsMeta.current >= commentsMeta.last ? "is-disabled" : ""}" href="#/post/${encodeURIComponent(id)}?page=${Math.min(commentsMeta.last, commentsMeta.current + 1)}">Další →</a>
        </div>

        ${isAuthed() ? `
          <div style="height:14px"></div>
          <form id="newCommentForm">
            <label class="muted">Napsat komentář</label>
            <textarea name="body" required minlength="2" maxlength="2000" placeholder="Komentář…"></textarea>
            <div style="height:10px"></div>
            <button class="btn btn--primary" type="submit">Přidat</button>
          </form>
        ` : `<div class="muted">Pro psaní komentářů se přihlas.</div>`}
      </div>
    `;

    bindDetailActions(id, page);
    bindVoteButtons();
    renderAuthUI();
  } catch (e) {
    $app.innerHTML = `<div class="card">Chyba: <b>${escapeHtml(e.message)}</b></div>`;
    renderAuthUI();
  }
}

function bindDetailActions(postId, page) {
  $app.querySelector("[data-action='edit-post']")?.addEventListener("click", (e) => {
    openEditPost(e.currentTarget.getAttribute("data-id"));
  });

  $app.querySelector("[data-action='delete-post']")?.addEventListener("click", (e) => {
    doDeletePost(e.currentTarget.getAttribute("data-id"));
  });

  $app.querySelector("[data-action='admin-delete-post']")?.addEventListener("click", (e) => {
    doAdminDeletePost(e.currentTarget.getAttribute("data-id"), () => {
      location.hash = "#/";
      return Promise.resolve();
    });
  });

  $app.querySelectorAll("[data-action='admin-delete-comment']").forEach((btn) => {
    btn.addEventListener("click", () => doAdminDeleteComment(btn.getAttribute("data-id"), () => renderPostDetail(postId, { page })));
  });

  $app.querySelectorAll("[data-action='admin-delete-user']").forEach((btn) => {
    btn.addEventListener("click", () => doAdminDeleteUser(btn.getAttribute("data-id"), btn.getAttribute("data-username"), () => {
      location.hash = "#/";
      return Promise.resolve();
    }));
  });

  $app.querySelectorAll("[data-action='edit-comment']").forEach((btn) => {
    btn.addEventListener("click", () => openEditComment(postId, btn.getAttribute("data-id"), btn.getAttribute("data-body"), page));
  });

  $app.querySelectorAll("[data-action='delete-comment']").forEach((btn) => {
    btn.addEventListener("click", () => doDeleteComment(postId, btn.getAttribute("data-id"), page));
  });

  document.getElementById("newCommentForm")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const body = String(fd.get("body") || "").trim();

    try {
      await api(`/posts/${encodeURIComponent(postId)}/comments`, { method: "POST", auth: true, body: { body } });
      showFlash("Komentář přidán.", "ok");
      await renderPostDetail(postId, { page });
    } catch (e) {
      showFlash(e.message, "err");
    }
  });
}

function renderNotFound() {
  $app.innerHTML = `<h1>404</h1><div class="card">Tahle stránka neexistuje. <a href="#/">Zpět</a></div>`;
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
    <div class="row pageHead">
      <h1>Upravit post</h1>
      <a class="btn" href="#/post/${encodeURIComponent(id)}">← Zpět</a>
    </div>
    <div class="card">
      <form id="editPostForm">
        <label class="muted">Nadpis</label>
        <input name="title" required minlength="5" maxlength="255" value="${escapeHtml(current.title)}" />
        <div style="height:10px"></div>
        <label class="muted">Text</label>
        <textarea name="body" required minlength="5" maxlength="8191">${escapeHtml(current.body)}</textarea>
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
      await api(`/posts/${encodeURIComponent(id)}`, { method: "PUT", auth: true, body: { title, body } });
      showFlash("Uloženo.", "ok");
      location.hash = `#/post/${encodeURIComponent(id)}`;
    } catch (e) {
      showFlash(e.message, "err");
    }
  });
}

function openEditComment(postId, commentId, currentBody, page) {
  const decoded = currentBody || "";
  $app.innerHTML = `
    <div class="row pageHead">
      <h1>Upravit komentář</h1>
      <a class="btn" href="#/post/${encodeURIComponent(postId)}?page=${page}">← Zpět</a>
    </div>
    <div class="card">
      <form id="editCommentForm">
        <label class="muted">Text komentáře</label>
        <textarea name="body" required minlength="2" maxlength="2000">${decoded}</textarea>
        <div style="height:10px"></div>
        <button class="btn btn--primary" type="submit">Uložit</button>
      </form>
    </div>
  `;

  document.getElementById("editCommentForm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const body = String(new FormData(ev.target).get("body") || "").trim();

    try {
      await api(`/comments/${encodeURIComponent(commentId)}`, { method: "PUT", auth: true, body: { body } });
      showFlash("Komentář upraven.", "ok");
      location.hash = `#/post/${encodeURIComponent(postId)}?page=${page}`;
    } catch (e) {
      showFlash(e.message, "err");
    }
  });
}

function ensureConfirmRoot() {
  let root = document.getElementById("confirmRoot");
  if (!root) {
    root = document.createElement("div");
    root.id = "confirmRoot";
    document.body.appendChild(root);
  }
  return root;
}

function showConfirmDialog({
  title = "Potvrdit akci",
  message = "Opravdu pokračovat?",
  confirmText = "Potvrdit",
  cancelText = "Zrušit",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const root = ensureConfirmRoot();
    root.innerHTML = `
      <div class="modalBackdrop">
        <div class="modalCard" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
          <div class="modalIcon ${danger ? "modalIcon--danger" : ""}">${danger ? "!" : "?"}</div>
          <h3 id="confirmTitle" class="modalTitle">${escapeHtml(title)}</h3>
          <p class="modalText">${escapeHtml(message)}</p>
          <div class="modalActions">
            <button class="btn" type="button" data-confirm-cancel>${escapeHtml(cancelText)}</button>
            <button class="btn btn--primary ${danger ? "btn--dangerSolid" : ""}" type="button" data-confirm-ok>${escapeHtml(confirmText)}</button>
          </div>
        </div>
      </div>
    `;

    const cleanup = (value) => {
      document.removeEventListener("keydown", onKeyDown);
      root.innerHTML = "";
      resolve(value);
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") cleanup(false);
    };

    document.addEventListener("keydown", onKeyDown);
    root.querySelector("[data-confirm-cancel]")?.addEventListener("click", () => cleanup(false));
    root.querySelector("[data-confirm-ok]")?.addEventListener("click", () => cleanup(true));
    root.querySelector(".modalBackdrop")?.addEventListener("click", (e) => {
      if (e.target.classList.contains("modalBackdrop")) cleanup(false);
    });
    root.querySelector("[data-confirm-ok]")?.focus();
  });
}

async function doDeletePost(id) {
  if (!isAuthed()) return;
  const ok = await showConfirmDialog({
    title: "Smazat příspěvek",
    message: "Opravdu chceš tento příspěvek smazat? Tuto akci už nepůjde vrátit zpět.",
    confirmText: "Ano, smazat",
    cancelText: "Nechat být",
    danger: true,
  });
  if (!ok) return;

  try {
    await api(`/posts/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
    showFlash("Příspěvek smazán.", "ok");
    location.hash = "#/";
  } catch (e) {
    showFlash(e.message, "err");
  }
}

async function doDeleteComment(postId, commentId, page) {
  if (!isAuthed()) return;
  const ok = await showConfirmDialog({
    title: "Smazat komentář",
    message: "Opravdu chceš tento komentář smazat?",
    confirmText: "Ano, smazat",
    cancelText: "Zrušit",
    danger: true,
  });
  if (!ok) return;

  try {
    await api(`/comments/${encodeURIComponent(commentId)}`, { method: "DELETE", auth: true });
    showFlash("Komentář smazán.", "ok");
    await renderPostDetail(postId, { page });
  } catch (e) {
    showFlash(e.message, "err");
  }
}

async function doAdminDeletePost(id, onDone) {
  if (!canAdminManage()) return showFlash("Na tohle nemáš oprávnění.", "err");
  const ok = await showConfirmDialog({
    title: "Admin mazání příspěvku",
    message: "Opravdu chceš jako admin smazat tento příspěvek?",
    confirmText: "Smazat příspěvek",
    cancelText: "Zrušit",
    danger: true,
  });
  if (!ok) return;

  try {
    await api(`/admin/posts/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
    showFlash("Příspěvek smazán administrátorem.", "ok");
    await onDone?.();
  } catch (e) {
    showFlash(e.message, "err");
  }
}

async function doAdminDeleteComment(id, onDone) {
  if (!canAdminManage()) return showFlash("Na tohle nemáš oprávnění.", "err");
  const ok = await showConfirmDialog({
    title: "Admin mazání komentáře",
    message: "Opravdu chceš jako admin smazat tento komentář?",
    confirmText: "Smazat komentář",
    cancelText: "Zrušit",
    danger: true,
  });
  if (!ok) return;

  try {
    await api(`/admin/comments/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
    showFlash("Komentář smazán administrátorem.", "ok");
    await onDone?.();
  } catch (e) {
    showFlash(e.message, "err");
  }
}

async function doAdminDeleteUser(id, username, onDone) {
  if (!canAdminManage()) return showFlash("Na tohle nemáš oprávnění.", "err");
  const ok = await showConfirmDialog({
    title: "Admin mazání uživatele",
    message: `Opravdu chceš smazat uživatele ${username || ""}?`,
    confirmText: "Smazat uživatele",
    cancelText: "Zrušit",
    danger: true,
  });
  if (!ok) return;

  try {
    await api(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
    showFlash("Uživatel smazán administrátorem.", "ok");
    await onDone?.();
  } catch (e) {
    showFlash(e.message, "err");
  }
}

async function hydrateAuthFromMe() {
  if (!getToken()) return;



  try {
    const me = await api("/auth/me", { auth: true });
    setAuth({ token: getToken(), user: me });
  } catch {
    clearAuth();
  }
}

initCookieConsent();
await hydrateAuthFromMe();
route();
renderAuthUI();