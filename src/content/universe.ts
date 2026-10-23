import type { InstrumentSpec } from '../engine/market/universe';

/**
 * The universe: the TYX index and the 12 fictional stocks a run trades.
 * Data, not code: tune here. Prices in integer cents, volumes in shares
 * (average per 65m bar).
 */

export const INDEX: InstrumentSpec = {
  ticker: 'TYX',
  name: 'Tycoon Composite Index',
  beta: 1,
  startPrice: 400_000,
  baseVolume: 50_000_000,
  volScale: 1,
};

export const STOCKS: readonly InstrumentSpec[] = [
  {
    ticker: 'KRVX',
    name: 'Kraven Robotics',
    beta: 1.3,
    startPrice: 4_000,
    baseVolume: 250_000,
    volScale: 1.1,
  },
  {
    ticker: 'OMNX',
    name: 'Omnex Logistics',
    beta: 0.9,
    startPrice: 6_500,
    baseVolume: 180_000,
    volScale: 0.9,
  },
  {
    ticker: 'TALR',
    name: 'Talaria Aerospace',
    beta: 1.2,
    startPrice: 8_800,
    baseVolume: 120_000,
    volScale: 1,
  },
  {
    ticker: 'BRQE',
    name: 'Briquette Foods',
    beta: 0.7,
    startPrice: 3_200,
    baseVolume: 300_000,
    volScale: 0.8,
  },
  {
    ticker: 'VANT',
    name: 'Vantor Semiconductors',
    beta: 1.6,
    startPrice: 12_000,
    baseVolume: 220_000,
    volScale: 1.3,
  },
  {
    ticker: 'QZEN',
    name: 'Quartzen Energy',
    beta: 1.1,
    startPrice: 2_500,
    baseVolume: 400_000,
    volScale: 1.2,
  },
  {
    ticker: 'MERI',
    name: 'Meridian Health',
    beta: 0.8,
    startPrice: 15_000,
    baseVolume: 90_000,
    volScale: 0.8,
  },
  {
    ticker: 'DUNE',
    name: 'Dunefield Materials',
    beta: 1.0,
    startPrice: 5_400,
    baseVolume: 160_000,
    volScale: 1,
  },
  {
    ticker: 'PRYX',
    name: 'Pryx Software',
    beta: 1.4,
    startPrice: 7_700,
    baseVolume: 200_000,
    volScale: 1.2,
  },
  {
    ticker: 'LUMA',
    name: 'Luma Retail',
    beta: 1.0,
    startPrice: 2_900,
    baseVolume: 350_000,
    volScale: 1,
  },
  {
    ticker: 'CYGN',
    name: 'Cygnet Biotech',
    beta: 1.5,
    startPrice: 1_800,
    baseVolume: 500_000,
    volScale: 1.4,
  },
  {
    ticker: 'FERO',
    name: 'Ferocore Industrials',
    beta: 0.9,
    startPrice: 9_600,
    baseVolume: 110_000,
    volScale: 0.9,
  },
];
