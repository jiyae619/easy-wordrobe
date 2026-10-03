# Design Concepts — Beyond the Grid

Three directions for redesigning how Stylemax shows the wardrobe and suggests outfits. The goal is to replace the grid with more playful motion that feels 3D, without slowing the app or hiding its core loop: **wardrobe → AI outfit → "wear it" → insights**.

Interactive prototypes (9 phone screens, all built with real catalog photos): **https://claude.ai/artifact/NFqgd8mVJerN2ZF5yJCkNf** (open a screen and press Play).

All three keep the current agent contracts unchanged. Only the presentation layer changes.

> **Chosen direction (implemented):** B · Mix Reels as the structure, with A's hanger rails as the Closet and A3's mirror as the card face inside B3's swipe stack. Tabs: **Today** (reels + Spin) · **Closet** (hanger rails) · (+ Scan) · **Picks** (mirror cards: right = wear, left = skip, up = tweak on the reels) · **Stats**.

| | A · The Walk-in | B · Mix Reels | C · Orbit |
|---|---|---|---|
| Metaphor | A real closet: rails, hangers, mirror | A slot machine you dress with | Your wardrobe as a planet you spin |
| Feel | Warm, tactile, calm | Bold, playful, fast | Futuristic, spatial, "wow" |
| Wardrobe view | Swinging hanger rails per category, shoe cubbies | Category decks that fan out like a hand of cards | 3D sphere of items; lenses re-sort it by type, colour or dusty |
| Item detail | "Off the rail" turntable (front/back flip, 3D-ready) | Card lifts out of the fan | Hologram plinth plus orbiting "pairs with" pieces |
| Suggest flow | Mirror: AI keeps 3 looks aside on a rolling rack; tap a piece to swap it | Today = 4 reels (layer/top/bottom/shoes). Lock pieces, **Spin** = AI fills the rest. Picks = swipe deck of the 3 AI looks | Looks shown as constellations; swipe between 3, items morph into place |
| Navigation | Closet · Mirror · (Scan) · Diary · You | Today · Decks · (+) · Picks · Stats | Orbit · Looks · (+) · Pulse (floating pill) |
| Perf risk | Low | Lowest | Medium (cap visible discs) |
| Build effort | Medium | Low–Medium | High |

## How each maps onto today's app

- **Rotation / neglect signal**, from `computeSeasonalLeastWornIds`: shown as a swinging dust tag (A), a `26d` badge plus a "Dusty first" sort (B), or items drifting out of orbit (C).
- **"Will try"** (`tryItItemIds`): "Will try this week" (A2), "Bring back into orbit" (C2).
- **Skip / wear signals**: B3's swipe directions map directly. Right calls `logOutfitWear`, left logs a skip to `suggestionEvents`, and up saves the look for later. A3 and C3 use explicit buttons.
- **StylistAgent output** (3 outfits with tone hype / editorial / warm): rendered as 3 rack tags (A), 3 swipe cards (B), or 3 constellations (C). Scores stay code-computed.
- **B1 "Spin"** is new: send the locked item IDs as hard constraints and let StylistAgent fill the other slots. This is a small prompt and validation change; the outfit-shape rules stay the same.

## 3D path (staged, poster-first)

1. **Now: CSS fake-3D** on every item. Uses `perspective`, `rotateY` with a front/back face, drag inertia and depth scaling, so it works on any upload at 60fps.
2. **Optional: depth-map parallax.** A depth map is generated once at upload (e.g. Depth Anything V2 Small in the browser) and drives a small shader on the detail view only.
3. **Opt-in: photo-to-3D mesh** (Tripo / Meshy / SF3D). Generated server-side, stored as a GLB, and shown with `<model-viewer>` using `poster` and `reveal="interaction"`, so the model loads only on the detail view after a tap.

## Performance guardrails

- Animate only `transform` and `opacity`. Run one `requestAnimationFrame` loop per screen that sleeps when nothing moves (the prototypes do this).
- Use real cutouts (transparent WebP) from intake instead of `mix-blend-mode: multiply`. The prototypes use multiply only because the catalog photos have white backgrounds.
- Thumbnails at about 2× display size (the catalog WebPs are 1.5–12 KB). Load full resolution on detail only.
- Virtualise: rails and reels reuse about 7 nodes each. In the Orbit view, cap around 60 visible discs and cluster the rest. Pause off-screen loops (IntersectionObserver / `visibilitychange`).
- No WebGL outside the detail view. At most one canvas, lazy-imported, disposed on exit.
- `prefers-reduced-motion`: swap swing, spin and orbit for crossfades. Haptics (`navigator.vibrate`, Android only) are a bonus, never the only feedback.
- Keep primary actions (Wear, Spin, Skip) in the bottom third of the screen, with targets of at least 44px.

## References

Whering "Dress Me" and Combyne "Swipe" (reel builders) · Whering daily swipe · Cladwell daily 3 + swap · Apple Wallet card stacks · Cover Flow in CSS (scroll-driven `rotateY`) · Zara finger-tracked category swipe · GOAT AR / `<model-viewer>` poster-first 3D · View Transitions API for item → detail morphs. The hanger-rail pattern exists only as concept shots, which makes it a chance to stand out.
