# Refresh Pixel-Art Remasters

The creator selected a faithful pixel-art remaster rather than a smooth cartoon redraw. The built-in image generator produced transparent, higher-resolution atlases based on the original character art. These are new drawings, not recovered high-resolution masters. Original retains all archived sprites and animation timings.

- [Pierre atlas with baguette](../../public/assets/refresh/sprites/pierre-pixel-baguette-v2.png): 1470 x 1070, eight poses covering idle, running, rising, falling, wall contact, and defeat. His signature baguette is present in every pose, tucked away during wall contact and resting across his lap when defeated. This is cosmetic only, with no attack or collision changes.
- [Earlier Pierre atlas](../../public/assets/refresh/sprites/pierre-pixel-v1.png) is retained as the pre-baguette version.
- [Corgi atlas](../../public/assets/refresh/sprites/corgi-pixel-v1.png): 1448 x 1086, standing and three walking poses, also used by the boss.
- [Exact prompts and reference roles](prompts.json).
- [Baguette edit and correction prompts](baguette-v2-prompt.json), made with the built-in image tool and copied unchanged into the project with genuine transparency. The correction removes an extra hand from the rising pose.

PNG outputs are copied unchanged, retaining their real alpha channel. `src/game/refreshSprites.ts` defines measured frame rectangles. Frames are cropped at texture-load time, drawn at a constant pixel scale, and aligned by their feet to the existing collision boxes. Left-facing poses use runtime mirroring. The remaster uses a new four-step run cycle; it is not an upscale of the old twelve-frame animation. Corgis gain a four-step walking cycle. Physics, patrol boundaries, and level timings are unchanged.

Refresh renders a 2x backing canvas with a matching camera zoom, preserving logical world size and the mobile viewport while using the extra sprite detail on high-density screens. Original keeps its 1x renderer. Published in release `20261019T190851Z-5090dc0`; see [the deployment record](../../HOSTING.md).
