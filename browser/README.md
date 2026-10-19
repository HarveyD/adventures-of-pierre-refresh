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

See [RESTORATION.md](RESTORATION.md) for the detailed change record and [reference/](reference/) for native screenshots and measurements.

## Media

Source art and audio remain untouched in the Java folders and archive. Browser derivatives are included in `public/assets/derived/`, so normal development does not require conversion tools.

To regenerate them, use Python with Pillow and an FFmpeg binary supporting libmp3lame/libvorbis:

```sh
python3 scripts/prepare-media.py --ffmpeg /path/to/ffmpeg
```

GIFs are composited into PNG strips with original frame timing and loop metadata. `media.json` records source SHA-256 hashes. Audio is encoded as 96 kb/s MP3 with an Ogg alternative. No audio is requested on the menu; the current chapter's track loads on play. Optional audio failure does not block gameplay. The build publishes only referenced original images, level data, and derivatives, excluding the large WAV/GIF masters and unused experiments.

## Hosting

`pnpm build` produces a static `dist/` directory. Configure the host to serve `index.html` for `/original` and `/refresh`. For a subdirectory deployment:

```sh
PIERRE_BASE_PATH=/pierre/ pnpm build
```

Asset URLs, edition links, and route detection respect that base. The app needs no server-side API or account.

## Reference Capture

`scripts/CaptureReference.java` instantiates the archived launcher-selected class, captures the Swing content pane, and samples native movement. Compile Java sources into a temporary directory and run from the original asset folder; never compile into the archive. The existing capture measured a 1280 x 740 outer frame and 1280 x 712 content pane on macOS. The browser uses the artwork's 1280 x 720 logical canvas, restoring the eight clipped bottom pixels.

`scripts/audit-archive.mjs` verifies the preserved copies and emits source hashes. The native audio helper produces an error for the original 24-bit WAV on this Java runtime; browser playback uses converted media instead.
