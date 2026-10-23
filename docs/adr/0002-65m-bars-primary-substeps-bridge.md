# 65m bars are the primary series; substep paths are derived inside each bar

The generator produces 65m OHLCV bars (prices in integer cents, volume in
integer shares); daily and weekly bars are always aggregated from them, never
generated separately. The intra-bar substep path that order matching needs
(M3) is derived afterwards as a bridge through each bar's O → H/L → C, from a
per-bar seed, so adding or changing paths never changes a bar the player has
seen.

## Considered Options

- Generating the substep path first and deriving OHLC from it. Rejected: the
  path would become part of the market, so any change to it in M3 would
  re-roll every chart and every seed.
