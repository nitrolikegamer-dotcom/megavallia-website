
/* =========================================================
   MEGAVALLIA WEBSITE
   Public Feed + Supabase Authentication + Connect Support
   ========================================================= */

const API_BASE_URL = "https://megavallia.onrender.com";

const ANDROID_APK_URL =
  "https://expo.dev/accounts/pollodev/projects/megavallia/builds/af145a0d-3d29-44e2-bb33-f6caeb0b58a4";

/* ---------------------------------------------------------
   SUPABASE PUBLIC CONFIGURATION

   Use your existing Megavallia Supabase project.
   Only the public publishable/anon key belongs here.

   NEVER put service-role keys or server secrets here.
   --------------------------------------------------------- */

const SUPABASE_URL =
  "https://jyakhjzzqzfaeowjukav.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "PASTE_YOUR_SUPABASE_PUBLIC_PUBLISHABLE_KEY_HERE";

let supabaseClient = null;

if (
  SUPABASE_URL &&
  SUPABASE_PUBLISHABLE_KEY &&
  SUPABASE_PUBLISHABLE_KEY !==
    "PASTE_YOUR_SUPABASE_PUBLIC_PUBLISHABLE_KEY_HERE" &&
  window.supabase
) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  // Allow other website scripts to reuse the same client.
  window.megavalliaSupabase = supabaseClient;
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  setupDownloadLink();
  setupConnectLinks();
  initAuth();
  loadFeed();
});

/* =========================================================
   DOWNLOAD LINK
   ========================================================= */

function setupDownloadLink() {
  const link = document.getElementById("download-link");
  const note = document.getElementById("download-note");

  if (!link) {
    console.warn(
      "[Megavallia] Download link element not found."
    );
    return;
  }

  link.href = ANDROID_APK_URL;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  if (note) {
    note.textContent =
      "Open the Android build page to download Megavallia if an installable APK is available.";
  }
}

/* =========================================================
   CONNECT NAVIGATION
   ========================================================= */

function setupConnectLinks() {
  const links = document.querySelectorAll(
    '[data-megavallia-connect]'
  );

  links.forEach(link => {
    link.href = "connect.html";
  });
}

/* =========================================================
   SUPABASE AUTHENTICATION
   ========================================================= */

function initAuth() {
  const authBtn = document.getElementById("auth-btn");
  const closeBtn = document.getElementById("modal-close-btn");
  const modal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");

  if (closeBtn) {
    closeBtn.onclick = closeLoginModal;
  }

  if (modal) {
    modal.addEventListener("click", event => {
      if (event.target === modal) {
        closeLoginModal();
      }
    });
  }

  if (!supabaseClient) {
    if (authBtn) {
      authBtn.textContent = "Sign In";

      authBtn.onclick = () => {
        if (modal) {
          openLoginModal();
        } else {
          alert(
            "Website sign-in is not configured. Please check the Supabase public configuration."
          );
        }
      };
    }

    console.warn(
      "[Megavallia] Supabase authentication is not configured."
    );

    return;
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

      const submitButton = loginForm.querySelector(
        'button[type="submit"]'
      );

      if (!email || !password) {
        showLoginError("Enter your email and password.");
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
      }

      hideLoginError();

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
        showLoginError(
          error.message || "Sign in failed. Please try again."
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
        }
      }
    });
  }

  checkAuthStatus();

  supabaseClient.auth.onAuthStateChange(
    async (event, session) => {
      console.info(
        "[Megavallia] Authentication event:",
        event
      );

      updateAuthInterface(session);
    }
  );
}

/* =========================================================
   AUTHENTICATION INTERFACE
   ========================================================= */

function updateAuthInterface(session) {
  const authBtn = document.getElementById("auth-btn");
  const userDisplay = document.getElementById("user-display");

  if (!authBtn) return;

  if (session?.user) {
    const user = session.user;

    const displayName =
      user.user_metadata?.username ||
      user.user_metadata?.display_name ||
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

async function checkAuthStatus() {
  if (!supabaseClient) return;

  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {
      console.error(
        "[Megavallia] Session check failed:",
        error
      );
      return;
    }

    updateAuthInterface(data?.session);

  } catch (error) {
    console.error(
      "[Megavallia] Authentication error:",
      error
    );
  }
}

/* =========================================================
   LOGIN MODAL
   ========================================================= */

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
    errorEl.textContent = "";
  }
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

