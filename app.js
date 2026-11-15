
/* =========================================================
   MEGAVALLIA WEBSITE
   Public Feed + Supabase Authentication + Connect Support
   ========================================================= */

const API_BASE_URL = "https://megavallia.onrender.com";

const ANDROID_APK_URL =
  "https://expo.dev/accounts/pollodev/projects/megavallia/builds/af145a0d-3d29-44e2-bb33-f6caeb0b58a4";

/* ---------------------------------------------------------
   SUPABASE PUBLIC CONFIGURATION

   Replace the placeholder with your Supabase PUBLIC
   publishable/anon key.

   NEVER put service-role keys or server secrets here.
   --------------------------------------------------------- */

const SUPABASE_URL =
  "https://jyakhjzzqzfaeowjukav.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "PASTE_YOUR_SUPABASE_PUBLIC_PUBLISHABLE_KEY_HERE";

let supabaseClient = null;
let currentSession = null;
let megavalliaAuthMode = "login";

/* =========================================================
   SUPABASE INITIALIZATION
   ========================================================= */

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
}

window.megavalliaSupabase = supabaseClient;

/* =========================================================
   INITIALIZATION
   ========================================================= */

function initializeMegavallia() {
  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  setupDownloadLink();
  setupConnectLinks();
  initAuth();
  loadFeed();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeMegavallia
  );
} else {
  initializeMegavallia();
}

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
    "[data-megavallia-connect]"
  );

  links.forEach(link => {
    link.href = "connect.html";
  });
}

/* =========================================================
   AUTHENTICATION INITIALIZATION
   ========================================================= */

function initAuth() {
  const authBtn = document.getElementById("auth-btn");
  const closeBtn = document.getElementById("modal-close-btn");

  const authModal = document.getElementById("authModal");
  const oldLoginModal = document.getElementById("login-modal");

  const activeModal = authModal || oldLoginModal;

  if (closeBtn) {
    closeBtn.addEventListener("click", closeAuth);
  }

  if (activeModal) {
    activeModal.addEventListener("click", event => {
      if (event.target === activeModal) {
        closeAuth();
      }
    });
  }

  // Support buttons such as:
  // <button data-auth-mode="login">Sign In</button>
  // <button data-auth-mode="signup">Create Account</button>

  document.querySelectorAll("[data-auth-mode]").forEach(button => {
    button.addEventListener("click", () => {
      openAuth(button.dataset.authMode || "login");
    });
  });

  // Support older website sign-in button.
  if (authBtn) {
    authBtn.addEventListener("click", event => {
      event.preventDefault();

      if (currentSession?.user) {
        logout();
      } else {
        openAuth("login");
      }
    });
  }

  // New unified authentication form.
  const authForm = document.getElementById("authForm");

  // Older login form fallback.
  const oldLoginForm = document.getElementById("login-form");

  if (authForm) {
    authForm.addEventListener(
      "submit",
      handleAuthenticationSubmit
    );
  } else if (oldLoginForm) {
    oldLoginForm.addEventListener(
      "submit",
      handleAuthenticationSubmit
    );
  }

  const switchLink = document.getElementById("authSwitchLink");

  if (switchLink) {
    switchLink.addEventListener("click", toggleAuthMode);
  }

  if (!supabaseClient) {
    console.warn(
      "[Megavallia] Supabase authentication is not configured. Check the public Supabase key and CDN script."
    );

    updateAuthState(null);
    return;
  }

  // Load existing session.
  checkAuthStatus();

  // Listen for sign-in, sign-out and session changes.
  supabaseClient.auth.onAuthStateChange(
    (event, session) => {
      console.info(
        "[Megavallia] Authentication event:",
        event
      );

      currentSession = session;
      updateAuthState(session);
    }
  );
}

/* =========================================================
   AUTHENTICATION MODAL
   ========================================================= */

function openAuth(mode = "login") {
  megavalliaAuthMode =
    mode === "signup" ? "signup" : "login";

  updateAuthModeUI();

  const authModal = document.getElementById("authModal");
  const oldLoginModal = document.getElementById("login-modal");

  const modal = authModal || oldLoginModal;

  if (modal) {
    modal.style.display = "flex";
  } else {
    alert(
      "The sign-in window is missing from this page. Please check the authentication modal HTML."
    );
  }
}

function closeAuth() {
  const authModal = document.getElementById("authModal");
  const oldLoginModal = document.getElementById("login-modal");

  if (authModal) {
    authModal.style.display = "none";
  }

  if (oldLoginModal) {
    oldLoginModal.style.display = "none";
  }

  clearAuthMessage();
}

// Keep compatibility with existing HTML buttons.
window.openAuth = openAuth;
window.closeAuth = closeAuth;

function toggleAuthMode(event) {
  if (event) {
    event.preventDefault();
  }

  megavalliaAuthMode =
    megavalliaAuthMode === "login" ? "signup" : "login";

  updateAuthModeUI();
}

window.toggleAuthMode = toggleAuthMode;

/* =========================================================
   UPDATE SIGN-IN / REGISTRATION TEXT
   ========================================================= */

