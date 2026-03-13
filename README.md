# Swampy Soundboard

This site is intentionally served directly from the repository root so GitHub Pages can publish updates automatically from `main`.

## GitHub Pages setup (one-time)

1. Open **Settings → Pages** in your GitHub repository.
2. Under **Build and deployment**, set:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`
   - **Folder**: `/ (root)`
3. Save.

After that, every commit to `main` redeploys the site from the root files (`index.html` + `app.jsx`).
