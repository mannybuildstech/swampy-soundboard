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

## Audio assets and dynamic buttons

The soundboard UI is generated from `audio-assets/manifest.json` with these sections:

- `actions` (one-shot, first 5s)
- `characters` (one-shot, first 5s)
- `emotions-melodies` (one-shot, first 5s)
- `scenes` (loops continuously)

Whenever you add or remove files in `audio-assets/`, regenerate the manifest:

```bash
node generate-audio-manifest.mjs
```

## TODO

Asset TODOs:
- decide on character roster, find images (or generate them), pick and master sounds

alligator
cardinal, sandhill crane, 
dolphin, shark
panter, coyote


- decide on ambiance roster, find images and style them, add in.
   a. beach
   b. spring
   c. long leaf pine woods
   d. oaktree forest
   e. underwater

- decide on final action and melody roster (consider facial expressions to denote emotions)


Code TODO:
- audio recording
- tap again to mute? or tap again to create a new one?
- dynamic volume adjusting: everything slightly lowers when person narrates
- create an "overflow system" so that you can select more than what is shown on the screen (this can come later)


brainstorming:


story loop
|  scene loop - choose your scene --> record **
|  ^    1 - choose your character
|   \__ 2 - choose your action
|
|  scene loop - choose your scene --> record **
|  ^    1 - choose your character
|   \__ 2 - choose your action
|
|  scene loop - choose your scene --> record **
|  ^    1 - choose your character
|   \__ 2 - choose your action
.
\__ Share --> combines all 3