# Megavallia Website

Responsive static landing page for Megavallia: visitors can watch public posts on the web, while creator tools are promoted as app-only.

## Important privacy step before publishing
The supplied Express posts route currently returns all unexpired rows from `posts`; it does not visibly filter a public/private visibility field. Do not expose that endpoint to the public website until you confirm all rows are public or add server-side public visibility filtering. Filtering private posts only in browser JavaScript is not secure.

## Connect posts
`app.js` currently requests `https://megavallia.onrender.com/api/posts`. This assumes the router is mounted at `/api/posts`; confirm the `app.use(...)` line in your Express entry file. If mounted elsewhere, update `POSTS_ENDPOINT`.

The current client renders `content`, `media_url`, `media_type`, profile username, likes, and views from the route you provided. If CORS blocks the request, configure CORS for the deployed website domain in Express.

## Android download
Set `ANDROID_APK_URL` in `app.js` to the real HTTPS URL for your signed Android release APK after hosting it. The button is intentionally not pointed to a guessed or debug APK.

## Deploy
This is a static site: deploy the files in this folder to Vercel, Netlify, or Cloudflare Pages. No build command is needed; use the folder root as the output directory.
