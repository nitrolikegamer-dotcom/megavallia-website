
/* Megavallia Website — Public Feed + Optional Supabase Auth */

"use strict";

const API_BASE_URL = "https://megavallia.onrender.com";

// Replace with a direct APK URL when the installable APK is ready.
// An Expo build-page URL is not necessarily a direct APK download.
const ANDROID_APK_URL =
  "https://expo.dev/accounts/pollodev/projects/megavallia/builds/af145a0d-3d29-44e2-bb33-f6caeb0b58a4";

// Supabase Auth is optional. Public viewing does not require sign-in.
// Configure both values only if you intentionally enable website sign-in.
// NEVER put a Supabase service-role or secret key in website JavaScript.
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

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  setupDownloadLink();
  initAuth();
  loadFeed();
});

/* ---------- DOWNLOAD LINK ---------- */

function setupDownloadLink() {
  const link = document.getElementById("download-link");
  const note = document.getElementById("download-note");

  if (!link) return;

  if (ANDROID_APK_URL) {
    link.href = ANDROID_APK_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    if (note) {
      note.textContent =
        "Open the latest Android build and download the APK if it is ready.";
    }
  } else {
    link.removeAttribute("href");

    if (note) {
      note.textContent =
        "The official Android download is not available yet.";
    }

    link.addEventListener("click", event => {
      event.preventDefault();

      if (note) {
        note.textContent =
          "The official Android download is not available yet.";
      }
    });
  }
}

/* ---------- OPTIONAL SUPABASE AUTH ---------- */

function initAuth() {
  const authBtn = document.getElementById("auth-btn");
  const closeBtn = document.getElementById("modal-close-btn");
  const modal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");

  // The public website does not require sign-in.
  // Keep legacy auth elements hidden if present.
  if (!supabaseClient) {
    if (authBtn) {
      authBtn.hidden = true;
      authBtn.setAttribute("aria-hidden", "true");
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", closeLoginModal);
    }

    if (modal) {
      modal.addEventListener("click", event => {
        if (event.target === modal) {
          closeLoginModal();
        }
      });
    }

    return;
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeLoginModal);
  }

  if (modal) {
    modal.addEventListener("click", event => {
      if (event.target === modal) {
        closeLoginModal();
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();

      const email = document
        .getElementById("login-email")
        ?.value.trim();

      const password = document
        .getElementById("login-password")
        ?.value;

      if (!email || !password) {
        showLoginError("Enter your email and password.");
        return;
      }

      const errorEl = document.getElementById("login-error");

      if (errorEl) {
        errorEl.style.display = "none";
      }

      try {
        const { error } =
          await supabaseClient.auth.signInWithPassword({
            email,
            password
          });

        if (error) {
          showLoginError(error.message);
          return;
        }

        closeLoginModal();
        await checkAuthStatus();
      } catch (error) {
        console.error("[Megavallia web] Sign-in failed:", error);
        showLoginError("Sign-in failed. Please try again.");
      }
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

  if (modal) {
    modal.style.display = "flex";
  }
}

function closeLoginModal() {
  const modal = document.getElementById("login-modal");
  const errorEl = document.getElementById("login-error");

  if (modal) {
    modal.style.display = "none";
  }

  if (errorEl) {
    errorEl.style.display = "none";
  }
}

async function checkAuthStatus() {
  if (!supabaseClient) return;

  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {
      console.error(
        "[Megavallia web] Session check failed:",
        error
      );
    }

    const session = data?.session;
    const authBtn = document.getElementById("auth-btn");
    const userDisplay = document.getElementById("user-display");

    if (!authBtn) return;

    // Keep sign-in hidden on the public website.
    authBtn.hidden = true;
    authBtn.setAttribute("aria-hidden", "true");

    if (session?.user && userDisplay) {
      const user = session.user;

      const displayName =
        user.user_metadata?.username ||
        user.email?.split("@")[0] ||
        "user";

      userDisplay.textContent = `Hi, @${displayName}`;
      userDisplay.style.display = "none";
    } else if (userDisplay) {
      userDisplay.textContent = "";
      userDisplay.style.display = "none";
    }
  } catch (error) {
    console.error(
      "[Megavallia web] Could not check session:",
      error
    );
  }
}

/* ---------- PUBLIC FEED HELPERS ---------- */

function textValue(value, fallback = "") {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

function validHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" ||
      url.protocol === "http:"
    );
  } catch {
    return false;
  }
}

