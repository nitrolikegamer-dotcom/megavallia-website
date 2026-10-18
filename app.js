
"use strict";

/* =========================================================
   MEGAVALLIA WEBSITE
   Public feed, post rendering, download link and UI helpers
========================================================= */

const API_BASE_URL = "https://megavallia.onrender.com";

const ANDROID_APP_URL =
  "https://expo.dev/accounts/pollodev/projects/megavallia/builds/af145a0d-3d29-44e2-bb33-f6caeb0b58a4";

const MAX_FEED_POSTS = 12;
const REQUEST_TIMEOUT_MS = 20000;

/* =========================================================
   DOM HELPERS
========================================================= */

function $(selector, parent = document) {
  return parent.querySelector(selector);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined && text !== null) {
    element.textContent = String(text);
  }

  return element;
}

function setText(selector, value) {
  const element = $(selector);

  if (element) {
    element.textContent = value;
  }
}

function formatDate(value) {
  if (!value) return "Recently";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCount(value) {
  const count = Number(value || 0);

  return new Intl.NumberFormat(undefined, {
    notation: count >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(Math.max(0, count));
}

function validHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  updateFooterYear();
  setupDownloadLink();
  setupNavigation();
  setupFeedRetry();
  loadFeed();
});

function updateFooterYear() {
  const year = $("#year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
}

function setupDownloadLink() {
  const downloadLink = $("#download-link");

  if (downloadLink) {
    downloadLink.href = ANDROID_APP_URL;
    downloadLink.target = "_blank";
    downloadLink.rel = "noopener noreferrer";
  }

  const downloadNote = $("#download-note");

  if (downloadNote) {
    downloadNote.textContent =
      "Open the build page to check whether your Android APK is ready to download.";
  }
}

function setupNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") return;

      const target = $(targetId);

      if (!target) return;

      event.preventDefault();

      target.scrollIntoView({
        behavior: window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
          ? "auto"
          : "smooth",
        block: "start",
      });

      if (history.replaceState) {
        history.replaceState(null, "", targetId);
      }
    });
  });
}

/* =========================================================
   PUBLIC FEED
========================================================= */

