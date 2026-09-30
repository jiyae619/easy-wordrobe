# Stylemax promo video

**`stylemax-promo.mp4`**: 28 s, 1920×1080, 24 fps, H.264 + AAC stereo.

## Concept: "Your closet, finally awake"

The hook comes from the README's own stat: most people wear only about 20% of their wardrobe. The film opens on a dark closet where every garment is grey and asleep. On the beat drop, a scan beam sweeps the rail, each piece wakes into colour, and they lift off their hangers. The film then shows the three agents doing that job in the real app.

| Time | Beat | What you see |
|---|---|---|
| 0–4 s | intro | 3D rail of grey garments, dust in a shaft of light. "80% of your closet *is asleep.*" |
| 4–7 s | drop | The lights come on, a scan beam wakes each garment and they float off their hangers. "Let's wake it up." |
| 7–11 s | Step 1 · Scan | A phone whips in, the real scanner screen snaps a 3D leather jacket, and IntakeAgent's tags pop out around it (Outerwear · Black · Spring/Fall · Casual/Creative). |
| 11–16 s | Step 2 · Style | Mood chip tap → loading → the real outfit cards, while the same outfit assembles in 3D beside the phone, with Weather/Rotation scores. |
| 16–20 s | Step 3 · Notice | Breakdown. The Insights screen, with BehavioralAgent's nudge typed out large: "Your blue denim jacket hasn't seen sunlight in 3 weeks." |
| 20–24 s | montage | Beat-cut *Scan. Style. Wear. Repeat.*, then the payoff: **18/22 pieces back in rotation**. |
| 24–28 s | end card | Every garment bursts out and orbits the Stylemax lockup on dark olive. "Your closet, finally awake." |

## How it was made

- **Real app screens** (`capture/`). The actual React app is served by Vite. Only the network-bound modules (Firebase, AI proxy, weather) are swapped for in-memory mocks with a seeded 22-item closet. The real agents' post-processing still runs. Playwright captures 390×844 @3x. Nothing under `src/` is modified.
- **3D (Blender, via the `bpy` Python module)** (`blender/`). Every asset is procedural: soft "inflated vinyl" garments extruded from silhouettes (tee, denim/leather jacket, blazer, knit, dress, skirt, jeans, sneaker, boot, loafer), hangers, a rail, a phone and a cyclorama. Rendering uses Cycles on CPU at 4 spp with OIDN denoising. Each shot exports per-frame screen corners and anchor points (`track.json`).
- **Compositor** (`composite.py`). App screens get an iOS status bar and a dynamic island, then are corner-pinned onto the 3D phone so the UI stays pixel-sharp. The compositor also draws kinetic type (Poppins, brand olive palette), the AI tag chips and the 2D sections.
- **Music** (`audio/compose.py`). An original 120 BPM house cue synthesised in numpy (kick/clap/hats, sidechained bass, supersaw pads, plucked hook, riser into the drop, final hit), with SFX placed on the edit (`sfx.json`: shutter, tag blips, whooshes, shimmer). Every cut lands on a beat (12 frames = 1 beat).

### About ElevenLabs / Meshy

The session that built this couldn't reach `api.elevenlabs.io` or `api.meshy.ai` (blocked by the network policy), and no API keys were available. So:

- The **music** is synthesised locally. To use ElevenLabs instead, run `ELEVENLABS_API_KEY=... python3 audio/elevenlabs_music.py audio/elevenlabs_score.mp3`. Its prompt is written against the same beat map. Then re-encode with `MUSIC=audio/elevenlabs_score.mp3 ./build.sh` (or just the final ffmpeg step).
- The **3D** uses Blender (one of the two options requested). Meshy wasn't needed.

## Rebuild

```bash
pip install bpy==4.5.14 numpy scipy pillow     # Blender as a Python module (Python 3.11)
(cd promo/capture && npm i)                    # Playwright + Poppins
# fake camera feed for the scanner: any clothing photo ->
ffmpeg -loop 1 -i jacket.jpg -t 3 -vf scale=1280:720 -pix_fmt yuv420p promo/capture/camera_feed.y4m
./promo/build.sh
```

`screens/`, `renders/`, `out/` and `fonts/` are build products and are git-ignored.