/* ---------- RENDER A POST ---------- */

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

  const profile = post.profile || post.profiles || {};

  const username = textValue(
    profile.username || post.username,
    "Megavallia creator"
  );

  const content = textValue(post.content);
  const mediaType = String(post.media_type || "").toLowerCase();
  const isVideo = mediaType === "video";

  if (mediaUrl && validHttpUrl(mediaUrl)) {
    const media = document.createElement(
      isVideo ? "video" : "img"
    );

    media.src = mediaUrl;
    media.loading = "lazy";
    media.referrerPolicy = "no-referrer";

    if (isVideo) {
      media.controls = true;
      media.preload = "metadata";
      media.playsInline = true;
      media.setAttribute(
        "aria-label",
        `Video posted by ${username}`
      );
    } else {
      media.alt = content || `Post shared by ${username}`;
    }

    media.onerror = () => {
      media.remove();

      if (!thumb.querySelector("img, video")) {
        thumb.textContent = "Image unavailable";
        thumb.classList.add("media-error");
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
  label.textContent = isVideo ? "PUBLIC CLIP" : "PUBLIC POST";

  const title = document.createElement("h3");
  title.textContent = content || (
    isVideo ? "A video on Megavallia" : "A moment on Megavallia"
  );

  const desc = document.createElement("p");

  const likes = Number(post.like_count ?? 0);
  const views = Number(post.views_count ?? 0);
  const comments = Number(post.comment_count ?? 0);

  desc.textContent =
    `By @${username} · ` +
    `♥ ${Number.isFinite(likes) ? likes : 0} · ` +
    `${Number.isFinite(views) ? views : 0} views · ` +
    `${Number.isFinite(comments) ? comments : 0} comments`;

  body.append(label, title, desc);
  card.append(thumb, body);

  return card;
}

/* ---------- LOAD PUBLIC POSTS ---------- */

async function loadFeed() {
  const feed = document.getElementById("feed");
  const status = document.getElementById("feed-status");

  if (!feed || !status) {
    console.error(
      "[Megavallia web] Missing #feed or #feed-status in index.html."
    );
    return;
  }

  status.textContent = "Loading public content…";
  feed.replaceChildren();

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/posts`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `Feed request failed with HTTP ${response.status}`
      );
    }

    const result = await response.json();

    // Backend response: { posts: [...] }
    const posts = Array.isArray(result)
      ? result
      : result?.posts;

    if (!Array.isArray(posts)) {
      throw new Error(
        "The API response did not contain a posts array."
      );
    }

    const now = Date.now();

    const activePosts = posts.filter(post => {
      if (!post || typeof post !== "object") {
        return false;
      }

      if (post.expires_at) {
        const expiry = Date.parse(post.expires_at);

        if (
          !Number.isFinite(expiry) ||
          expiry <= now
        ) {
          return false;
        }
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

      if (
        post.is_public === false ||
        post.is_private === true
      ) {
        return false;
      }

      return true;
    });

    if (activePosts.length === 0) {
      status.textContent =
        "No active public posts to show right now.";
      return;
    }

    const fragment = document.createDocumentFragment();

    activePosts.slice(0, 12).forEach(post => {
      fragment.appendChild(renderPost(post));
    });

    feed.appendChild(fragment);

    status.textContent =
      `Showing ${Math.min(activePosts.length, 12)} ` +
      `public post${Math.min(activePosts.length, 12) === 1 ? "" : "s"}.`;
  } catch (error) {
    console.error(
      "[Megavallia web] Public feed failed:",
      error
    );

    status.textContent =
      "The public feed could not be loaded right now.";

    const message = document.createElement("div");
    message.className = "empty";
    message.textContent =
      "Please refresh the page and try again. If the issue continues, check the API connection and CORS settings.";

    feed.replaceChildren(message);
  }
}
