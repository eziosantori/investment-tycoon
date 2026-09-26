# Deploy, Persistence & Accounts

Where the game runs, how saves work, and when (and how) accounts come in.
Principle: **no backend until a feature actually needs one.** v1.0 is a fully
static site with local saves.

---

## 1. Hosting

### Choice: Cloudflare (static assets)

| Option | Free tier | Private repo | Preview per branch/PR | Backend later on same platform | Notes |
|---|---|---|---|---|---|
| **Cloudflare Pages / Workers static assets** | Generous, unlimited bandwidth | ✅ | ✅ | ✅ Workers, D1, KV, R2 | **Recommended** |
| GitHub Pages | Free | Public repo only (free plan) | ❌ | ❌ | Fine for a demo, limited |
| Netlify | OK | ✅ | ✅ | Functions | Bandwidth/build-minute limits |
| Vercel (Hobby) | OK | ✅ | ✅ | Functions | Hobby plan is non-commercial only |

Why Cloudflare: free, preview deploys for every branch (useful for playtesting a
milestone before merging), no bandwidth worries if a link spreads, and room to
add a small backend on the same platform later if we want.

> Cloudflare is steering new projects from *Pages* toward *Workers with static
> assets*. For a Vite static build either works; check the current
> recommendation when setting up M0.

### Environments

| Env | Trigger | URL | Use |
|---|---|---|---|
| **Preview** | every push to a branch / PR | `<branch>.<project>.pages.dev` | Playtest a milestone before merging |
| **Production** | merge to `main` | `<project>.pages.dev` → custom domain later | Public build |

Build is `npm run build` → `dist/`. CI (GitHub Actions) runs lint + test + build;
Cloudflare deploys only if CI is green.

### Build metadata

Every build embeds `APP_VERSION` (from `package.json`) and `ENGINE_VERSION`
(bumped manually when simulation behavior changes). Both are shown in the footer
and written into every save (see §2.4).

---

## 2. Persistence (v1: local only)

### 2.1 Storage adapter

The game never touches `localStorage` directly. Everything goes through one
interface, so switching to IndexedDB or cloud is a new adapter, not a refactor:

```ts
interface SaveStore {
  loadProfile(): Promise<SaveFile | null>;
  saveProfile(save: SaveFile): Promise<void>;
  listRuns(): Promise<RunSummary[]>;
  loadRun(id: string): Promise<RunRecord | null>;   // seed + command log (+ snapshot)
  saveRun(run: RunRecord): Promise<void>;
  exportAll(): Promise<Blob>;                       // JSON backup file
  importAll(file: Blob): Promise<void>;
}
```

Async from day one, even though `localStorage` is sync, so the cloud adapter
fits later without changing callers.

### 2.2 What goes where

| Data | v1 storage | Size |
|---|---|---|
| Profile (career, unlocks, concepts, settings) | `localStorage` | a few KB |
| Active run (seed + command log + periodic snapshot) | `localStorage` | tens of KB |
| Run history (summaries) | `localStorage` | small |
| Full logs of finished runs (for replays) | **IndexedDB** (M7, only if we keep them) | can grow |

Autosave: on every session end, on pass/fail, and on `visibilitychange` →
hidden (tab closed or switched). Not on every tick.

### 2.3 Local storage is fragile, so plan for it

- **Browsers can delete it.** Safari (ITP) can wipe script-written storage
  after ~7 days without a visit. Clearing site data wipes it everywhere.
- Mitigations in M7:
  - `navigator.storage.persist()` to ask the browser not to evict our data.
  - **Export / import save as a JSON file** in Settings. This is the v1 backup
    and "move to another device" feature, and costs almost nothing.
  - Show a gentle reminder to export after big milestones (passing a phase).

### 2.4 Versioning & migrations

```ts
interface SaveFile {
  saveVersion: number;     // schema version → migrations[saveVersion] upgrade chain
  appVersion: string;
  engineVersion: number;   // simulation behavior version
  // ...profile, activeRun, history (see ARCHITECTURE §6)
}
```

- `saveVersion` changes → run migrations in order, keep a backup copy of the
  pre-migration save.
