# The run reducer has two inputs, advance and apply, and owns the cursor

The run state (cursor, account, positions, trades) is a plain object owned by
the engine, and it changes only through two pure functions over the market
timeline: `advanceTo(state, timeline, bar)` moves the cursor forward and marks
positions to the mid (from M3 it also matches working orders on every bar and
substep it crosses), and `apply(state, timeline, command)` applies one player
command at the current cursor. The cursor lives in the run state; the UI
store keeps only speed, pause, the selected ticker and the timeframe.

The command log records commands only, each stamped with the bar it was
issued at; time is never logged. Replaying is a fold: for each command,
`advanceTo(command.at)` then `apply(command)`, then `advanceTo(finalCursor)`.
Ids of fills and trades are sequential counters in the state, so a replay
from the seed is deep-equal to the live state, which is what the determinism
test asserts.

This replaces the per-substep `step(state, commands)` of ARCHITECTURE §3.3,
which still advanced the market inside the reducer (dropped by ADR-0001).

## Considered Options

- Per-substep `step(state, commands[])` (ARCHITECTURE §3.3). Rejected: with a
  precomputed timeline there is nothing to generate per substep, and calling
  the reducer 12 times a bar just to move a cursor is noise. M3 can still
  walk substeps inside `advanceTo`.
- Keeping the cursor in the UI store and passing it to every reducer call.
  Rejected: two sources of truth for "where the run is", and the cursor would
  not be part of what replay reproduces.
- Logging time advances as commands. Rejected: playback would write a command
  every bar; the bar stamp on each command carries the same information.

## Consequences

- Market orders fill at the mid of the bar at the cursor (± half the spread),
  the price the player sees; M3 adds intra-bar matching for stop and limit
  orders inside `advanceTo` without changing the reducer's shape.
- A save is `seed + command log + final cursor`, with an optional snapshot.
- Changing how a command resolves (spread, rounding) changes replays, so it
  bumps `ENGINE_VERSION` even when the market itself is unchanged.
