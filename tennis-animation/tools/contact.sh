#!/usr/bin/env bash
# contact.sh — contact sheets from rendered frames for visual QA. usage: tools/contact.sh [frames_dir] [out_dir] [every_n]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; FRAMES="${1:-$ROOT/out/frames}"; OUT="${2:-$ROOT/out/contact}"; N="${3:-10}"
mkdir -p "$OUT"; EXT=png; ls "$FRAMES"/frame_0000.jpg >/dev/null 2>&1 && EXT=jpg
# one sheet per second: 6 frames (every 10th) per second, 6x1 tiles at 640px wide each → 10 sheets; plus a 60-frame overview
for s in $(seq 0 9); do
  ffmpeg -y -hide_banner -loglevel error -start_number $((s*60)) -i "$FRAMES/frame_%04d.$EXT" -frames:v 60 -vf "select='not(mod(n\,$N))',scale=640:-1,tile=3x2:padding=4:margin=4:color=0x202020,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='sec $s  frames $((s*60))-$((s*60+59)) every ${N}th':fontcolor=white:fontsize=22:x=8:y=4" -frames:v 1 "$OUT/sheet_sec$s.png"
done
ffmpeg -y -hide_banner -loglevel error -i "$FRAMES/frame_%04d.$EXT" -vf "select='not(mod(n\,10))',scale=320:-1,tile=10x6:padding=2:margin=2:color=0x202020" -frames:v 1 "$OUT/overview.png"
echo "contact sheets in $OUT"; ls "$OUT"
