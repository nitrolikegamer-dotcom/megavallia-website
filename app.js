
/* Megavallia Website — Public Feed + Supabase Auth */

const API_BASE_URL = "https://megavallia.onrender.com";

// Add the official APK URL when it is ready.
const ANDROID_APK_URL = "";

// Supabase Auth is optional for public viewing.
// Configure these only if you need website sign-in.
// SUPABASE_URL must look like:
// https://YOUR_PROJECT_REF.supabase.co
// Use a public/publishable key, NEVER a secret/service-role key.
const SUPABASE_URL = "";
const SUPABASE_PUBLISHABLE_KEY = "";

let supabaseClient = null;

if (
  SUPABASE_URL &&
  SUPABASE_PUBLISHABLE_KEY &&
  window.supabase
) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  setupLink();
  initAuth();
  loadFeed();
});

/* ----------  LINK ---------- */

function setupDownloadLink() {
  const link = document.getElementById("download-link");
  const note = document.getElementById("download-note");

  if (!link || !note) return;

  if (ANDROID_APK_URL) {
    link.href = ANDROID_APK_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    note.textContent = "Download the official Megavallia Android app.";
  } else {
    link.addEventListener("click", event => {
      event.preventDefault();
      note.textContent =
        "The official Android download link is not available yet.";
    });
  }
}

/* ---------- OPTIONAL SUPABASE AUTH ---------- */

function initAuth() {
  const authBtn = document.getElementById("auth-btn");
  const closeBtn = document.getElementById("modal-close-btn");
  const modal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");

  if (!supabaseClient) {
    if (authBtn) {
      authBtn.textContent = "Sign In";
      authBtn.onclick = () => {
        if (modal) {
          modal.style.display = "flex";
        } else {
          alert("Website sign-in is not configured yet.");
        }
      };
    }

    if (closeBtn) closeBtn.onclick = closeLoginModal;

    if (modal) {
      modal.addEventListener("click", event => {
        if (event.target === modal) closeLoginModal();
      });
    }

    return;
  }

  if (closeBtn) closeBtn.onclick = closeLoginModal;

  if (modal) {
    modal.addEventListener("click", event => {
      if (event.target === modal) closeLoginModal();
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();

      const email = document.getElementById("login-email")?.value.trim();
      const password = document.getElementById("login-password")?.value;
      const errorEl = document.getElementById("login-error");

      if (!email || !password) {
        showLoginError("Enter your email and password.");
        return;
      }

      if (errorEl) errorEl.style.display = "none";

      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        showLoginError(error.message);
        return;
      }

      closeLoginModal();
      await checkAuthStatus();
    });
  }

  checkAuthStatus();

  supabaseClient.auth.onAuthStateChange(() => {
    checkAuthStatus();
  });
}

function showLoginError(message) {
  const errorEl = document.getElementById("login-error");
  if (!errorEl) {
    alert(message);
    return;
  }

  errorEl.textContent = message;
  errorEl.style.display = "block";
}

function openLoginModal() {
  const modal = document.getElementById("login-modal");
  if (modal) modal.style.display = "flex";
}

function closeLoginModal() {
  const modal = document.getElementById("login-modal");
  const errorEl = document.getElementById("login-error");

  if (modal) modal.style.display = "none";
  if (errorEl) errorEl.style.display = "none";
}

async function checkAuthStatus() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) console.error("[Megavallia web] Session check failed:", error);

  const session = data?.session;
  const authBtn = document.getElementById("auth-btn");
  const userDisplay = document.getElementById("user-display");

  if (!authBtn) return;

  if (session?.user) {
    const user = session.user;
    const displayName =
      user.user_metadata?.username ||
      user.email?.split("@")[0] ||
      "user";

    authBtn.textContent = "Sign Out";
    authBtn.onclick = logout;

    if (userDisplay) {
      userDisplay.textContent = `Hi, @${displayName}`;
      userDisplay.style.display = "inline";
    }
  } else {
    authBtn.textContent = "Sign In";
    authBtn.onclick = openLoginModal;

    if (userDisplay) {
      userDisplay.textContent = "";
      userDisplay.style.display = "none";
    }
  }
}

