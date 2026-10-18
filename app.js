
"use strict";

/* =========================================================
   MEGAVALLIA WEBSITE
   Public Feed, Optional Supabase Auth, Android Download
========================================================= */

const API_BASE_URL = "https://megavallia.onrender.com";

const ANDROID_APK_URL =
  "https://expo.dev/accounts/pollodev/projects/megavallia/builds/af145a0d-3d29-44e2-bb33-f6caeb0b58a4";

const MAX_FEED_POSTS = 12;
const REQUEST_TIMEOUT_MS = 20000;

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

/* =========================================================
   HELPERS
========================================================= */

function $(selector, parent = document) {
  return parent.querySelector(selector);
}

function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) element.className = className;

  if (text !== null && text !== undefined) {
    element.textContent = String(text);
  }

  return element;
}

function textValue(value, fallback = "") {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function formatCount(value) {
  const count = Math.max(0, Number(value) || 0);

  return new Intl.NumberFormat(undefined, {
    notation: count >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(count);
}

function formatDate(value) {
  if (!value) return "Recently";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function validHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value);

    if (!["https:", "http:"].includes(url.protocol)) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  updateFooterYear();
  setupDownloadLink();
  setupNavigation();
  setupFeedRetry();
  initAuth();
  loadFeed();

  console.info("[Megavallia] Website initialized.");
});

function updateFooterYear() {
  const year = $("#year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
}

/* =========================================================
   ANDROID DOWNLOAD
========================================================= */

function setupDownloadLink() {
  const link = $("#download-link");
  const note = $("#download-note");

  if (!link) {
    console.error("[Megavallia] #download-link was not found.");
    return;
  }

  link.href = ANDROID_APK_URL;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  if (note) {
    note.textContent =
      "Open the Android build page to download the app if an installable APK is available.";
  }

  link.addEventListener("click", () => {
    if (note) {
      note.textContent =
        "The Android build page has opened. Download the APK if an installable build is available.";
    }
  });

  console.info("[Megavallia] Android download link connected.");
}

/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") return;

      let target;

      try {
        target = $(targetId);
      } catch {
        return;
      }

      if (!target) return;

      event.preventDefault();

      target.scrollIntoView({
        behavior: window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches ? "auto" : "smooth",
        block: "start"
      });

      history.replaceState(null, "", targetId);
    });
  });
}

/* =========================================================
   OPTIONAL SUPABASE AUTH
========================================================= */

function initAuth() {
  const authBtn = $("#auth-btn");
  const closeBtn = $("#modal-close-btn");
  const modal = $("#login-modal");
  const loginForm = $("#login-form");

  if (closeBtn) {
    closeBtn.addEventListener("click", closeLoginModal);
  }

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeLoginModal();
    });
  }

  if (!supabaseClient) {
    if (authBtn && !authBtn.hidden) {
      authBtn.addEventListener("click", () => {
        if (modal) {
          modal.style.display = "flex";
        } else {
          alert("Website sign-in is not configured yet.");
        }
      });
    }

    return;
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = $("#login-email")?.value.trim();
      const password = $("#login-password")?.value;
      const submitButton = loginForm.querySelector(
        'button[type="submit"]'
      );

      if (!email || !password) {
        showLoginError("Enter your email and password.");
        return;
      }

      showLoginError("");

      if (submitButton) submitButton.disabled = true;

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
        console.error("[Megavallia] Sign-in failed:", error);
        showLoginError("Unable to sign in. Please try again.");
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  checkAuthStatus();

  supabaseClient.auth.onAuthStateChange(() => {
    checkAuthStatus();
  });
}

function showLoginError(message) {
  const errorElement = $("#login-error");

  if (!errorElement) {
    if (message) alert(message);
    return;
  }

  errorElement.textContent = message;
  errorElement.style.display = message ? "block" : "none";
}

function openLoginModal() {
  const modal = $("#login-modal");

  if (modal) modal.style.display = "flex";
}

function closeLoginModal() {
  const modal = $("#login-modal");
  const errorElement = $("#login-error");

  if (modal) modal.style.display = "none";

  if (errorElement) {
    errorElement.textContent = "";
    errorElement.style.display = "none";
  }
}

