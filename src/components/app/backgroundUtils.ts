import UnicodeString from '@unicode/UnicodeString';
import { must } from '@util/nullable';
import BasisCharacters from '../../lore/BasisCharacters';

/** A random element of a non-empty array. Callers check for emptiness first
 *  (or pass a literal list), so an absent element is a broken caller. */
export function pickRandom<Type>(items: Type[]): Type {
    return must(
        items[Math.floor(Math.random() * items.length)],
        'a random item',
    );
}

/** The tutorial's character cast: distinct single-glyph symbols from {@link BasisCharacters},
 * so they read clearly when rendered large with eyes. Used by the tutorial chooser background. */
export function getTutorialCharacterSymbols(): string[] {
    const seen = new Set<string>();
    for (const { symbols } of Object.values(BasisCharacters)) {
        if (
            symbols.trim().length > 0 &&
            new UnicodeString(symbols).getGraphemes().length === 1
        )
            seen.add(symbols);
    }
    return [...seen];
}
