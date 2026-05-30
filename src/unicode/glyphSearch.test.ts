import { describe, expect, test } from 'vitest';
import { buildGlyphSearch } from './glyphSearch';
import type { Codepoint } from './Unicode';
import type { EmojiMap } from '@db/locales/LocalesDatabase';
import type { SupportedLocale } from '@locale/SupportedLocales';
import { searchItems } from '@util/search';

const L = 'en';

// Two emoji codepoints; coffee has English + Spanish translations.
const coffee: Codepoint = {
    hex: [0x2615],
    category: 'So',
    script: undefined,
    emoji: { group: 'fd', subgroup: 'dr' },
};
const cat: Codepoint = {
    hex: [0x1f408],
    category: 'So',
    script: undefined,
    emoji: { group: 'an', subgroup: 'mm' },
};
const plain: Codepoint = {
    hex: [0x41],
    category: 'Lu',
    script: 'Latn',
    emoji: undefined,
}; // 'A', no emoji/translation

const maps: Partial<Record<SupportedLocale, EmojiMap>> = {
    'en-US': {
        '2615': ['hot beverage', 'coffee', 'cafe', 'caffeine'],
        '1f408': ['cat', 'feline', 'pet'],
    },
    'es-MX': {
        '2615': ['bebida caliente', 'café'],
    },
};

const groupLabels: Record<string, string> = {
    fd: 'Food & Drink',
    an: 'Animals & Nature',
};

function build(locales: SupportedLocale[]) {
    return buildGlyphSearch(
        [coffee, cat, plain],
        locales,
        maps,
        (code) => (code.emoji ? groupLabels[code.emoji.group] : undefined),
        L,
    );
}

describe('buildGlyphSearch', () => {
    const records = build(['en-US', 'es-MX']);
    const search = (q: string) =>
        searchItems(records, q, L).map(([code]) => code);

    test('matches an emoji by its name (priority 1)', () => {
        const [code, match] = searchItems(records, 'hot beverage', L)[0];
        expect(code).toBe(coffee);
        expect(match[3]).toBe(1);
    });

    test('matches an emoji by a keyword (priority 2)', () => {
        const [code, match] = searchItems(records, 'caffeine', L)[0];
        expect(code).toBe(coffee);
        expect(match[3]).toBe(2);
    });

    test('matches across selected locales', () => {
        expect(search('caliente')).toContain(coffee); // Spanish name
    });

    test('tolerates a typo in a keyword (fuzzy)', () => {
        expect(search('cofee')).toContain(coffee); // missing an 'f'
    });

    test('matches an emoji by its group label (priority 3)', () => {
        const [code, match] = searchItems(records, 'animals', L)[0];
        expect(code).toBe(cat);
        expect(match[3]).toBe(3);
    });

    test('skips codepoints with no localized text', () => {
        expect(search('A')).not.toContain(plain);
    });

    test('only indexes the requested locales', () => {
        // Without Spanish selected, the Spanish-only name must not match.
        const enOnly = build(['en-US']);
        expect(
            searchItems(enOnly, 'caliente', L).map(([c]) => c),
        ).not.toContain(coffee);
    });
});
