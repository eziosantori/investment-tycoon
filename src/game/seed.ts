/** Largest seed accepted from the URL or the seed field. */
const MAX_SEED = 99_999;

/** Random seed for a new run. Not part of the deterministic engine, by design. */
export function randomSeed(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return ((buf[0] ?? 0) % MAX_SEED) + 1;
}

export function parseSeed(raw: string | null): number | null {
  if (raw == null || !/^\d{1,5}$/.test(raw)) return null;
  const seed = Number(raw);
  return seed >= 1 && seed <= MAX_SEED ? seed : null;
}

/** The same URL with `?seed=` set to `seed`; other params (level, dev) are kept. */
export function urlWithSeed(href: string, seed: number): string {
  const url = new URL(href);
  url.searchParams.set('seed', String(seed));
  return url.toString();
}

/** "New seed": reloads the page on a fresh random market, keeping the other URL params. */
export function startNewSeed(): void {
  window.location.assign(urlWithSeed(window.location.href, randomSeed()));
}

/**
 * Seed from `?seed=`, or a fresh random one written back into the URL, so a
 * reload shows the same market.
 */
export function seedFromUrl(): number {
  const url = new URL(window.location.href);
  const parsed = parseSeed(url.searchParams.get('seed'));
  if (parsed != null) return parsed;
  const seed = randomSeed();
  window.history.replaceState(null, '', urlWithSeed(url.href, seed));
  return seed;
}
