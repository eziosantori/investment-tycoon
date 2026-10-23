import { describe, expect, it } from 'vitest';
import { concepts, getConcept } from './index';

describe('concepts', () => {
  it('has the M1 market concepts the mentor needs', () => {
    expect(getConcept('stage').term).toBe('Stage');
    expect(getConcept('30-week-ma').term).toBe('30-week MA');
    expect(getConcept('relative-strength').term).toBe('Relative strength');
    expect(getConcept('volume-confirmation').term).toBe('Volume confirmation');
    expect(getConcept('trend').term).toBe('Trend');
  });

  it('has one entry per id', () => {
    const ids = concepts.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(concepts.map((c) => [c.id, c] as const))(
    '%s links only to existing concepts, never itself',
    (id, concept) => {
      const known = new Set(concepts.map((c) => c.id));
      for (const rel of concept.related) {
        expect(known, `${id} → ${rel}`).toContain(rel);
        expect(rel).not.toBe(id);
      }
    },
  );

  it.each(concepts.map((c) => [c.id, c] as const))(
    '%s has a one-line short and a paragraph long',
    (_id, concept) => {
      expect(concept.short).not.toContain('\n');
      expect(concept.short.length).toBeGreaterThan(0);
      expect(concept.long.length).toBeGreaterThan(concept.short.length);
    },
  );
});
