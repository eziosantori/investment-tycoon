# The market is a precomputed timeline, not part of the step reducer

The market never depends on player actions, so a run's whole market (index,
stocks, warm-up and challenge weeks) is generated up front by a pure function
of the seed, and playback only moves a cursor along it. The run reducer
(`step()`, from M2) reads prices from the timeline instead of generating them.
This gives generator, studies, playback and UI one fixed data contract to work
against in parallel, and makes "same seed, same market" true by construction.

## Considered Options

- Advancing the market inside `step()` one substep at a time (the original
  ARCHITECTURE §3.3 design). Rejected: it couples generation to the reducer,
  keeps hidden generator state in the save, and gains nothing because no
  player action can change the market.

## Consequences

- About 60k 65m bars in memory per run and a few tens of ms to generate at
  start; fine for 13 instruments.
- Market impact (parked) would need a different design if it ever returns.
