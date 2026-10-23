# NULL//RUN

A quick-reflex, three-lane arcade game. Catch mint signal shards, dodge hot-core pods, and see how long you can keep the signal alive.

**Current version:** `0.0.10.1`

## Play

Open `index.html` in a modern browser. No install or build step is needed.

- Move left/right with the arrow keys or `A` / `D`.
- Pause or resume with `P` or `Escape`.
- Restart at any time with `R` or the restart button.
- On touch screens, tap the lane you want to enter.
- Collect cyan shield cells to absorb one thorn collision. A second shield converts to bonus points.
- Collect signal shards consecutively to build a streak; every third shard grants an increasing score bonus. The streak expires after 3.5 seconds without a pickup.
- The shield and streak display sit in the game field's upper-right corner, with the streak and timer left of the divider and shield to its right.
- Shields begin with a 6% spawn chance, declining to a 1% minimum as a run continues.

Your best score is saved in browser storage on this device.

## Run locally

From the project directory, start the local server:

```sh
python3 -m http.server 4175 --bind 127.0.0.1
```

Open http://127.0.0.1:4175/ in your browser. To stop the server from another terminal, run:

```sh
pkill -f '^python3 -m http.server 4175 --bind 127.0.0.1$'
```

## Development

Before changing project files, create a snapshot with:

```sh
npm run backup
```

Snapshots are stored under `backups/` in timestamped, version-labeled folders. They include project files such as the code and patch notes, but exclude `.git`, `node_modules`, and prior backups. To inspect or restore an earlier file, copy it from the chosen snapshot folder back into the project.

The game is intentionally dependency-free. Run the JavaScript syntax check with `npm run check` (Node.js required).

For the next release, increment the semantic version in `package.json` and update the version labels in `index.html` and this README. Record every project change in [PATCH_NOTES.txt](PATCH_NOTES.txt), grouped under a dated version heading. Keep gameplay, presentation, and release metadata easy to change independently as the project grows.