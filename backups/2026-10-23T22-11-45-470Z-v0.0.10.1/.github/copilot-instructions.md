# Project Instructions

- NULL//RUN is a dependency-free browser game built with HTML, CSS, and JavaScript. Keep it directly playable from `index.html` unless a future change requires a build step.
- Keep gameplay logic in `game.js` and presentation in `style.css`; avoid adding dependencies without a clear need.
- Before editing any project file, run `npm run backup` and confirm that a new timestamped snapshot was created under `backups/`.
- The current release is `0.0.10.1`, recorded in `package.json`. When releasing a new version, update the visible version labels in `index.html` and `README.md` too.
- Record every project change in `PATCH_NOTES.txt`, grouped under a dated version heading. Add a new entry whenever making a change; do not silently omit documentation-only or maintenance changes.
- Use `npm run check` to validate JavaScript syntax. Use `npm run backup` to snapshot the project before edits. Do not invent additional build, test, or lint commands without adding the corresponding project configuration.
- Keep changes focused and update these instructions when durable project workflows or constraints change.
