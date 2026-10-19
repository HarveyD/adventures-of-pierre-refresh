# Adventures of Pierre: Browser Revival Handoff

## Implementation Status

The implementation described below is now in `browser/`. See `browser/README.md` for running and testing it, and `browser/RESTORATION.md` for the exact Original/Refresh decisions. The remaining sections preserve the audit that guided the work, rather than an unstarted scaffold proposal.

Both five-chapter campaigns have complete action-only regression replays from the initial spawn through the final screen. Those tests use no warps, level selection, state injection, or damage allowance. Refresh's run includes three boss stomps and its gated ending. The unit suite has 63 passing tests. Browser checks cover repeated replay, animation, touch, remapping, focus loss, failures, and desktop/portrait/landscape layouts; Chromium, Firefox, and WebKit smoke checks pass. The source/archive copies remain unchanged.

Creator confirmation on October 19, 2026 overrides the proposed presentation baseline below: Original uses the larger draft's black regular platforms and exact AWT palette, reconstructed checkpoint flags, and chapter-specific music as requested. Launcher-selected controls, camera, and movement remain. See `browser/RESTORATION.md` for the precise decisions and missing-artwork notes.

The browser restores the source artwork's 1280 x 720 logical canvas; a native Java capture measured a 1280 x 712 content pane inside the 1280 x 740 outer frame on this Mac. This is an explicit restoration decision. Generated media, native reference captures, source hashes, and reproducible check scripts are included with the implementation.

Reassessed October 18, 2026 against the Java sources, archived bytecode, and the existing browser implementation. This replaces the initial scaffold plan. Improve the app in `browser/`, which already exists.

## Reference and Fidelity

`Harvey Java` remains the more developed snapshot. `Harvey Java 2` contains earlier prototypes. Source content supports this conclusion; the two-second difference in backup timestamps does not establish development order.

The earlier plan conflated the most ambitious source with the version the launcher actually runs:

| Evidence | Implication |
| --- | --- |
| `Harvey Java/Sidescroller.java` adds checkpoint visuals, boss logic, and more asset references. | A valuable final-draft reference, but not proof of a finished release. |
| Its `main()` constructs `Sidescroller2`. That class's own main does the same. Inspection of the preserved `Sidescroller.class` with javap confirms this. | Both launch paths select `Sidescroller2`. Do not silently substitute the larger draft and call it the exact original. |
| `Sidescroller.java:435` starts reading platform counts without consuming the background/campaign header in `Levels2.txt`, then swallows the number-format error. | Running the larger draft directly would not load the supplied levels correctly. |
| `Sidescroller2.java:331` consumes the background line only during gameplay. Its initial menu-time read instead tries to parse that line as a number and silently fails. | The launcher-selected implementation also needs documented restoration repairs. |
| `Levels2.txt` has five blocks with counts `22,18,28,23,3`. | Five blocks do not establish five finished levels. The final block is a small stub. |
| The existing archive copies match both top-level Java folders recursively. | Preserve these copies. More duplicate archives are unnecessary. |

**Recommended Original baseline:** restore the launcher-selected `Sidescroller2` behavior, using `Sidescroller.java` as supplemental evidence and a source of Refresh ideas. Record this choice before changing gameplay because the current browser runtime mostly follows the larger draft. Confirm against a native recording and the creators' recollection before describing either as a particular historical release.

Original should preserve the art, credits, level geometry, movement feel, and quirks that matter. Repairs to loading, terminal state, browser input, or incomplete endpoints should be documented in a restoration change log. A faithful restoration need not reproduce thread races or a broken loader.

## Current State and Verification

The existing app already uses Vite, TypeScript, and Phaser. It has `/original`, `/refresh`, a legacy asset manifest, parser, scenes, and a renderer-independent `PierreRuntime`. Keep this foundation; there is no need to scaffold two new applications or a monorepo.

Checks performed during this reassessment:

