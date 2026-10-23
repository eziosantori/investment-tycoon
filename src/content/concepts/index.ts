import { marketConcepts } from './market';
import type { Concept, ConceptId } from './types';

export type { Concept, ConceptId } from './types';

/** Every mentor concept in the game. */
export const concepts: readonly Concept[] = [...marketConcepts];

const byId = new Map<ConceptId, Concept>(concepts.map((c) => [c.id, c]));

export function getConcept(id: ConceptId): Concept {
  const concept = byId.get(id);
  if (!concept) throw new Error(`Unknown concept: ${id}`);
  return concept;
}
