/* Megavallia web preview. Configure the real public endpoint and signed APK URL here. */
const API_BASE = "https://megavallia.onrender.com";
// Your supplied router's GET "/" route can be mounted at /api/posts, but confirm server/src/index.ts first.
const POSTS_ENDPOINT = "/api/posts";
// Set this to the actual public APK download URL after you host a signed release build.
const ANDROID_APK_URL = "";
document.getElementById("year").textContent = new Date().getFullYear();
const downloadLink = document.getElementById("download-link");
const downloadNote = document.getElementById("download-note");
if (ANDROID_APK_URL) {
  downloadLink.href = ANDROID_APK_URL;
  downloadLink.target = "_blank";
  downloadLink.rel = "noopener noreferrer";
  downloadNote.textContent = "Download the official Android app.";
} else {
  downloadLink.addEventListener("click", e => {
    e.preventDefault();
    downloadNote.textContent = "The official APK link has not been added yet.";
  });
}
const feed = document.getElementById("feed");
const status = document.getElementById("feed-status");
function textValue(value, fallback = "") { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
function renderPost(post) {
  const card = document.createElement("article"); card.className = "feed-card";
  const thumb = document.createElement("div"); thumb.className = "thumb";
  const mediaUrl = textValue(post.media_url || post.image_url || post.imageUrl || post.thumbnail_url);
  if (mediaUrl && /^https:\/\//i.test(mediaUrl)) {
    const media = post.media_type === "video" ? document.createElement("video") : document.createElement("img");
    media.src = mediaUrl; media.loading = "lazy";
    if (media.tagName === "VIDEO") { media.controls = true; media.preload = "metadata"; media.playsInline = true; }
    else media.alt = textValue(post.content, "Public Megavallia post");
    media.onerror = () => media.remove(); thumb.appendChild(media);
  } else { thumb.textContent = "✦"; }
  const body = document.createElement("div"); body.className = "feed-body";
  const label = document.createElement("span"); label.className = "feed-label"; label.textContent = post.media_type === "video" ? "PUBLIC CLIP" : "PUBLIC POST";
  const title = document.createElement("h3"); title.textContent = textValue(post.content, post.media_type === "video" ? "A moment on Megavallia" : "A post from the community");
  const desc = document.createElement("p"); const profile = post.profile || post.profiles || {}; desc.textContent = profile.username ? `By @${profile.username} · ♥ ${Number(post.like_count || 0)} · ${Number(post.views_count || 0)} views` : `♥ ${Number(post.like_count || 0)} · ${Number(post.views_count || 0)} views`;
  body.append(label, title, desc); card.append(thumb, body); return card;
}
async function loadFeed() {
  try {
    const response = await fetch(`${API_BASE}${POSTS_ENDPOINT}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const posts = Array.isArray(payload) ? payload : (payload.posts || payload.data || []);
    if (!Array.isArray(posts)) throw new Error("Unexpected posts response");
    // Expiration is checked in the browser too; privacy must be enforced by the server.
    const active = posts.filter(p => p && (!p.expires_at || new Date(p.expires_at).getTime() > Date.now()));
    if (!active.length) { status.textContent = "No active public posts to show right now."; return; }
    feed.replaceChildren(...active.slice(0, 12).map(renderPost));
    status.textContent = "Latest posts from Megavallia";
  } catch (error) {
    console.error("[Megavallia web] Feed failed:", error);
    status.textContent = "The public feed could not be loaded yet.";
    const message = document.createElement("div"); message.className = "empty";
    message.textContent = "Check that the posts router is mounted at /api/posts and that your Express CORS settings allow this website domain.";
    feed.appendChild(message);
  }
}
loadFeed();
