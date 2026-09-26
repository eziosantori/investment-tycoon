import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { seedFromUrl } from './game/seed';
import './ui/theme/tokens.css';
import './ui/theme/global.css';

/*
 * URL params (M0): `?seed=123` fixes the market, `?cb=1` switches to the
 * colorblind palette, `?nostop=1` shows the no-stop design variant.
 */
const params = new URLSearchParams(window.location.search);
document.documentElement.dataset.palette = params.get('cb') === '1' ? 'colorblind' : 'default';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App seed={seedFromUrl()} noStop={params.get('nostop') === '1'} />
  </StrictMode>,
);