async function checkAuthStatus() {
  if (!supabaseClient) return;

  const authBtn = $("#auth-btn");
  const userDisplay = $("#user-display");

  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) throw error;

    const user = data?.session?.user;

    if (!authBtn) return;

    if (user) {
      const displayName =
        user.user_metadata?.username ||
        user.email?.split("@")[0] ||
        "user";

      authBtn.textContent = "Sign Out";
      authBtn.onclick = logout;

      if (userDisplay) {
        userDisplay.textContent = `Hi, @${displayName}`;
        userDisplay.hidden = false;
      }
    } else {
      authBtn.textContent = "Sign In";
      authBtn.onclick = openLoginModal;

      if (userDisplay) {
        userDisplay.textContent = "";
        userDisplay.hidden = true;
      }
    }
  } catch (error) {
    console.error("[Megavallia] Session check failed:", error);
  }
}

async function logout() {
  if (!supabaseClient) return;

  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    console.error("[Megavallia] Sign-out failed:", error);
  }

  await checkAuthStatus();
}

/* =========================================================
   PUBLIC FEED
========================================================= */

let activeFeedController = null;

async function loadFeed() {
  const feed = $("#feed");
  const status = $("#feed-status");

  if (!feed) {
    console.error("[Megavallia] Missing #feed element.");
    return;
  }

  /* Cancel an earlier request if retry is clicked. */
  if (activeFeedController) {
    activeFeedController.abort();
  }

  const controller = new AbortController();
  activeFeedController = controller;

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );

  if (status) status.textContent = "Loading public content…";

  feed.replaceChildren();

  try {
    const endpoint = `${API_BASE_URL}/api/posts`;

    console.info("[Megavallia] Requesting public feed:", endpoint);

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store",
      mode: "cors",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `Public feed request failed (HTTP ${response.status}).`
      );
    }

    const result = await response.json();

    const posts = Array.isArray(result)
      ? result
      : result && Array.isArray(result.posts)
        ? result.posts
        : null;

    if (!posts) {
      throw new Error("The API did not return a posts array.");
    }

    const now = Date.now();

    const activePosts = posts.filter((post) => {
      if (!post || typeof post !== "object") return false;

      if (post.expires_at) {
        const expiry = new Date(post.expires_at).getTime();

        if (!Number.isFinite(expiry) || expiry <= now) {
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

      return Boolean(post.id);
    });

    activePosts.sort((a, b) => {
      const scoreDifference =
        Number(b.recommendation_score || 0) -
        Number(a.recommendation_score || 0);

      if (scoreDifference !== 0) return scoreDifference;

      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    });

    if (!activePosts.length) {
      if (status) {
        status.textContent =
          "No active public posts to show right now.";
      }

      feed.appendChild(
        createElement(
          "p",
          "empty",
          "New public moments will appear here when creators share them."
        )
      );

      return;
    }

    const fragment = document.createDocumentFragment();

    activePosts.slice(0, MAX_FEED_POSTS).forEach((post) => {
      fragment.appendChild(renderPost(post));
    });

    feed.appendChild(fragment);

    if (status) {
      const count = Math.min(activePosts.length, MAX_FEED_POSTS);

      status.textContent =
        `Showing ${count} public post${count === 1 ? "" : "s"}.`;
    }

    console.info(
      `[Megavallia] Loaded ${activePosts.length} public post(s).`
    );
  } catch (error) {
    if (error?.name === "AbortError" && activeFeedController !== controller) {
      return;
    }

    console.error("[Megavallia] Public feed failed:", error);

    if (status) {
      status.textContent =
        "The public feed could not be loaded right now.";
    }

    const errorBox = createElement("div", "empty");

    const message = error?.name === "AbortError"
      ? "The request timed out. Please try again."
      : "Unable to load public posts. Please try again shortly.";

    errorBox.appendChild(createElement("p", "", message));

    const retryButton = createElement("button", "btn", "Try again");
    retryButton.type = "button";
    retryButton.addEventListener("click", loadFeed);

    errorBox.appendChild(retryButton);
    feed.appendChild(errorBox);
  } finally {
    clearTimeout(timeout);

    if (activeFeedController === controller) {
      activeFeedController = null;
    }
  }
}

