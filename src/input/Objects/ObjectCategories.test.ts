import DefaultLocales from '@locale/DefaultLocales';
import {
    canonicalizeCategory,
    localizeCategory,
    ObjectCategories,
} from '@input/Objects/ObjectCategories';
import { expect, test } from 'vitest';

test.each([...ObjectCategories])(
    '%s has an en-US name that round-trips',
    (category) => {
        const name = localizeCategory(category, DefaultLocales);
        expect(name.length).toBeGreaterThan(0);
        expect(canonicalizeCategory(name, DefaultLocales)).toBe(category);
    },
);

test('every alias resolves to its category', () => {
    const map = DefaultLocales.getLocale().input.Objects.categories;
    for (const category of ObjectCategories)
        for (const alias of map[category])
            expect(canonicalizeCategory(alias, DefaultLocales)).toBe(category);
});

test('an unknown label passes through unchanged', () => {
    // A future model with new labels should degrade to its English name rather
    // than emitting empty text.
    expect(localizeCategory('kumquat', DefaultLocales)).toBe('kumquat');
    expect(canonicalizeCategory('kumquat', DefaultLocales)).toBe('kumquat');
});
