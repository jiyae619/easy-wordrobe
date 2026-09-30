#!/bin/bash
# Rebuild the Stylemax promo video end to end. Run from anywhere.
#   Needs: python3 with `pip install bpy==4.5.14 numpy scipy pillow`, ffmpeg, node 22.
#   Step 1 (screens) needs the capture deps: (cd capture && npm i) and a camera_feed.y4m (see README).
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d screens ]; then
  echo "== capturing real app screens (mocked backend)"
  (cd .. && node node_modules/vite/bin/vite.js --config promo/capture/vite.demo.config.ts > /tmp/stylemax-vite.log 2>&1 &)
  sleep 6
  (cd capture && node capture.mjs home wardrobe scan suggest insights)
fi

mkdir -p fonts
for w in 300 400 500 600 700 800; do cp -n capture/node_modules/@fontsource/poppins/files/poppins-latin-$w-normal.woff fonts/ 2>/dev/null || true; done
cp -n capture/node_modules/@fontsource/poppins/files/poppins-latin-{300,500}-italic.woff fonts/ 2>/dev/null || true

echo "== 3D renders (Cycles CPU; ~15 s/frame on 4 cores)"
python3 blender/phone_front.py
python3 blender/shot1_wake.py -- 1 168
python3 blender/shot2_scan.py -- 168 263
python3 blender/shot3_suggest.py -- 264 383
python3 blender/shot6_end.py -- 576 671

echo "== score + composite + encode"
python3 audio/compose.py audio/sfx.json audio/score.wav
python3 composite.py
ffmpeg -y -framerate 24 -i out/frames/%04d.png -i "${MUSIC:-audio/score.wav}" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high \
  -af "loudnorm=I=-14:TP=-1.0:LRA=9" -c:a aac -b:a 192k -movflags +faststart -shortest \
  stylemax-promo.mp4
echo "wrote promo/stylemax-promo.mp4"