- Two test files with four tests pass. They cover parser examples and manifest declarations, not gameplay.
- TypeScript and Vite production builds pass. Production JavaScript is approximately 1.24 MB before compression.
- Direct runtime probes reproduce failed recovery after game over, premature final completion, and acceptance of malformed numeric data.
- Refresh was opened in installed Chrome through Playwright. The restart failure was reproduced through the UI.
- At 390 x 844, the Refresh canvas was approximately 316 x 183 at y=693, extending below the first viewport. Explanatory UI occupies most of the screen.
- Original's full game-over/menu/replay automation timed out and remains unverified. No full campaign playthrough was performed. Diagnostic warps test triggers, not natural reachability.
- Java 21 is now available. All five Java source files in `Harvey Java` compiled into a temporary directory with deprecation/unchecked warnings. The native GUI was not launched.

## Prioritized Repairs

### P0: Run Lifecycle and Replay

`browser/src/game/runtime.ts:288` resets positions in `restartLevel()` but retains terminal status and zero lives. After five deaths, Restart Level leaves the game in `game-over`; updates refuse to advance. `PlayScene.startRun()` also does not create a fresh run from a terminal state.

Define explicit commands and state transitions:

- New run resets campaign, lives, checkpoint, enemies, boss, clocks, held actions, and pending events.
- Retry after game over restores a playable status and life allowance.
- Restart during play returns to level start with a documented life policy.
- Damage respawn consumes exactly one life and restores checkpoint state.
- Level transition stops processing the old level immediately.

Reset accumulator/tick phase, jump-release latch, wall timers, collision permissions, and level entities deliberately. Stop the remaining simulation work after death/completion/transition so it cannot operate on stale state.

Check Phaser scene reuse: `PlayScene.create()` appends clouds to instance arrays, while shutdown does not clear those arrays. A restarted scene can retain references to destroyed objects. Clear/recreate scene-owned collections and test repeated menu -> play -> game over -> menu -> play cycles.

Acceptance: fifth death reaches game over; retry and new run recover; repeated Original scene cycles produce no errors or missing sprites.

### P0: Honest Campaign Progression

The fifth block in `Levels2.txt:98` has only three platforms. After half-scaling, its finish trigger is at x=1500. Boss rendering uses x=4550; boss-hit logic requires xPos around 3900..4100. The current runtime marks the campaign finished at the early trigger while the boss still has all three lives. The available geometry does not establish a playable boss arena.

Original should retain its chosen baseline's geometry and explicitly document the incomplete endpoint. Any added ending behavior is a restoration change. Refresh should have a separate arena/content override, a reachable boss encounter, and completion gated on its final objective. The fourth level also has an early finish at `Levels2.txt:78` despite substantial later geometry; audit it intentionally.

Acceptance: test every advertised level from its normal spawn using ordinary controls. Debug warps cannot certify completion. Refresh's final objective must be reachable and must not be bypassed by an earlier finish box.

### P1: Animated Player Assets

`BootScene.preload()` loads all GIFs through `load.image()`. The installed Phaser loader explicitly documents that animated GIFs render only their first frame (`node_modules/phaser/src/loader/filetypes/ImageFile.js:254`). Switching textures on image objects does not restore animation.

Build a reproducible conversion from source GIFs to PNG atlases with frame timing metadata. Preserve transparency, frame offsets, disposal behavior, variable durations, and loop counts. Keep source assets intact and use stable sprite anchors separate from collision bodies.

Acceptance: run/idle/fall/wall/death assets visibly animate where the original GIFs contain multiple frames; sprite frame changes do not shift the collision body.

### P1: Legacy Number Semantics and Validation

The parser uses floating-point `/ 2`; Java uses integer division. Real examples: 5/2 is 2 in Java and 2.5 in the port; -1001/2 is -500 versus -500.5. These occur in checkpoint/finish geometry and movement offsets. Some current tests bless fractional values.

Validate whole numeric tokens before conversion. Reject NaN, partial numbers, unsupported type ids, negative counts, nonpositive dimensions, and absent movement fields with original source-line/field context. Use `Math.trunc(value / 2)` for imported legacy coordinates, dimensions, ranges, and offsets. Retain immutable parsed definitions and clone mutable runtime positions.

