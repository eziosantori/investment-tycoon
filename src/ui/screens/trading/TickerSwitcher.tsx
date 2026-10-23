import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { watchlist } from '../../../engine/chart/watchlist';
import { arrow, price, signedPct } from '../../format';
import { useUiStore } from '../../state/store';
import { useTimeline } from '../../state/timeline';
import sw from './instrument.module.css';
import s from './trading.module.css';

/**
 * The ticker switcher in the chart toolbar: the selected ticker as a button
 * that opens the list of every instrument (TYX + the 12 stocks) with its last
 * price and weekly change. Clicking a row switches the chart.
 */
export function TickerSwitcher() {
  const timeline = useTimeline();
  const cursor = useUiStore((st) => st.cursor);
  const instrument = useUiStore((st) => st.instrument);
  const selectInstrument = useUiStore((st) => st.selectInstrument);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () => watchlist(timeline, cursor, instrument),
    [timeline, cursor, instrument],
  );
  const current = rows.find((r) => r.selected);
  const open = anchor !== null;

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const target = e.target as Node | null;
      if (listRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setAnchor(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAnchor(null);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus();
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={sw.trigger}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Instrument ${current?.ticker ?? ''}, switch ticker`}
        onClick={() =>
          setAnchor(open ? null : (buttonRef.current?.getBoundingClientRect() ?? null))
        }
      >
        <span className={s.ticker}>{current?.ticker}</span>
        <span className={sw.caret} aria-hidden>
          ▾
        </span>
      </button>
      {anchor &&
        createPortal(
          <div
            ref={listRef}
            className={sw.popover}
            style={{ top: anchor.bottom + 6, left: anchor.left - 6 }}
            role="group"
            aria-label="Switch ticker"
          >
            <div className={sw.popoverHead}>
              <span>{rows.length} TICKERS</span>
              <span>LAST · WEEK</span>
            </div>
            <ul className={sw.list}>
              {rows.map((r) => {
                const chg = r.quote.changePct;
                return (
                  <li key={r.ticker}>
                    <button
                      type="button"
                      className={`${sw.row} ${r.selected ? sw.rowSelected : ''}`}
                      aria-current={r.selected}
                      title={r.name}
                      onClick={() => {
                        selectInstrument(r.ticker);
                        setAnchor(null);
                        buttonRef.current?.focus();
                      }}
                    >
                      <span className={sw.rowTicker}>
                        {r.ticker}
                        {r.kind === 'index' && <span className={sw.indexTag}>INDEX</span>}
                      </span>
                      <span className={sw.rowPrice}>{price(r.quote.last / 100)}</span>
                      <span className={`${sw.rowChg} ${chg >= 0 ? s.up : s.down}`}>
                        {signedPct(chg, 2)} {arrow(chg)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