- `engineVersion` changes → the **profile** still loads, but an **in-progress
  run** from an older engine can't be replayed deterministically. The run is
  closed as "abandoned (game updated)" with no penalty. Keep this rare.
- A save newer than the app (e.g. rolled-back deploy) → refuse to load, keep it
  untouched, show a message.

---

## 3. Accounts & cloud (later, when a feature needs it)

**No accounts in v1.0.** Login walls in front of a free browser game kill
first-time players, and nothing in Phase 1 needs a server.

A backend becomes worth it for exactly two features:
1. **Cloud save / cross-device play.**
2. **Daily-seed leaderboards** (needs server-side validation).

That's the **Cloud track** in the roadmap (C1–C2), which can be slotted in any
time after v1.0.

### 3.1 Recommended backend: Supabase

| Need | Supabase | Cloudflare-only alternative |
|---|---|---|
| Auth | Built in: email magic link, Google/GitHub OAuth, **anonymous sign-in with later account linking** | Workers + an auth library you wire yourself |
| Database | Postgres + Row Level Security | D1 (SQLite) |
| Server code | Edge Functions (Deno, runs TS) | Workers (runs TS) |
| Effort | Low | Medium–high |

Supabase wins on auth effort. Hosting stays on Cloudflare; the frontend calls
Supabase directly. (Caveat: free-tier projects pause after a period of
inactivity. Fine for development; revisit the plan once there are real players.)

Either way the **engine is pure TypeScript**, so the same code can run on the
server to validate leaderboard submissions (§3.4). That's a direct payoff from
the determinism rules in ARCHITECTURE §2.

### 3.2 Auth model: anonymous first

```
First visit ──► play immediately (local save, no account)
                   │
     "Save to cloud / play on other devices"  or  "Submit to leaderboard"
                   ▼
        sign in: magic link or Google/GitHub
                   ▼
   local save uploaded → linked to the account → cloud adapter becomes active
```

- Never ask for an account before the player has had fun.
- No passwords to manage: magic link + OAuth only.
- Minimal data: email (or OAuth id) + display name for leaderboards. Nothing else.

### 3.3 Cloud save schema

Saves are small JSON blobs. Store them as documents, not normalized tables:

```sql
create table saves (
  user_id     uuid references auth.users not null,
  slot        text not null default 'main',
  save_version int not null,
  engine_version int not null,
  revision    int not null,          -- incremented on every write
  updated_at  timestamptz not null default now(),
  data        jsonb not null,
  primary key (user_id, slot)
);
-- RLS: a user can only read/write rows where user_id = auth.uid()
```

**Sync / conflicts:** the client remembers the last `revision` it saw.
- Upload with `revision = seen + 1` only if the server is still at `seen`.
- If the server moved on (played on another device), show both saves (career
  stage, capital, last played) and **let the player pick**. No automatic merging
  of game state.
- The local save stays as an offline cache; the game keeps working without a
  connection.

### 3.4 Leaderboards without cheating

Client-side scores are trivially fakeable. Instead, the client submits
**`{ seed, ruleSetId, engineVersion, commandLog }`**, not a score.

An Edge Function / Worker:
1. checks the seed is today's daily seed and `engineVersion` is current,
2. **replays the command log with the same engine**,
3. computes the score itself and writes it to the leaderboard.

Cheating would require a *valid* sequence of trades, which is just… playing well.
(A bot could still play perfectly with foreknowledge of the seed, so daily seeds
are revealed only at the start of the day and the leaderboard is for fun, not
prizes.)

---

## 4. Privacy & legal (to check, not legal advice)

- **v1 (local only):** saves are stored because the player asked to play;
  that's generally considered strictly necessary storage, so no cookie banner is
  needed for it. No personal data leaves the browser.
- **Analytics:** if we want any, use a cookieless tool (e.g. Cloudflare Web
  Analytics) so we still don't need a consent banner.
- **With accounts (Cloud track):** GDPR applies. Needs a privacy policy, a
  "delete my account and data" button, data minimization (email only), and a
  data-processing agreement with the backend provider (Supabase offers one; pick
  an EU region).
- The **"not financial advice"** disclaimer stays in the footer and first-run
  screen regardless.
