import { createContext, useContext } from 'react';

/**
 * Whether charts draw the hidden-stage bands. Off in play; the dev overlay
 * (`?dev=1`) turns it on for every chart below it. A chart's own `bands` prop
 * (e.g. in the gallery) wins over it.
 */
export const StageBandsContext = createContext(false);

export function useStageBands(): boolean {
  return useContext(StageBandsContext);
}
