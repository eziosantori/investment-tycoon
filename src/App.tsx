import { TradingScreen } from './ui/screens/trading/TradingScreen';

export interface AppOptions {
  seed: number;
  noStop: boolean;
}

export function App({ seed, noStop }: AppOptions) {
  return <TradingScreen seed={seed} noStop={noStop} />;
}
