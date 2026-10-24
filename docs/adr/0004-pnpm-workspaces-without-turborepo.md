# pnpm workspaces without Turborepo, until checks get slow

The repo uses pnpm (version pinned through `packageManager`, run via corepack)
with plain workspaces; root scripts fan out with `pnpm -r`. Turborepo is not
adopted yet: lint, typecheck and tests take seconds and there is one real
package, so task caching buys nothing, and adding it later is a `turbo.json`
over existing scripts.

Revisit when the full check exceeds about 60 seconds locally or in CI, or when
a second package with slow tasks exists.

## Consequences

- pnpm's shared store makes `node_modules` cheap in the git worktrees used by
  `/implement-spec`.
- The Cloudflare deploy is manual (`deploy` script) and unaffected.