function updateAuthModeUI() {
  const isLogin = megavalliaAuthMode === "login";

  const title = document.getElementById("authTitle");
  const description = document.getElementById("authDescription");
  const submit = document.getElementById("authSubmit");
  const switchText = document.getElementById("authSwitchText");
  const switchLink = document.getElementById("authSwitchLink");

  if (title) {
    title.textContent = isLogin
      ? "Welcome Back"
      : "Join Megavallia";
  }

  if (description) {
    description.textContent = isLogin
      ? "Sign in to continue to your account."
      : "Create your free Megavallia account.";
  }

  if (submit) {
    submit.textContent = isLogin
      ? "Sign In"
      : "Create Account";
  }

  if (switchText) {
    switchText.textContent = isLogin
      ? "Don't have an account?"
      : "Already registered?";
  }

  if (switchLink) {
    switchLink.textContent = isLogin
      ? "Create Account"
      : "Sign In";
  }

  clearAuthMessage();
}

/* =========================================================
   AUTHENTICATION FORM SUBMISSION
   ========================================================= */

async function handleAuthenticationSubmit(event) {
  event.preventDefault();

  const emailInput =
    document.getElementById("authEmail") ||
    document.getElementById("login-email");

  const passwordInput =
    document.getElementById("authPassword") ||
    document.getElementById("login-password");

  const button =
    document.getElementById("authSubmit") ||
    event.currentTarget.querySelector('button[type="submit"]');

  const email = emailInput?.value.trim();
  const password = passwordInput?.value;

  if (!supabaseClient) {
    showAuthMessage(
      "Authentication is not configured. Please check the Supabase public key.",
      true
    );
    return;
  }

  if (!email || !password) {
    showAuthMessage(
      "Enter your email address and password.",
      true
    );
    return;
  }

  if (password.length < 6) {
    showAuthMessage(
      "Your password must contain at least 6 characters.",
      true
    );
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Please wait...";
  }

  clearAuthMessage();

  try {
    let result;

    if (megavalliaAuthMode === "login") {
      result = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
    } else {
      result = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
    }

    if (result.error) {
      throw result.error;
    }

    if (
      megavalliaAuthMode === "signup" &&
      !result.data.session
    ) {
      showAuthMessage(
        "Your account has been created. Please check your email to confirm your account.",
        false
      );
    } else {
      currentSession = result.data.session;

      updateAuthState(currentSession);

      showAuthMessage(
        "You are successfully signed in.",
        false
      );

      setTimeout(() => {
        closeAuth();
      }, 700);
    }

  } catch (error) {
    console.error(
      "[Megavallia] Authentication failed:",
      error
    );

    showAuthMessage(
      error.message || "Authentication failed. Please try again.",
      true
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        megavalliaAuthMode === "login"
          ? "Sign In"
          : "Create Account";
    }
  }
}

/* =========================================================
   AUTHENTICATION MESSAGES
   ========================================================= */

function showAuthMessage(message, isError = false) {
  const messageElement =
    document.getElementById("authMessage") ||
    document.getElementById("login-error");

  if (!messageElement) {
    alert(message);
    return;
  }

  messageElement.textContent = message;
  messageElement.style.display = "block";

  messageElement.style.color = isError
    ? "#ff7777"
    : "#72e6a1";
}

function clearAuthMessage() {
  const messageElement =
    document.getElementById("authMessage") ||
    document.getElementById("login-error");

  if (messageElement) {
    messageElement.textContent = "";
    messageElement.style.display = "none";
  }
}

/* =========================================================
   UPDATE WEBSITE AUTHENTICATION DISPLAY
   ========================================================= */

function updateAuthState(session) {
  currentSession = session || null;

  const authBtn = document.getElementById("auth-btn");
  const userDisplay = document.getElementById("user-display");

  const signedIn = Boolean(session?.user);

  if (authBtn) {
    authBtn.textContent = signedIn
      ? "Sign Out"
      : "Sign In";

    authBtn.onclick = signedIn
      ? logout
      : () => openAuth("login");
  }

  if (userDisplay) {
    if (signedIn) {
      const user = session.user;

      const displayName =
        user.user_metadata?.username ||
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "user";

      userDisplay.textContent = `Hi, @${displayName}`;
      userDisplay.style.display = "inline";
    } else {
      userDisplay.textContent = "";
      userDisplay.style.display = "none";
    }
  }

  // Update optional visible sign-in buttons.
  document.querySelectorAll("[data-auth-guest]").forEach(element => {
    element.style.display = signedIn ? "none" : "";
  });

  document.querySelectorAll("[data-auth-user]").forEach(element => {
    element.style.display = signedIn ? "" : "none";
  });
}

/* =========================================================
   CHECK EXISTING SESSION
   ========================================================= */

async function checkAuthStatus() {
  if (!supabaseClient) {
    updateAuthState(null);
    return;
  }

  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    updateAuthState(data?.session || null);

  } catch (error) {
    console.error(
      "[Megavallia] Session check failed:",
      error
    );
  }
}

/* =========================================================
   SIGN OUT
   ========================================================= */

async function logout() {
  if (!supabaseClient) {
    return;
  }

  try {
    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }

    currentSession = null;
    updateAuthState(null);
    closeAuth();

  } catch (error) {
    console.error(
      "[Megavallia] Sign out failed:",
      error
    );

    alert(
      "Could not sign out. Please try again."
    );
  }
}

window.megavalliaLogout = logout;

/* =========================================================
   AUTH HELPER FOR CONNECT AND OTHER WEBSITE PAGES
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

  const token = data?.session?.access_token;

  if (!token) {
    throw new Error(
      "Please sign in to your Megavallia account."
    );
  }

  return token;
}

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

  if (!feed || !status) {
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
     
