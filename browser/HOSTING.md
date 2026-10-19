# Hosting and Manual Deployment

Live URL: `https://www.harveydelaney.com/adventures-of-pierre/`.

The game was manually published on October 19, 2026. The packaging command below still only prepares local files: it does not publish anything, change DNS, restart containers, or modify the portfolio homepage. No GitHub Actions deployment is configured.

## Build the Package

From `browser/`, with dependencies installed:

```sh
pnpm build:hosted
```

This type-checks the app, builds for `/adventures-of-pierre/`, verifies the static entry pages, and packages the result:

```text
hosted-dist/
  adventures-of-pierre/
    index.html
    original/index.html
    refresh/index.html
    assets/
releases/
  adventures-of-pierre.tar.gz
  adventures-of-pierre.tar.gz.sha256
```

The archive contains the `adventures-of-pierre/` folder, ready to extract under a web server's static-file root. It excludes Java archives, raw WAV/GIF masters, dependencies, and diagnostic runtime hooks. The generated folders are ignored by Git; the packaging script and configuration are versioned source files. Node.js, installed browser-project dependencies, and the standard `tar` utility are required.

To verify the archive checksum, run from `releases/`:

```sh
shasum -a 256 -c adventures-of-pierre.tar.gz.sha256
```

## Test Without Route Rewrites

From `browser/`:

```sh
python3 -m http.server 8088 --bind 127.0.0.1 --directory hosted-dist
```

The root defaults to Refresh. Verify these paths, including refreshes and edition switching:

- `http://127.0.0.1:8088/adventures-of-pierre/`
- `http://127.0.0.1:8088/adventures-of-pierre/original/`
- `http://127.0.0.1:8088/adventures-of-pierre/refresh/`

Explicit `original/index.html` and `refresh/index.html` URLs also select the correct edition. This plain server does not rewrite missing paths to the app; a made-up route returns 404.

Against that running server:

```sh
PIERRE_URL=http://127.0.0.1:8088/adventures-of-pierre pnpm test:browser
PIERRE_URL=http://127.0.0.1:8088/adventures-of-pierre pnpm test:browsers
```

The first check uses installed Chrome by default; the cross-engine check also requires Playwright Firefox and WebKit. Tests cover real production entry pages, media loading, gameplay controls, edition selection, and desktop/mobile layouts. Production builds intentionally omit development mutation hooks; the unit suite separately verifies complete action-only campaigns.

## Existing Domain Hosting

Read-only inspection found that nginx proxies the domain to the `harvey-portfolio` Express container. Its app already serves the `public/` directory as static content. No new Express route or nginx/DNS change is needed for this folder.

The relevant paths are:

- Server source: `/root/docker-compose-harvey/harvey-server/public/adventures-of-pierre/`
- Running container: `/home/portfolio/src/public/adventures-of-pierre/`

The container currently has no bind mounts. Its Dockerfile copies the server source into the image. The manual deployment updated both the server source and the running container, but deliberately did not rebuild or retag the Docker image. Restarting the existing container retains its files. **Recreating it from the old image without rebuilding would lose the game.** Before future container recreation, rebuild from the updated server source or make a separately approved persistent-volume change. Do not rebuild or recreate the stack just to update game assets.

Before publishing, back up any existing game directory, stage the new folder separately, and limit the update to this game's prefix. Do not overwrite the entire `public/` folder or the portfolio's exported files. Static-file additions do not require a Node restart. Verify the public game root, both edition paths, media requests, and the existing homepage/side projects afterward.

The portfolio project card is a separate follow-up after the playable URL is live.

## Verified Manual Release

Release: `20261019T172613Z-9f265818e421`.

Package SHA-256: `9f265818e421848af0f525eded716cbe314a8b8f1996795a42563d23f3378dd1`.

Server staging and audit directory: `/root/pierre-deployments/20261019T172613Z-9f265818e421/`.

The `backups/source-before.tar.gz` archive in that private directory contains the pre-deployment compose configuration, server app, Dockerfile, public sitemap, and homepage HTML. The critical runtime files matched those source files before publishing. Pierre's destination did not exist in either location before this first release.

The package checksum and both staged copies were verified before promotion. Only Pierre's folder was renamed into place. Post-deployment checks verified all 34 public game files against the local package, both editions, explicit entry pages, and edition switching in Chrome, Firefox, and WebKit on desktop/mobile viewports. The homepage and seven existing side-project paths matched their pre-deployment status/content hashes. The existing `/compounding-savings/` 404 was present beforehand and was left unchanged. The container ID, image, start time, restart count, protected server files, and configuration hashes remained unchanged.

For this first release, rollback means renaming only `public/adventures-of-pierre/` out of the served path in the running container and server source, restoring the previous absent-game state. Keep the renamed files and private release archive for diagnosis. Do not restore the entire website or replace its `public/` directory to undo a game-only deployment. Future updates must back up the previous game release before promotion.