Type 6 is a vertically moving lethal region in the larger draft, not a rideable elevator by assumption.

Acceptance: malformed input fails clearly; supplied counts remain 22,18,28,23,3; odd positive and negative integers match Java division.

### P1: Startup, Loading, and Audio

All four uncompressed WAVs, approximately 80 MB combined, are eagerly queued before the menu appears. The legacy asset directory is about 87 MB. This matters more initially than JavaScript chunk size.

Preserve WAV masters and generate browser derivatives with a verified format fallback. Load menu essentials first, then current-level media; prefetch later tracks during play. Optional audio failure should allow muted play. Required assets need real progress/error/retry states.

Unlock audio on a user gesture and manage one music instance. Gate music by lifecycle state: `ensureMusic()` currently runs every started frame, including terminal states, so a completion event stopping music is insufficient.

Replace the 100-render-frame loading overlay with real readiness and elapsed-time behavior. It currently hides active gameplay for different durations on different displays. Large missing-file text labels belong in developer diagnostics, not across the playable screen.

Acceptance: menu startup does not require every WAV; failed audio does not block play; terminal states do not restart music; simulation does not run behind an artificial loading overlay.

## Original and Refresh Design

Use one app and shared systems where behavior agrees. Start with a small typed mode configuration and explicit content overrides. Extract abstractions only when concrete differences justify them.

| Area | Original | Refresh |
| --- | --- | --- |
| Identity | Original artwork and credits to Harvey and James | Same characters and handmade identity, with completed content |
| Controls | 1/3/Space and remapping | Arrows/A-D, jump aliases, remapping, touch |
| Movement | Documented legacy constants and jump release | Initially the same; then configurable coyote time, jump buffering, acceleration/braking tuning |
| Camera | Reconstructed legacy framing/parallax | Follow with limited look-ahead and stable framing |
| Levels | Imported geometry with documented repairs | Copy-on-write overrides, repaired progression, finished ending |
| UI | Bitmap menus with aligned, focusable actions | Compact HUD, pause, retry, settings, level select |
| Persistence | Local settings without accidental life-rule changes | Versioned local progress and settings with explicit reset |

Suggested incremental additions inside the current project:

```text
browser/src/game/
  runtime.ts       # Commands, state, simulation, events
  levelParser.ts   # Strict legacy import
  modeConfig.ts    # Small explicit mode differences
  input.ts         # Physical inputs -> semantic actions
  legacyAssets.ts  # Asset mappings and provenance
  content/         # Spawns, enemy placements, goals, Refresh overrides
  scenes/          # Extract from phaserApp.ts when editing those scenes
```

Keep the existing 5 ms simulation schedule initially, with consistent ordering and bounded catch-up. Compare it with native recordings before changing rates. Java's enemy thread sleeps about 3 ms, while the port advances enemies every 5 ms: current behavior is already approximate. Avoid recreating thread races. Record input edges and seed cosmetic randomness for reproducible comparisons.

Use explicit world coordinates and document legacy screen-offset conversion at a boundary. Separate visual anchors and collision bodies. Test narrow triggers, fast wall jumps, and moving-platform carry before replacing collision logic. Evaluate a proven collision system for Refresh if needed; changing engines during initial fidelity/lifecycle repair would make comparison harder.

## Input and Layout

Refresh currently differs mainly through bindings, colors, and an explanatory shell. Give it a game-focused experience:

- Make the game surface the main viewport content. Use Adventures of Pierre as the title, a compact mode switch, and a small HUD/settings area. Move engineering explanations into documentation.
- Establish logical content size from the artwork and native content-pane measurement. Images are 1280 x 720; Java sets the outer frame to 1280 x 740. The port stretches images to 740 while retaining unscaled hit regions. Align both with a single transform.
- Define an aspect ratio and fit to available width AND height. Support fullscreen and phone landscape.
- Aggregate held keys/pointers: releasing A while ArrowLeft remains held must not cancel movement.
- Prevent gameplay-key scrolling while the game has focus. Clear held actions and pause on blur/visibility change.
- Ignore repeat keydown for pause/restart. Route input only to the active state, including remapping.
- Add touch controls with multitouch and pointer cancellation, outside the active play area.
- Use keyboard-focusable menu actions and visible focus. Persist bindings, volume, mute, and Refresh progress with a versioned save schema.

