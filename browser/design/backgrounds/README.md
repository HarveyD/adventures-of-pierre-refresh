# Refresh Backgrounds

Generated illustrations based on the original `Background 1.png`, using the built-in image generator. These are new illustrations, not recovered school-project artwork. Approved versions are integrated into Refresh locally; this update has not been deployed. Original remains untouched.

| Refresh Chapter | Music | Background |
| --- | --- | --- |
| 1 | Training | Retain the original green landscape |
| 2 | Egypt | [Dunes and pyramids](egypt-dunes-v1.png) |
| 3 | Egypt | [Dunes and distant ruins](egypt-ruins-v1.png) |
| 4 | Snow | [Snowy hills](snow-v1.png) |
| 5 | Moon | [Moonlit hills](moon-v1.png) |

The brief keeps the first background's simple side-view composition, broad colour fills, thick uneven outlines, large upper-left celestial body, and quiet lower area. The winter candidate uses a blue lower area to help white snowy platforms remain readable. These are single-image backdrops, not seamless repeating textures.

[prompts.json](prompts.json) contains the exact prompt set and reference roles. Generated output files are copied unchanged; the originals remain in Codex's generated-image library.

The game uses unchanged PNG copies from `public/assets/refresh/backgrounds/`, referenced by `src/game/refreshBackgrounds.ts`. Chapter tinting and extra moving clouds are disabled for these illustrations. Each image is about 1.2 MB; only Refresh preloads them. Background cover sizing preserves the source aspect ratio at desktop and portrait sizes without repeating the sun or moon. The design directory itself is not published.
