#!/bin/bash
# SessionStart hook: make a Claude Code cloud session ready for the animate skill (.claude/skills/animate).
# The container has Node, ffmpeg, Playwright and Chromium but no handwriting font, so the cut-paper tags
# would set in a sans. This installs the vendored Comic Neue (SIL OFL 1.1, .claude/fonts/comic-neue) for the
# session user and reports the toolchain. Idempotent. Runs only in cloud sessions (CLAUDE_CODE_REMOTE).
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

# 1. the handwriting font
if ! fc-match "Comic Neue" 2>/dev/null | grep -q "Comic Neue"; then
  mkdir -p "$HOME/.local/share/fonts/comic-neue"
  cp "$ROOT/.claude/fonts/comic-neue/"*.ttf "$HOME/.local/share/fonts/comic-neue/"
  fc-cache -f >/dev/null 2>&1 || true
fi
echo "animate: font -> $(fc-match 'Comic Neue' 2>/dev/null || echo 'fc-match unavailable')"

# 2. the toolchain the skill needs: report it, never fail the session over it
if command -v node >/dev/null; then echo "animate: node $(node --version)"; else echo "animate: WARNING node not found"; fi
if command -v ffmpeg >/dev/null; then echo "animate: $(ffmpeg -version 2>&1 | head -1 | cut -d' ' -f1-3)"; else echo "animate: WARNING ffmpeg not found"; fi
if node -e "try{require('playwright')}catch{require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright')}" 2>/dev/null; then
  echo "animate: playwright ok"
else
  echo "animate: WARNING playwright not found (npm i -g playwright && npx playwright install chromium)"
fi
BROWSERS="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
if [ -e "$BROWSERS/chromium" ] || ls -d "$BROWSERS"/chromium-* >/dev/null 2>&1; then
  echo "animate: chromium ok ($BROWSERS)"
else
  echo "animate: WARNING chromium not found under $BROWSERS"
fi
