/**
 * Matches any sequence of extended pictographs, emoji modififers, emoji modifier bases, and zero width joiners.
 * This is a broad match, because it catches many invalid sequences, but it will help match sequences followed by modifiers.
 * See the Unicode Standard for details: https://www.unicode.org/versions/Unicode11.0.0/ch23.pdf#page=19
 */
const EmoijRegex =
    /((\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Emoji_Modifier_Base}|\u200D)+)/gu;

/** Adds emoji text variation descriptor to any noto emoji missing them. Ensures fonts are rendered consistently across Chrome, Safari, and Firefox. */
function withVariationSelector(text: string, color = false) {
    // Strip the presentation selectors from the string.
    const withoutPresentation = text.replaceAll(/(\uFE0F|\uFE0E)/gu, '');
    // Choose the appropriate presentation selector (FE0F is color, FE0E is mono).
    const selector = color ? '\uFE0F' : '\uFE0E';
    // Replace all sequences of emoji, emoji modifier bases, emoji modifiers, and zero width joiners.
    // Nearly arbitrary sequences of these can be composed to determine the presentation of a sequence
    // of code points, and they can be terminated by a presentation selector, so we match the whole
    // sequence, and append the selector to the end.
    // For the standard details, see: https://www.unicode.org/reports/tr51/
    return withoutPresentation.replaceAll(EmoijRegex, `$1${selector}`);
}

/** Remove any existing variation selectors from emoji sequences and add the color selector. */
export function withColorEmoji(text: string) {
    return withVariationSelector(text, true);
}

/** Remove any existing variation selectors from emoji sequences and add the monochrome selector. */
export function withMonoEmoji(text: string) {
    return withVariationSelector(text, false);
}

/** Check if the string matches an emoji sequence */
export function isEmoji(text: string) {
    return EmoijRegex.test(text);
}

/** Converts a code point in a string to a JavaScript unicode escape string. */
function toCodepoint(text: string, index: number) {
    const codepoint = text.codePointAt(index);
    if (codepoint === undefined) return 'undefined';
    const hex = codepoint.toString(16);
    return '\\u' + '0000'.substring(0, 4 - hex.length) + hex;
}

/** Converts a string into a sequence of unicode escape strings. */
export function toUnicode(text: string) {
    return Array.from(text)
        .map((c, i) => toCodepoint(text, i))
        .join('');
}
