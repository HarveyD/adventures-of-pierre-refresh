# Adventures of Pierre

A restored browser edition of Harvey and James's Java platformer, alongside a refreshed edition with touch controls, movement assists, and a completed final encounter.

## Run

Use Node 22 or newer and pnpm 11:

```sh
pnpm install
pnpm dev --port 4187
```

Open `/original` or `/refresh`. The root opens Refresh. Both routes work as direct entry points. Original uses 1/3/Space; Refresh uses A/D or arrows and Space/W/Up. Both support remapping, touch controls, pause, mute, and fullscreen. Settings and unlocked Refresh chapters are stored locally.

## Check

```sh
pnpm test
pnpm build
PIERRE_URL=http://127.0.0.1:4187 pnpm test:browser
pnpm exec playwright install firefox webkit
PIERRE_URL=http://127.0.0.1:4187 pnpm test:browsers
```

The browser checks use installed Chrome by default. Set `PLAYWRIGHT_CHANNEL` to another installed Chromium channel as needed. Screenshots go to `/tmp/pierre-browser-check` and `/tmp/pierre-cross-browser`, or `PIERRE_SCREENSHOTS`.

The unit suite includes complete action-only chapter replays: they start at normal spawns and use only left/right/jump. They do not warp, grant lives, change collisions, or bypass the final objective. Separate diagnostic tests deliberately warp to isolate lifecycle and trigger cases. Browser integration covers animated rendering, remapping, repeated replay cycles, terminal recovery, multitouch, focus loss, and viewport resizing. Cross-engine checks cover Chromium, Firefox and WebKit; these are desktop automated checks, not a claim of testing every physical phone.

For a production smoke test, run `pnpm preview --port 4188` after building, then point either browser-check command at port 4188. Diagnostic mutation hooks exist only in development builds; production checks exercise the ordinary UI.

## Editions

Original follows the launcher-selected `Harvey Java/Sidescroller2.java` for menu artwork, controls, camera anchor, jump release, enemy movement rate, and background. The creator confirmed the larger `Sidescroller.java` draft's black regular platforms as the remembered appearance; its exact AWT palette is used, including orange moving platforms. Checkpoint flags are reconstructed because the referenced source images are missing. At the creator's request, both editions use chapter-specific music: training, Egypt, Egypt, snow, moon. Original retains the supplied level geometry. The sparse final level gets an explicit ending instead of leaving the player at an inert finish trigger. This is a restoration, not a bit-exact JVM emulator.

Refresh shares the level importer and simulation. It adds 100 ms of coyote time, a 120 ms jump buffer, a softer jump release, wall sliding, camera look-ahead, chapter selection, and a taller portrait viewport. Snow's unfinished later route has explicit bridge/step repairs and its exit is moved to the far ledge. The final stub is replaced by a playable arena with three boss stomps and a gated finish.

Refresh also adds chapter-specific illustrated backgrounds, landing dust, stomp and boss impact bursts, and animated checkpoint flags with activation chimes. Short synthesized cues share the existing mute/volume controls and stop on pause, menu, restart, and death. Visual effects respect reduced-motion preferences. These additions do not change collision rules or run timing; Original keeps its existing art and audio behavior.

Refresh wall jumps recognize neutral wall contact, allow 120 ms of wall grace, and buffer an early jump press. A smaller sideways kick and 60 ms steering lock make repeated jumps up the same wall easier. The first 120 ms of rise are protected from a quick release, and wall slides are slower. Holding jump does not auto-climb, and consumed wall contact cannot grant midair double jumps. Original retains its previous wall behavior.

Refresh terrain is drawn as continuous fills with caps only on exposed surfaces, removing internal rectangle seams. Each chapter has a surface-mounted checkered finish arch; the boss exit displays a lock until the fight is won. Pierre and the corgis use new transparent pixel-art remaster atlases with foot-aligned frames and unchanged hitboxes. Refresh uses a 2x backing canvas for sharper high-density display. See [sprite sources and exact prompts](design/sprites/README.md); Original retains its source art and animation timings.

Platform materials follow each chapter: mossy stone, layered sandstone, carved ruins, glacial ice, and lunar rock. Deeper surface caps and exterior-only bevels make the walking edges and wall-jump surfaces clearer without outlining internal joins. Moving platforms use amber metal treads; trampolines have a cyan spring bed. Small native textures are baked once and rendered through a reusable tile pool, with static patterns anchored to the world and moving textures anchored to their platforms. This is a visual change only.

See [RESTORATION.md](RESTORATION.md) for the detailed change record and [reference/](reference/) for native screenshots and measurements.

## Media

Source art and audio remain untouched in the Java folders and archive. Browser derivatives are included in `public/assets/derived/`, so normal development does not require conversion tools.

To regenerate them, use Python with Pillow and an FFmpeg binary supporting libmp3lame/libvorbis:

```sh
python3 scripts/prepare-media.py --ffmpeg /path/to/ffmpeg
```

GIFs are composited into PNG strips with original frame timing and loop metadata. `media.json` records source SHA-256 hashes. Audio is encoded as 96 kb/s MP3 with an Ogg alternative. No audio is requested on the menu; the current chapter's track loads on play. Optional audio failure does not block gameplay. The build publishes only referenced original images, level data, and derivatives, excluding the large WAV/GIF masters and unused experiments.

New Refresh illustrations live in `public/assets/refresh/backgrounds/`; generated source copies and prompts are documented in [design/backgrounds/](design/backgrounds/README.md). Training retains the original scene, followed by Egyptian dunes, Egyptian ruins, snow, and moon artwork. Original does not request the new illustrations. Web Audio for impact cues is initialized only by a play/input gesture and fails silently if unsupported.

## Hosting

`pnpm build` produces a static `dist/` directory, including real `original/index.html` and `refresh/index.html` entry pages. A static host with directory indexes can serve both editions without SPA fallback rewrites. For a subdirectory deployment:

```sh
PIERRE_BASE_PATH=/pierre/ pnpm build
```

Asset URLs, edition links, and route detection respect that base. The app needs no server-side API or account.

For the prepared `harveydelaney.com/adventures-of-pierre/` package, run `pnpm build:hosted`. This creates an isolated `hosted-dist/` tree plus `releases/adventures-of-pierre.tar.gz` and its SHA-256 checksum. It does not upload or deploy anything. See [HOSTING.md](HOSTING.md) for local static-server checks and the existing server's deployment layout.

## Reference Capture

`scripts/CaptureReference.java` instantiates the archived launcher-selected class, captures the Swing content pane, and samples native movement. Compile Java sources into a temporary directory and run from the original asset folder; never compile into the archive. The existing capture measured a 1280 x 740 outer frame and 1280 x 712 content pane on macOS. The browser uses the artwork's 1280 x 720 logical canvas, restoring the eight clipped bottom pixels.

`scripts/audit-archive.mjs` verifies the preserved copies and emits source hashes. The native audio helper produces an error for the original 24-bit WAV on this Java runtime; browser playback uses converted media instead.
