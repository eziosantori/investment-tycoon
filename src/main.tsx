import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { levelFromUrl } from './game/level';
import { seedFromUrl } from './game/seed';
import './ui/theme/tokens.css';
import './ui/theme/global.css';

/*
 * URL params: `?seed=123` fixes the market, `?level=1..8` sets the player
 * level (default 1), `?cb=1` switches to the colorblind palette.
 */
const params = new URLSearchParams(window.location.search);
document.documentElement.dataset.palette = params.get('cb') === '1' ? 'colorblind' : 'default';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App seed={seedFromUrl()} level={levelFromUrl()} />
  </StrictMode>,
);