async function loadFeed() {
  const feed = $("#feed");
  const status = $("#feed-status");

  if (!feed) {
    console.error(
      "[Megavallia] The #feed element is missing from index.html."
    );
    return;
  }

  if (status) {
    status.textContent = "Loading public content…";
  }

  feed.replaceChildren();

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/posts`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Posts API returned HTTP ${response.status}`
      );
    }

    const result = await response.json();

    const posts = Array.isArray(result)
      ? result
      : result && Array.isArray(result.posts)
        ? result.posts
        : null;

    if (!posts) {
      throw new Error(
        "Unexpected API response: expected an array of posts."
      );
    }

    const now = Date.now();

    const activePosts = posts.filter((post) => {
      if (!post || !post.id) return false;

      if (post.expires_at) {
        const expiresAt = new Date(post.expires_at).getTime();

        if (!Number.isFinite(expiresAt) || expiresAt <= now) {
          return false;
        }
      }

      if (
        post.visibility &&
        String(post.visibility).toLowerCase() !== "public"
      ) {
        return false;
      }

      return true;
    });

    activePosts.sort((a, b) => {
      const scoreA = Number(a.recommendation_score || 0);
      const scoreB = Number(b.recommendation_score || 0);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    });

    if (activePosts.length === 0) {
      if (status) {
        status.textContent = "No public posts available right now.";
      }

      const emptyMessage = createElement(
        "p",
        "empty-feed",
        "New moments will appear here when the community shares them."
      );

      feed.appendChild(emptyMessage);
      return;
    }

    const fragment = document.createDocumentFragment();

    activePosts.slice(0, MAX_FEED_POSTS).forEach((post) => {
      fragment.appendChild(renderPost(post));
    });

    feed.appendChild(fragment);

    if (status) {
      const shown = Math.min(
        activePosts.length,
        MAX_FEED_POSTS
      );

      status.textContent =
        `Showing ${shown} public post${shown === 1 ? "" : "s"}.`;
    }

    console.info(
      `[Megavallia] Loaded ${activePosts.length} public post(s).`
    );
  } catch (error) {
    console.error("[Megavallia] Public feed failed:", error);

    if (status) {
      status.textContent =
        "The public feed could not be loaded right now.";
    }

    const errorBox = createElement("div", "feed-error");

    errorBox.appendChild(
      createElement(
        "p",
        "",
        "Please refresh the page and try again."
      )
    );

    const details = createElement(
      "p",
      "feed-error-details",
      error.name === "AbortError"
        ? "The request timed out. The server may be waking up."
        : "Check the browser Console for the exact connection error."
    );

    errorBox.appendChild(details);

    const retryButton = createElement(
      "button",
      "btn btn-primary",
      "Try again"
    );

    retryButton.type = "button";
    retryButton.addEventListener("click", loadFeed);

    errorBox.appendChild(retryButton);
    feed.appendChild(errorBox);
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
   RENDER A SINGLE POST
========================================================= */

function renderPost(post) {
  const card = createElement("article", "feed-card");

  const profile =
    post.profile ||
    post.profiles ||
    {};

  const username =
    profile.username ||
    post.username ||
    "Megavallia creator";

  const avatarUrl = validHttpUrl(
    profile.avatar_url || post.avatar_url
  );

  const mediaUrl = validHttpUrl(
    post.media_url ||
    post.mediaUrl ||
    post.image_url ||
    post.video_url
  );

  const mediaType = String(post.media_type || "").toLowerCase();

  const header = createElement("div", "feed-header");

  if (avatarUrl) {
    const avatar = createElement("img", "feed-avatar");
    avatar.src = avatarUrl;
    avatar.alt = `${username}'s profile picture`;
    avatar.loading = "lazy";
    avatar.referrerPolicy = "no-referrer";

    avatar.addEventListener("error", () => {
      avatar.remove();
    }, { once: true });

    header.appendChild(avatar);
  }

  const authorInfo = createElement("div", "feed-author");

  authorInfo.appendChild(
    createElement("strong", "feed-username", username)
  );

  authorInfo.appendChild(
    createElement(
      "span",
      "feed-date",
      formatDate(post.created_at)
    )
  );

  header.appendChild(authorInfo);
  card.appendChild(header);

  if (mediaUrl) {
    const mediaContainer = createElement("div", "thumb");

    if (mediaType === "video") {
      const video = createElement("video", "feed-media");

      video.src = mediaUrl;
      video.controls = true;
      video.preload = "metadata";
      video.playsInline = true;
      video.setAttribute("aria-label", `Video posted by ${username}`);

      mediaContainer.appendChild(video);
    } else {
      const image = createElement("img", "feed-media");

      image.src = mediaUrl;
      image.alt = post.content
        ? String(post.content).slice(0, 160)
        : `Post shared by ${username}`;

      image.loading = "lazy";
      image.decoding = "async";

      image.addEventListener("error", () => {
        image.alt = "This media could not be loaded.";
        image.classList.add("media-load-error");
      }, { once: true });

      mediaContainer.appendChild(image);
    }

    card.appendChild(mediaContainer);
  }

  const body = createElement("div", "feed-body");

  if (mediaType) {
    body.appendChild(
      createElement(
        "span",
        "feed-label",
        mediaType === "video" ? "VIDEO" : "PUBLIC MOMENT"
      )
    );
  } else {
    body.appendChild(
      createElement("span", "feed-label", "PUBLIC POST")
    );
  }

  const content = String(post.content || "").trim();

  if (content) {
    const text = createElement("p", "feed-content", content);
    body.appendChild(text);
  } else if (!mediaUrl) {
    body.appendChild(
      createElement("p", "feed-content", "Shared on Megavallia.")
    );
  }

  const stats = createElement("div", "feed-stats");

  stats.appendChild(
    createElement(
      "span",
      "feed-likes",
      `♥ ${formatCount(post.like_count)}`
    )
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
   RETRY SUPPORT
========================================================= */

function setupFeedRetry() {
  const retryButton = $("#retry-feed");

  if (retryButton) {
    retryButton.addEventListener("click", loadFeed);
  }
}

/* =========================================================
   OPTIONAL MANUAL REFRESH
========================================================= */

window.megavalliaRefreshFeed = loadFeed;