async function logout() {
  if (!supabaseClient) return;

  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    console.error("[Megavallia web] Sign out failed:", error);
  }

  await checkAuthStatus();
}

/* ---------- PUBLIC FEED ---------- */

function textValue(value, fallback = "") {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

function renderPost(post) {
  const card = document.createElement("article");
  card.className = "feed-card";

  const thumb = document.createElement("div");
  thumb.className = "thumb";

  const mediaUrl = textValue(
    post.media_url ||
    post.image_url ||
    post.imageUrl ||
    post.thumbnail_url
  );

  if (mediaUrl && /^https?:\/\//i.test(mediaUrl)) {
    const isVideo =
      String(post.media_type || "").toLowerCase() === "video";

    const media = document.createElement(isVideo ? "video" : "img");
    media.src = mediaUrl;
    media.loading = "lazy";

    if (isVideo) {
      media.controls = true;
      media.preload = "metadata";
      media.playsInline = true;
    } else {
      media.alt = textValue(post.content, "Megavallia public post");
    }

    media.onerror = () => {
      media.remove();
      if (!thumb.querySelector("img, video")) {
        thumb.textContent = "✦";
      }
    };

    thumb.appendChild(media);
  } else {
    thumb.textContent = "✦";
    thumb.classList.add("text-only");
  }

  const body = document.createElement("div");
  body.className = "feed-body";

  const label = document.createElement("span");
  label.className = "feed-label";
  label.textContent =
    String(post.media_type || "").toLowerCase() === "video"
      ? "PUBLIC CLIP"
      : "PUBLIC POST";

  const title = document.createElement("h3");
  title.textContent = textValue(
    post.content,
    "A moment on Megavallia"
  );

  const desc = document.createElement("p");
  const profile = post.profile || post.profiles || {};
  const username = textValue(profile.username || post.username);

  const likes = Number(post.like_count || 0);
  const views = Number(post.views_count || 0);

  desc.textContent = username
    ? `By @${username} · ♥ ${likes} · ${views} views`
    : `♥ ${likes} · ${views} views`;

  body.append(label, title, desc);
  card.append(thumb, body);

  return card;
}

async function loadFeed() {
  const feed = document.getElementById("feed");
  const status = document.getElementById("feed-status");

  if (!feed || !status) return;

  status.textContent = "Loading public content…";
  feed.replaceChildren();

  try {
    const response = await fetch(`${API_BASE_URL}/api/posts`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Feed request failed (${response.status})`);
    }

    const result = await response.json();

    // The current backend returns { posts: [...] }.
    const posts = Array.isArray(result)
      ? result
      : result.posts;

    if (!Array.isArray(posts)) {
      throw new Error("The API response did not contain a posts array.");
    }

    const now = Date.now();

    // Respect expiry. Do not assume posts are public if the backend
    // provides an explicit visibility field.
    const active = posts.filter(post => {
      if (!post || typeof post !== "object") return false;

      if (post.expires_at) {
        const expiry = new Date(post.expires_at).getTime();
        if (!Number.isFinite(expiry) || expiry <= now) return false;
      }

      const visibility =
        post.visibility ??
        post.privacy ??
        post.audience;

      if (
        visibility != null &&
        !["public", "everyone", "world"].includes(
          String(visibility).toLowerCase()
        )
      ) {
        return false;
      }

      if (post.is_public === false || post.is_private === true) {
        return false;
      }

      return true;
    });

    if (!active.length) {
      status.textContent = "No active public posts to show right now.";
      return;
    }

    feed.replaceChildren(...active.slice(0, 12).map(renderPost));
    status.textContent = "Latest public posts from Megavallia";
  } catch (error) {
    console.error("[Megavallia web] Feed failed:", error);
    status.textContent =
      "The public feed could not be loaded right now.";

    const message = document.createElement("div");
    message.className = "empty";
    message.textContent =
      "Please try again later. If this continues, check that the Megavallia API is online and allows website requests.";

    feed.replaceChildren(message);
  }
}
