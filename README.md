# Adventures of Pierre

A browser revival of Harvey and James's school platformer, preserving the surviving Java project alongside Original and Refresh editions.

Play online: [Refresh](https://www.harveydelaney.com/adventures-of-pierre/) or [Original](https://www.harveydelaney.com/adventures-of-pierre/original/).

## Play Locally

Use Node.js 22 or newer and pnpm 11:

```sh
cd browser
pnpm install
pnpm dev --port 4187
```

Open [Original](http://127.0.0.1:4187/original) or [Refresh](http://127.0.0.1:4187/refresh). The root route opens Refresh.

## Project Layout

- `browser/`: the playable Vite, TypeScript, and Phaser app, tests, media derivatives, and reference captures.
- `Harvey Java/`: the more developed surviving Java workspace, preserved unchanged.
- `Harvey Java 2/`: the earlier Java prototype, preserved unchanged.
- `archive/`: verified copies of the surviving school project.
- `REVIVAL_PLAN.md`: the original audit, implementation status, and restoration handoff.

Original uses the remembered black platform palette, original artwork and controls, chapter-specific music, and reconstructed checkpoint flags. Refresh adds movement assists, responsive touch controls, a repaired snow route, and a completed final encounter. Both editions share the level importer and simulation.

See [the browser README](browser/README.md) for build, test, and hosting instructions, and [the restoration record](browser/RESTORATION.md) for historical evidence, creator-confirmed choices, and reconstructed content.

For a ready-to-upload package targeting `harveydelaney.com/adventures-of-pierre/`, run `pnpm build:hosted` from `browser/`. See [the hosting preparation guide](browser/HOSTING.md). This prepares local files only; it does not deploy to the server.

## Verify

From `browser/`:

```sh
pnpm test
pnpm build
PIERRE_URL=http://127.0.0.1:4187 pnpm test:browser
```

The test suite includes complete action-only playthroughs of both campaigns. Dependency directories, build output, local environment files, Eclipse workspace caches, and macOS metadata are not committed. Original media and browser-ready derivatives are included so a fresh checkout can run without media-conversion tools.
