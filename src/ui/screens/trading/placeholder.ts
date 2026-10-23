/**
 * Placeholder game state for the M0 layout shell, taken verbatim from the
 * design handoff. Each block is replaced by real state in a later milestone
 * (noted per field).
 */

export const PLAYER = {
  // M6: XP & levels
  level: 3,
  title: 'Junior Trader',
  xp: 1240,
  xpToNext: 2000,
};

export const RUN = {
  // M4: challenge rules & clock
  phaseLabel: 'PHASE 1 · THE CHALLENGE',
  week: 4,
  weeks: 10,
  clock: 'THU · 14:40',
  targetPct: 10,
  progressPct: 2.6,
  toUnlock: '$7,398 to unlock Phase 2 · 6 weeks left',
  dailyLossUsedPct: 2.1,
  dailyLossLimitPct: 5,
  totalLossUsedPct: 4.3,
  totalLossLimitPct: 10,
  gameOverAt: '$90k',
  xpToast: '+25 XP',
};

export type ChipTone = 'good' | 'warn' | 'bad';

export interface LogRow {
  id: number;
  ticker: string;
  side: 'long' | 'short';
  pnl: number;
  r: number;
  flag: { label: string; tone: ChipTone };
  xp: number | 'live';
  live?: boolean;
}

// M2 (trades) + M5 (flags) + M6 (XP). The live row (#14) comes from the demo position.
export const PAST_TRADES: LogRow[] = [
  {
    id: 13,
    ticker: 'OMNX',
    side: 'long',
    pnl: 978.5,
    r: 1.02,
    flag: { label: 'PLAN ✓', tone: 'good' },
    xp: 60,
  },
  {
    id: 12,
    ticker: 'TALR',
    side: 'long',
    pnl: -524.8,
    r: -0.52,
    flag: { label: 'S3 · LATE', tone: 'warn' },
    xp: 5,
  },
  {
    id: 11,
    ticker: 'BRQE',
    side: 'short',
    pnl: -372,
    r: -1,
    flag: { label: 'STOP ✓', tone: 'good' },
    xp: 20,
  },
  {
    id: 10,
    ticker: 'VANT',
    side: 'long',
    pnl: -615,
    r: -0.6,
    flag: { label: 'S4 BUY ✕', tone: 'bad' },
    xp: 0,
  },
];

export const STREAK = 3;

// M6: side quests
export const QUESTS = [
  { label: 'Buy a Stage 2 breakout', reward: '+50', done: true },
  { label: 'Risk ≤ 1% on 5 trades', reward: '3/5', done: false },
  { label: 'Trail a winner to +2R', reward: '+80', done: false },
  { label: 'No Stage 4 buys this week', reward: '+40', done: false },
];

// M6: mentor triggers
export const MENTOR = {
  name: 'MARGO',
  before:
    'Nice breakout, 2.4× volume! But RS is still under zero. The big winners usually lead the market first. Check ',
  term: 'relative strength',
  after: '.',
};

// M2–M3: orders and accounting. The shape the hidden loadout and battle log
// render; the M0 demo scenario that filled it was removed with the M0 generator.

export interface DemoPosition {
  side: 'long';
  entryIndex: number;
  entry: number;
  stop: number;
  target: number;
  riskPct: number;
  riskBudget: number;
  size: number;
  riskIfStopped: number;
  last: number;
  openPnl: number;
  openR: number;
}

export interface SetupCheck {
  label: string;
  ok: boolean;
}

export interface DemoScenario {
  ticker: string;
  equity: number;
  position: DemoPosition;
  checks: SetupCheck[];
}
