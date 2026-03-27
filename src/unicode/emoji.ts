/**
 * Matches any sequence of extended pictographs, emoji modififers, emoji modifier bases, and zero width joiners.
 * This is a broad match, because it catches many invalid sequences, but it will help match sequences followed by modifiers.
 * See the Unicode Standard for details: https://www.unicode.org/versions/Unicode11.0.0/ch23.pdf#page=19
 */
export const EmojiRegex =
    /(\p{Emoji_Modifier_Base}(\p{Emoji_Modifier}|\u200D)*|\p{Extended_Pictographic})/gu;

export function withoutVariationSelectors(text: string) {
    return text.replaceAll(/(\uFE0F|\uFE0E)/gu, '');
}

/** Adds emoji text variation descriptor to any noto emoji missing them. Ensures fonts are rendered consistently across Chrome, Safari, and Firefox. */
export function withVariationSelector(text: string, color = false) {
    // Strip the presentation selectors from the string.
    const withoutPresentation = withoutVariationSelectors(text);

    // Choose the appropriate presentation selector (FE0F is color, FE0E is mono).
    const selector = color ? '\uFE0F' : '\uFE0E';
    // Replace all sequences of emoji, emoji modifier bases, emoji modifiers, and zero width joiners.
    // Nearly arbitrary sequences of these can be composed to determine the presentation of a sequence
    // of code points, and they can be terminated by a presentation selector, so we match the whole
    // sequence, and append the selector to the end.
    // For the standard details, see: https://www.unicode.org/reports/tr51/
    return withoutPresentation.replaceAll(EmojiRegex, `$1${selector}`);
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
    return EmojiRegex.test(text);
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

export const EmojiGroups: Record<string, string> = {
    'Smileys & Emotion': 'sm',
    'People & Body': 'pe',
    'Animals & Nature': 'an',
    'Food & Drink': 'fo',
    'Travel & Places': 'tr',
    Activities: 'ac',
    Objects: 'ob',
    Symbols: 'sy',
    Flags: 'fl',
};

export const EmojiGroupsByCode = Object.fromEntries(
    Object.entries(EmojiGroups).map(([group, code]) => [code, group]),
);

if (EmojiGroupsByCode.size !== EmojiGroups.size)
    throw new Error('Emoji group codes must be unique');

export const EmojiGroupOrder = Object.fromEntries(
    Object.values(EmojiGroups).map((code, index) => [code, index] as const),
);

export const EmojiSubgroups: Record<string, string> = {
    alphanum: 'al',
    'animal-amphibian': 'aa',
    'animal-bird': 'ab',
    'animal-bug': 'au',
    'animal-mammal': 'am',
    'animal-marine': 'ar',
    'animal-reptile': 'ae',
    arrow: 'a',
    'arts & crafts': 'ac',
    'av-symbol': 'av',
    'award-medal': 'ad',
    'body-parts': 'bp',
    'book-paper': 'bo',
    'cat-face': 'cf',
    clothing: 'cl',
    computer: 'co',
    'country-flag': 'cg',
    currency: 'cu',
    dishware: 'di',
    drink: 'dr',
    emotion: 'em',
    event: 'ev',
    'face-affection': 'fa',
    'face-concerned': 'fc',
    'face-costume': 'fo',
    'face-glasses': 'fg',
    'face-hand': 'fh',
    'face-hat': 'ht',
    'face-negative': 'fn',
    'face-neutral-skeptical': 'fs',
    'face-sleepy': 'fp',
    'face-smiling': 'fm',
    'face-tongue': 'ft',
    'face-unwell': 'fu',
    family: 'fy',
    flag: 'fl',
    'food-asian': 'as',
    'food-fruit': 'fr',
    'food-prepared': 'fe',
    'food-sweet': 'fw',
    'food-vegetable': 'fv',
    game: 'ga',
    gender: 'ge',
    geometric: 'go',
    'hair-style': 'hs',
    'hand-fingers-closed': 'hc',
    'hand-fingers-open': 'ho',
    'hand-fingers-partial': 'hp',
    'hand-prop': 'hr',
    'hand-single-finger': 'hf',
    hands: 'ha',
    heart: 'he',
    hotel: 'hl',
    household: 'hu',
    keycap: 'kc',
    'light & video': 'lv',
    lock: 'lo',
    mail: 'ma',
    math: 'mt',
    medical: 'me',
    money: 'mo',
    'monkey-face': 'mf',
    music: 'mu',
    'musical-instrument': 'mi',
    office: 'of',
    'other-object': 'oo',
    'other-symbol': 'os',
    person: 'pe',
    'person-activity': 'pa',
    'person-fantasy': 'pf',
    'person-gesture': 'pg',
    'person-resting': 'pr',
    'person-role': 'po',
    'person-sport': 'ps',
    'person-symbol': 'py',
    phone: 'ph',
    'place-building': 'pb',
    'place-geographic': 'pl',
    'place-map': 'pm',
    'place-other': 'pt',
    'place-religious': 'pi',
    'plant-flower': 'pw',
    'plant-other': 'pe',
    punctuation: 'pu',
    religion: 're',
    science: 'sc',
    'skin-tone': 'sk',
    'sky & weather': 'sw',
    sound: 'so',
    sport: 'sp',
    time: 'ti',
    tool: 'to',
    'transport-air': 'ta',
    'transport-ground': 'tg',
    'transport-sign': 'ts',
    'transport-water': 'tw',
    warning: 'wa',
    writing: 'wr',
    zodiac: 'zo',
};

export const EmojiSubgroupsByCode = Object.fromEntries(
    Object.entries(EmojiSubgroups).map(([group, code]) => [code, group]),
);
if (EmojiSubgroupsByCode.size !== EmojiSubgroups.size)
    throw new Error('Emoji subgroup codes must be unique');