function hideLoginError() {
  const errorEl = document.getElementById("login-error");

  if (errorEl) {
    errorEl.textContent = "";
    errorEl.style.display = "none";
  }
}

/* =========================================================
   SIGN OUT
   ========================================================= */

async function logout() {
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error(
        "[Megavallia] Sign out failed:",
        error
      );
      alert("Could not sign out. Please try again.");
      return;
    }

    closeLoginModal();
    await checkAuthStatus();

  } catch (error) {
    console.error(
      "[Megavallia] Sign out error:",
      error
    );
  }
}

/* =========================================================
   AUTH HELPER FOR OTHER WEBSITE PAGES
   ========================================================= */

async function getMegavalliaAccessToken() {
  if (!supabaseClient) {
    throw new Error(
      "Megavallia authentication is not configured."
    );
  }

  const { data, error } =
    await supabaseClient.auth.getSession();

  if (error) {
    throw error;
  }

  if (!data?.session?.access_token) {
    throw new Error(
      "Please sign in to your Megavallia account."
    );
  }

  return data.session.access_token;
}

// Make helper available to other scripts.
window.getMegavalliaAccessToken =
  getMegavalliaAccessToken;

/* =========================================================
   PUBLIC FEED HELPERS
   ========================================================= */

function textValue(value, fallback = "") {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

/* =========================================================
   PUBLIC POST RENDERING
   ========================================================= */

function renderPost(post) {
  const card = document.createElement("article");
  card.className = "feed-card";

  const thumb = document.createElement("div");
  thumb.className = "thumb";

  const mediaUrl = textValue(
    post.media_url ||
    post.image_url ||
    post.imageUrl ||
    post.thumbnail_url ||
    post.video_url
  );

  if (mediaUrl && /^https?:\/\//i.test(mediaUrl)) {
    const isVideo =
      String(post.media_type || "").toLowerCase() === "video" ||
      /\.(mp4|webm|mov|m4v)(?:$|\?)/i.test(mediaUrl);

    const media = document.createElement(
      isVideo ? "video" : "img"
    );

    media.src = mediaUrl;
    media.loading = "lazy";

    if (isVideo) {
      media.controls = true;
      media.preload = "metadata";
      media.playsInline = true;
    } else {
      media.alt = textValue(
        post.content,
        "Megavallia public post"
      );
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

  const username = textValue(
    profile.username || post.username
  );

  const likes = Number(post.like_count || 0);
  const views = Number(post.views_count || 0);

  desc.textContent = username
    ? `By @${username} · ♥ ${likes} · ${views} views`
    : `♥ ${likes} · ${views} views`;

  body.append(label, title, desc);
  card.append(thumb, body);

  return card;
}

/* =========================================================
   LOAD PUBLIC FEED
   ========================================================= */

async function loadFeed() {
  const feed = document.getElementById("feed");
  const status = document.getElementById("feed-status");

  if (!feed || !status) return;

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
        `Feed request failed (${response.status})`
      );
    }

    const result = await response.json();

    const posts = Array.isArray(result)
      ? result
      : result.posts;

    if (!Array.isArray(posts)) {
      throw new Error(
        "The API response did not contain a posts array."
      );
    }

    const now = Date.now();

    const active = posts.filter(post => {
      if (!post || typeof post !== "object") {
        return false;
      }

      if (post.expires_at) {
        const expiry =
          new Date(post.expires_at).getTime();

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

    if (!active.length) {
      status.textContent =
        "No active public posts to show right now.";
      return;
    }

    feed.replaceChildren(
      ...active.slice(0, 12).map(renderPost)
    );

    status.textContent =
      "Latest public posts from Megavallia";

  } catch (error) {
    console.error(
      "[Megavallia] Feed failed:",
      error
    );

    status.textContent =
      "The public feed could not be loaded right now.";

    const message = document.createElement("div");

    message.className = "empty";

    message.textContent =
      "Please try again later. If this continues, check that the Megavallia API is online and allows website requests.";

    feed.replaceChildren(message);
  }
}

/* =========================================================
   END OF MEGAVALLIA WEBSITE APP.JS
   ========================================================= */
        