/* =========================================================
   RENDER A POST
========================================================= */

function renderPost(post) {
  const card = createElement("article", "feed-card");

  const profile = post.profile || post.profiles || {};

  const username = textValue(
    profile.username || post.username,
    "Megavallia creator"
  );

  const avatarUrl = validHttpUrl(
    profile.avatar_url ||
    profile.avatar ||
    post.avatar_url
  );

  const mediaUrl = validHttpUrl(
    post.media_url ||
    post.mediaUrl ||
    post.image_url ||
    post.imageUrl ||
    post.video_url ||
    post.thumbnail_url
  );

  const mediaType = String(
    post.media_type || post.mediaType || ""
  ).toLowerCase();

  /* Creator header */
  const header = createElement("div", "feed-header");

  if (avatarUrl) {
    const avatar = createElement("img", "feed-avatar");

    avatar.src = avatarUrl;
    avatar.alt = `${username}'s profile picture`;
    avatar.width = 44;
    avatar.height = 44;
    avatar.loading = "lazy";
    avatar.decoding = "async";

    avatar.addEventListener("error", () => {
      avatar.remove();
    }, { once: true });

    header.appendChild(avatar);
  }

  const author = createElement("div", "feed-author");

  author.appendChild(
    createElement("strong", "feed-username", username)
  );

  author.appendChild(
    createElement("span", "feed-date", formatDate(post.created_at))
  );

  header.appendChild(author);
  card.appendChild(header);

  /* Media */
  if (mediaUrl) {
    const thumb = createElement("div", "thumb");

    if (
      mediaType.includes("video") ||
      /\.(mp4|webm|mov|m4v)(?:$|\?)/i.test(mediaUrl)
    ) {
      const video = createElement("video", "feed-media");

      video.src = mediaUrl;
      video.controls = true;
      video.preload = "metadata";
      video.playsInline = true;

      thumb.appendChild(video);
    } else {
      const image = createElement("img", "feed-media");

      image.src = mediaUrl;
      image.alt = textValue(post.content, `Post by ${username}`);
      image.loading = "lazy";
      image.decoding = "async";

      image.addEventListener("error", () => {
        image.alt = "Post media could not be loaded.";
        image.classList.add("media-load-error");
      }, { once: true });

      thumb.appendChild(image);
    }

    card.appendChild(thumb);
  }

  /* Content and statistics */
  const body = createElement("div", "feed-body");

  body.appendChild(
    createElement(
      "span",
      "feed-label",
      mediaType.includes("video")
        ? "PUBLIC CLIP"
        : mediaUrl
          ? "PUBLIC MOMENT"
          : "PUBLIC POST"
    )
  );

  const content = textValue(post.content || post.caption);

  if (content) {
    body.appendChild(createElement("p", "feed-content", content));
  } else if (!mediaUrl) {
    body.appendChild(
      createElement(
        "p",
        "feed-content",
        "A moment shared on Megavallia."
      )
    );
  }

  const stats = createElement("div", "feed-stats");

  stats.appendChild(
    createElement("span", "feed-likes", `♥ ${formatCount(post.like_count)}`)
  );

  stats.appendChild(
    createElement(
      "span",
      "feed-comments",
      `Comments ${formatCount(post.comment_count)}`
    )
  );

  stats.appendChild(
    createElement(
      "span",
      "feed-views",
      `Views ${formatCount(post.views_count)}`
    )
  );

  body.appendChild(stats);
  card.appendChild(body);

  return card;
}

/* =========================================================
   FEED RETRY
========================================================= */

function setupFeedRetry() {
  const retryButton = $("#retry-feed");

  if (retryButton) {
    retryButton.addEventListener("click", loadFeed);
  }
}

/* =========================================================
   GLOBAL REFRESH HELPER
========================================================= */

window.megavalliaRefreshFeed = loadFeed;
