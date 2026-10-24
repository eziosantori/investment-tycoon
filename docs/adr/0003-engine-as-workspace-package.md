# The engine is a workspace package that includes the market universe

The simulation engine lives in its own workspace package, consumed by the app
as TypeScript source (no build step) through a single entry point; the app may
not reach into its internals. The package has its own tsconfig without DOM,
React or Vite types, so purity is enforced by the compiler as well as by
ESLint. The market universe (the 12 stocks and their parameters) lives inside
the package: it determines the market of a seed, so it versions with
`ENGINE_VERSION`, and a later server that replays runs (leaderboards) imports
exactly the same data. UI-facing content, such as concept texts, stays in the
app.

## Considered Options

- Injecting the universe into the engine from the app. Rejected: client and
  server could silently use different universes for the same seed.
- A separate content package. Rejected for now: no second consumer yet.
- A compiled package (`dist/` plus types). Rejected: it adds a build step and a
  stale-output failure mode for no gain, since Vite, Vitest and Worker
  bundlers all read TypeScript source.
- An `apps/web` + `packages/*` layout. Deferred: the repo root stays the web
  app until a second app (the leaderboard server) exists.

## Consequences

- The move is behaviour-neutral: the golden hash of the pinned seed must not
  change and `ENGINE_VERSION` must not be bumped.
- The chart-view code under the engine moves with it unchanged; whether it
  belongs there is a separate question.
