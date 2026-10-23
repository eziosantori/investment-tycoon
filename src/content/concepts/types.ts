/** Stable ids for mentor concepts. Grows as later milestones add concepts. */
export type ConceptId =
  'stage' | '30-week-ma' | 'relative-strength' | 'volume-confirmation' | 'trend';

/** A mentor explanation (docs/ARCHITECTURE.md §4.6). */
export interface Concept {
  id: ConceptId;
  term: string;
  /** One line, shown on first use and in tooltips. */
  short: string;
  /** A paragraph, shown when clicked. */
  long: string;
  related: ConceptId[];
}
