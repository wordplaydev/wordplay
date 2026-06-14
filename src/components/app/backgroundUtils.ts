import UnicodeString from '@unicode/UnicodeString';
import BasisCharacters from '../../lore/BasisCharacters';

/** The multilingual glyph pool used by the floating {@link Background}. */
export function getWorldSymbols(): string[] {
    return new UnicodeString(
        '😀മAあ韓नेئبअขማঅবাংབོދިεفગુע中رšՀꆈᓄქ',
    ).getGraphemes();
}

/** A random element of a non-empty array. */
export function pickRandom<Type>(items: Type[]): Type {
    return items[Math.floor(Math.random() * items.length)];
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
