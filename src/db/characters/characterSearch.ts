/**
 * Builds searchable records for custom characters so the glyph chooser can find
 * them with the shared search policy in src/util/search.ts. A character's name
 * ranks above its description.
 *
 * Pure (no Svelte/store deps) so it can be unit-tested; the chooser feeds it the
 * characters the creator can edit.
 */

import type { Character } from '@db/characters/Character';
import {
    foldEntry,
    type Searchable,
    type SearchField,
    type SearchLanguages,
} from '@util/search';

/** Priority tiers: a name beats a description. */
const NAME = 1;
const DESCRIPTION = 2;

/**
 * Builds a searchable record per character. Names are `username/CharacterName`,
 * and search matches case-folded substrings and whole words, so a query of just
 * the character name (or just the creator's username) matches without indexing
 * the two halves separately.
 */
export function buildCharacterSearch(
    characters: Character[],
    languages: SearchLanguages,
): Searchable<Character>[] {
    const records: Searchable<Character>[] = [];

    for (const character of characters) {
        const fields: SearchField[] = [];
        if (character.name.length > 0)
            fields.push({
                entries: [foldEntry(character.name, languages)],
                priority: NAME,
            });
        if (character.description.length > 0)
            fields.push({
                entries: [foldEntry(character.description, languages)],
                priority: DESCRIPTION,
            });

        if (fields.length > 0) records.push({ ref: character, fields });
    }

    return records;
}
