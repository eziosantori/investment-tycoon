import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { devModeFromSearch } from './game/dev';
import { levelFromUrl } from './game/level';
import { seedFromUrl } from './game/seed';
import { DevGallery } from './ui/dev/DevGallery';
import { DevRoot } from './ui/dev/DevRoot';
import './ui/theme/tokens.css';
import './ui/theme/global.css';

/*
 * URL params: `?seed=123` fixes the market, `?level=1..8` sets the player
 * level (default 1), `?cb=1` switches to the colorblind palette, `?dev=1`
 * turns on the dev overlay and `?dev=gallery` opens the stage gallery (src/game/dev.ts).
 */
const params = new URLSearchParams(window.location.search);
document.documentElement.dataset.palette = params.get('cb') === '1' ? 'colorblind' : 'default';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const run = { seed: seedFromUrl(), level: levelFromUrl() };
const dev = devModeFromSearch(window.location.search);

createRoot(root).render(
  <StrictMode>
    {dev === 'overlay' ? (
      <DevRoot {...run} />
    ) : dev === 'gallery' ? (
      <DevGallery {...run} />
    ) : (
      <App {...run} />
    )}
  </StrictMode>,
);
