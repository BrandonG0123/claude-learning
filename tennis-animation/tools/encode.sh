#!/usr/bin/env bash
# encode.sh — frames → H.264 MP4 (+ optional audio), GIF preview, poster frame.
# usage: tools/encode.sh [frames_dir] [out_basename] [audio.wav]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRAMES="${1:-$ROOT/out/frames}"; BASE="${2:-$ROOT/out/tennis}"; AUDIO="${3:-}"
EXT=png; ls "$FRAMES"/frame_0000.jpg >/dev/null 2>&1 && EXT=jpg
VARGS=(-framerate 60 -i "$FRAMES/frame_%04d.$EXT")
if [[ -n "$AUDIO" && -f "$AUDIO" ]]; then
  ffmpeg -y -hide_banner -loglevel error "${VARGS[@]}" -i "$AUDIO" -c:v libx264 -preset slow -crf 15 -pix_fmt yuv420p -profile:v high -level 4.2 -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a aac -b:a 320k -shortest -movflags +faststart "$BASE.mp4"
else
  ffmpeg -y -hide_banner -loglevel error "${VARGS[@]}" -c:v libx264 -preset slow -crf 15 -pix_fmt yuv420p -profile:v high -level 4.2 -color_primaries bt709 -color_trc bt709 -colorspace bt709 -movflags +faststart "$BASE.mp4"
fi
# poster frame + 480p gif preview (30 fps)
ffmpeg -y -hide_banner -loglevel error -i "$BASE.mp4" -vf "select=eq(n\,330)" -frames:v 1 "$BASE-poster.jpg"
ffmpeg -y -hide_banner -loglevel error -i "$BASE.mp4" -vf "fps=30,scale=854:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=192:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" "$BASE-preview.gif"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of default=nw=1 "$BASE.mp4"