Acceptance: gameplay is visible without scrolling past prose, phones have usable controls, focus loss cannot leave movement stuck, and pausing/remapping cannot move the player.

## Asset Recovery

The manifest is a useful start, but its tests only inspect declarations. Validate case-exact files against the filesystem, decode referenced media, and track source names, hashes, substitutions, and generated derivatives.

The larger draft references 12 genuinely absent files after case-insensitive matching:

`LOADING ANIMATION.gif`, `Mountains background.jpg`, `cake slice.gif`, `checkpoint selected.gif`, `checkpoint.png`, `desert background.jpg`, `fire ball.gif`, `flying corgi.gif`, `moon level background.jpg`, `pierre falling.gif`, `snow background.jpg`, and `testicle.jpg`.

Two more are case-only differences: `cloud 1.png` -> `Cloud 1.png` and `pierre running right.gif` -> `Pierre running right.gif`.

Inventory actual use before replacing everything. Some missing references are unused by render logic or absent from the selected Original baseline. Existing background/boss mappings are substitutions, not recovered originals. Preserve that distinction. Replace intrusive development placeholders with fitting fallback visuals for playable builds; maintain separate Refresh additions.

## Implementation Sequence and Gates

1. Pin the baseline with source/bytecode hashes, native frame dimensions, a short movement/menu recording, and a restoration change log. Compile native copies outside the archives.
2. Repair lifecycle, terminal recovery, scene reuse, Java integer conversion, and invalid-data errors. Add regression tests reproducing current failures.
3. Restore a complete first-level slice: animation, movement, wall jumps, trampoline, checkpoint, hazard, enemy, exit, replay. Check both modes.
4. Audit every level and checkpoint through ordinary-control play. Document Original's incomplete content and complete Refresh's final encounter separately.
5. Convert media, load by level, align bitmap menus, focus layout on gameplay, and add pause/settings/touch.
6. Tune Refresh movement/camera and add level select/progress saves. Replay Original checks to detect accidental behavior changes.
7. Verify a built static deployment, including direct /original and /refresh loads with SPA fallback. Use base-aware assets if hosted under a subdirectory.

Required regression coverage:

- Fifth death, retry, restart after completion, new run, and repeated Original scene reuse.
- One life loss per hazard contact; checkpoint and entity reset policy.
- Jump press/release, wall jump, moving-platform carry, narrow triggers, and transitions.
- Equivalent fixed-step outcomes under different render-delta chunkings within the catch-up cap.
- Legacy integer conversion and malformed numeric tokens.
- Final objective policy, including Refresh boss defeat.
- Asset existence/case/decode and visibly changing animation frames.
- Desktop/phone controls, focus loss, mute, and failed/blocked audio.

Visual checkpoints: 1440 x 900, 1280 x 720, 390 x 844, and phone landscape. Check Chromium, Firefox, and Safari/WebKit before claiming cross-browser support. Require an ordinary-control completion run for every advertised level; screenshots alone are insufficient.

## Prompt for the Implementation Agent

Read this plan and inspect the existing browser app. Begin with the confirmed restart/game-over defect, terminal transitions, scene reset ownership, and parser compatibility. Add focused regression tests. Use the launcher-selected Sidescroller2 as the proposed Original baseline and the larger Sidescroller draft as supplemental evidence; record restoration decisions explicitly. Preserve Java/archive files. Restore GIF animation with a reproducible conversion, reduce eager audio loading, and verify ordinary level progression. Keep Original stable while Refresh gains movement assists, compact gameplay UI, touch controls, and a completed final encounter. Verify both modes in the production build and document incomplete content/substitute art honestly.

