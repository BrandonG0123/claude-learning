# Project skills

## animate (vendored)

`animate/` is a copy of the `animate` skill from the `cth9191/animate` plugin marketplace, version 0.4.0
(marketplace commit 7e5eb56f). It is vendored here because a Claude Code cloud session does not install the
plugins a repository turns on under `enabledPlugins` in `.claude/settings.json`, so `/animate` was missing in
the cloud. A project skill is part of the clone and loads in every session, local or cloud, with no install.

- Use: `/animate <what the video is about> [style or reference]`. Pieces land in `pieces/<name>/`.
- The plugin entries stay in `.claude/settings.json` for local machines: there, after `/plugin install
  animate@animate`, both load (the plugin's copy is namespaced `/animate:animate`).
- Refresh the copy when the plugin updates: `claude plugin marketplace update animate && claude plugin update
  animate@animate`, then replace this folder with `~/.claude/plugins/cache/animate/animate/<version>/skills/animate/`
  and note the version here.
- `.claude/hooks/session-start.sh` installs the handwriting font the skill's cut-paper tags need in cloud
  containers (`.claude/fonts/comic-neue`, SIL OFL 1.1) and reports the toolchain (node, ffmpeg, Playwright, Chromium).
