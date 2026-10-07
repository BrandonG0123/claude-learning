#!/usr/bin/env bash
# strip.sh — tile all frames in a directory into one review image. usage: tools/strip.sh <frames_dir> <out.png> [cols=4] [tile_width=480]
set -euo pipefail
DIR="$1"; OUT="$2"; COLS="${3:-4}"; TW="${4:-480}"
shopt -s nullglob; FILES=("$DIR"/frame_*.png); N=${#FILES[@]}; [[ $N -gt 0 ]] || { echo "no frames in $DIR"; exit 1; }; ROWS=$(( (N + COLS - 1) / COLS ))
ffmpeg -y -hide_banner -loglevel error -pattern_type glob -i "$DIR/frame_*.png" -vf "scale=${TW}:-1,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='%{frame_num}':start_number=0:fontcolor=white:fontsize=18:x=6:y=4:box=1:boxcolor=black@0.5,tile=${COLS}x${ROWS}:padding=3:margin=3:color=0x303030" -frames:v 1 "$OUT"
echo "$OUT ($N frames, ${COLS}x${ROWS})"
