# Restoration Record

## Historical Baseline

`Harvey Java` is the more developed surviving workspace; `Harvey Java 2` is an earlier prototype. Both main methods in the developed workspace, including the preserved Sidescroller bytecode, launch Sidescroller2. Original uses that implementation as its behavioral baseline. On October 19, 2026, the creator confirmed black regular platforms, as found in the larger Sidescroller draft, rather than the launcher's orange. Original now uses that draft's exact AWT platform palette and includes visible checkpoint flags. Neither draft is asserted to be a finished historical release.

Both Java classes hardcode `egyptian level.wav`. The creator requested chapter-specific music instead: training for chapter one, Egypt for chapters two and three, snow for chapter four, and moon for chapter five. This is an intentional restoration choice, not recovered Java track-switching behavior.

The original Java files, compiled classes, assets, level text, and archive copies have not been edited. Native reference captures and source hashes are kept in `reference/`.

## Shared Repairs

- Read the background/campaign header consistently, report invalid fields with source line numbers, and truncate integer division toward zero like Java. The source swallowed header errors.
- Replace racing Java threads with an ordered 5 ms schedule, 20 ms player steps, 10 ms platforms, and deterministic cosmetic randomness. Original enemies retain the 3 ms nominal step. Catch-up is capped at 100 ms per update.
- Keep legacy coordinates at the importer boundary and separate world positions, sprite anchors, and collisions. Axis collision resolves crossing surfaces instead of relying on a narrow polling window. Spawns inside the floor are normalized as the legacy collision window did. Touching checkpoint/finish edges get a one-pixel tolerance, including the maze's rounded negative-y finish.
- Reset terminal status, lives, clocks, held inputs, jump state, platforms, enemies, and boss state on retry/new run. A damage contact consumes one life, displays a brief death animation, then restores the checkpoint. Enemy/projectile immunity prevents immediate repeated damage; lethal terrain still consumes a life.
- Restart level grants five lives. New run starts chapter one. Death preserves the current checkpoint; restart returns to chapter start. Chapter changes grant five lives. Enemy/platform resets are consistent rather than retaining partially stale state.
- Start chapter one on its opening floor instead of reproducing Original's off-screen aerial spawn. Replace Original's five repeated, partly unbounded corgis with chapter-specific patrols. Both editions derive corgi height from a named supporting ledge, bound the entire 50 x 33 sprite footprint to that ledge, and clip patrols around obstacles. Original has 1/2/1/0/0 regular corgis by chapter; Refresh has 1/2/1/1/0, with the snow corgi on the upper platform. These are browser playability repairs, not changes to the preserved Java files.
- Reuse one renderer with bounded object collections, avoiding destroyed scene-object references during repeated play cycles. Stop remaining simulation work after state transitions.
- Render the landscape as one aspect-preserving, cover-scaled image, not a repeating tile. The source drawing has a single sun and non-seamless edges; tiling duplicated the sun horizontally and wrapped sky underneath the terrain vertically. Clamp any portrait overflow panning to the image edges. At desktop aspect ratio the backdrop stays anchored. Platform geometry and collisions are unchanged.
- Decode GIFs into composited PNG animation strips and retain source timing/transparency. Original images are preserved. Death lasts 360 ms instead of depending on repaint counts; animation continues during that interval.
- Render native menu artwork at its logical aspect ratio with accessible, aligned button regions. Credits remain Harvey and James. Browser menu actions replace process exit. Original's final finish now shows a thank-you screen.
- Reconstruct checkpoint flags in both editions because the draft's `checkpoint.png` and `checkpoint selected.gif` are absent. Mount poles on the supporting surface instead of the trigger's underground bottom, draw them after all terrain, and select flags by checkpoint ordinal. Original uses green unselected and yellow selected flags. Death preserves selection; chapter restart/new run clears it.
- Remove the artificial 100-frame loading screen. Required media has readiness/error/retry UI; compressed music loads only during play, falls back between MP3/Ogg, and stops in terminal states.
- Pause and clear held sources on focus loss. Aggregate overlapping keyboard/touch sources. Ignore repeated command keydown. Keep remapping and modal input out of gameplay. Save volume, bindings, and Refresh unlocks locally with validation.
- Add settings, pause/retry/menu/fullscreen controls, visible keyboard focus, and touch input to both editions. Refresh's camera adapts to portrait without shrinking the entire desktop scene into a narrow strip.

## Refresh Content Changes

The first three chapter definitions retain the imported geometry. The fourth removes its early finish, the unfinished isolated wall at source ordinal 12, and two anti-cheat ceilings. It adds an approach platform at (1100,250), a bridge at (1850,200), an upper step at (2070,50), a far ledge, and the exit at (4020,290). These repairs create a connected route through the draft's later snow obstacles. Original's fourth chapter retains the original early finish and all source platforms.

The final chapter uses a new arena built from the existing platform vocabulary and character art. Three boss stomps open the feast exit. A recovery step lets players rejoin the approach after a missed bounce. The boss is a scaled/cropped original corgi because the referenced flying-corgi sprite is absent. Its projectiles, flags, exit marker, and cake are simple game-native graphics; they are restorations/additions, not recovered artwork.

The original drawn landscape is reused and tinted for Refresh chapters because the larger draft's named mountain/desert/snow/moon backgrounds are missing. No missing-file labels are drawn over gameplay. The missing loading GIF and unused falling image are not required by the restored path.

## Verification Scope

See the executable tests and browser check scripts for current coverage. Action replay fixtures verify ordinary-control chapter completion in the shared runtime; separate browser checks verify rendering and UI integration. Patrol regression tests exercise 20 seconds of movement in every chapter of both editions, checking full-footprint support and absence of terrain intersections on every sampled step. Checkpoint tests cover every flag's supporting surface, exact selection, death persistence, and restart reset. Browser checks verify chapter-one Original spawn, per-chapter enemy counts/heights, actual chapter-track requests, and flag activation screenshots. Native recordings provide a visual/timing reference, not proof that Java's nondeterministic thread scheduling is reproduced. Physical-device testing and further creator confirmation of remembered game feel remain useful future checks.
