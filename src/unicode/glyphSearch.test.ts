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
}; // 'A', named via the English Unicode names map
const han: Codepoint = {
    hex: [0x6c34],
    category: 'Lo',
    script: 'Hani',
    emoji: undefined,
}; // 水, named via Unihan definition + pinyin
const unnamed: Codepoint = {
    hex: [0x3400],
    category: 'Lo',
    script: 'Hani',
    emoji: undefined,
}; // no emoji entry and no names entry — unsearchable

const maps: Partial<Record<SupportedLocale, EmojiMap>> = {
    'en-US': {
        '2615': ['hot beverage', 'coffee', 'cafe', 'caffeine'],
        '1f408': ['cat', 'feline', 'pet'],
    },
    'es-MX': {
        '2615': ['bebida caliente', 'café'],
    },
};

/** English Unicode/Unihan names for the non-emoji glyphs. */
const glyphNames = new Map<string, string[]>([
    ['0041', ['Latin Capital Letter A']],
    ['6C34', ['water, liquid, lotion, juice', 'shuǐ', 'shui']],
]);

const groupLabels: Record<string, string> = {
    fd: 'Food & Drink',
    an: 'Animals & Nature',
};

function build(locales: SupportedLocale[]) {
    return buildGlyphSearch(
        [coffee, cat, plain, han, unnamed],
        locales,
        maps,
        (code) => (code.emoji ? groupLabels[code.emoji.group] : undefined),
        L,
        glyphNames,
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

    test('finds a non-emoji glyph by its English Unicode name', () => {
        expect(search('capital letter a')).toContain(plain);
    });

    test('finds a Han glyph by its Unihan definition and toneless pinyin', () => {
        expect(search('water')).toContain(han); // definition
        expect(search('shui')).toContain(han); // pinyin without tone marks
    });

    test('still skips codepoints with no name at all', () => {
        expect(search('ideograph')).not.toContain(unnamed);
        expect(search('3400')).not.toContain(unnamed);
    });

    test('only indexes the requested locales', () => {
        // Without Spanish selected, the Spanish-only name must not match.
        const enOnly = build(['en-US']);
        expect(
            searchItems(enOnly, 'caliente', L).map(([c]) => c),
        ).not.toContain(coffee);
    });
});
