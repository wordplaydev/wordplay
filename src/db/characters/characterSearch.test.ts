import type { Character } from '@db/characters/Character';
import { buildCharacterSearch } from '@db/characters/characterSearch';
import { searchItems } from '@util/search';
import { describe, expect, test } from 'vitest';

const L = 'en';

function character(
    name: string,
    description: string,
    id = `00000000-0000-4000-8000-00000000000${name.length}`,
): Character {
    return {
        id,
        owner: 'creator',
        public: true,
        collaborators: [],
        updated: 0,
        name,
        description,
        shapes: [],
    };
}

const star = character('creator/Star', 'A five pointed star', 'a');
const heart = character('creator/Heart', 'A red heart', 'b');
// Its description mentions the other character's name, so name-vs-description
// ranking is observable.
const sketch = character('creator/Sketch', 'A rough star drawing', 'c');
const unnamed = character('', '', 'd');

const records = buildCharacterSearch([star, heart, sketch, unnamed], L);
const search = (query: string) =>
    searchItems(records, query, L).map(([c]) => c);

describe('buildCharacterSearch', () => {
    test('matches a character by its name (priority 1)', () => {
        const [c, match] = searchItems(records, 'Star', L)[0];
        expect(c).toBe(star);
        expect(match[3]).toBe(1);
    });

    test('matches a character by its description (priority 2)', () => {
        const [c, match] = searchItems(records, 'red heart', L)[0];
        expect(c).toBe(heart);
        expect(match[3]).toBe(2);
    });

    test('ranks a name match above a description match', () => {
        expect(search('star')).toEqual([star, sketch]);
    });

    test('matches by the creator half of the name', () => {
        expect(search('creator')).toContain(star);
    });

    test('tolerates a typo (fuzzy)', () => {
        expect(search('hart')).toContain(heart); // missing an 'e'
    });

    test('skips characters with no name and no description', () => {
        expect(records.map((r) => r.ref)).not.toContain(unnamed);
    });

    test('finds nothing for an unrelated query', () => {
        expect(search('elephant')).toEqual([]);
    });
});
