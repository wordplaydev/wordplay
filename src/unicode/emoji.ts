/** Adds emoji text variation descriptor to any noto emoji missing them. Ensures fonts are rendered consistently across Chrome, Safari, and Firefox. */
function withVariationSelector(text: string, color = false) {
    // Strip the presentation selectors from the string.
    const withoutPresentation = text.replaceAll(/(\uFE0F|\uFE0E)/gu, '');
    // Choose the appropriate presentation selector.
    const selector = color ? '\uFE0F' : '\uFE0E';
    // Replace all sequences of emoji, emoji modifier bases, emoji modifiers, and zero width joiners.
    // Nearly arbitrary sequences of these can be composed to determine the presentation of a sequence
    // of code points, and they can be terminated by a presentation selector, so we match the whole
    // sequence, and append the selector to the end.
    // For the standard details, see: https://www.unicode.org/reports/tr51/
    return withoutPresentation.replaceAll(
        /((\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Emoji_Modifier_Base}|\u200D)+)/gu,
        `$1${selector}`,
    );
}

export function withColorEmoji(text: string) {
    return withVariationSelector(text, true);
}

export function withMonoEmoji(text: string) {
    return withVariationSelector(text, false);
}
