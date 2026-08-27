import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import Locales from '@locale/Locales';
import Dimension from '@nodes/Dimension';
import NumberLiteral from '@nodes/NumberLiteral';
import Unit from '@nodes/Unit';
import { describe, expect, test } from 'vitest';
import { getUnitKey, getUnitName, getUnitNameMarkup } from './unitName';

/** en-US with a different language tag and its own names for a few units, standing in
 *  for a real locale without loading one. */
function localeWith(
    language: LocaleText['language'],
    names: Record<string, string>,
): LocaleText {
    return {
        ...DefaultLocale,
        language,
        basis: {
            ...DefaultLocale.basis,
            Number: {
                ...DefaultLocale.basis.Number,
                unit: { ...DefaultLocale.basis.Number.unit, ...names },
            },
        },
    };
}

const French = localeWith('fr', {
    m: 'mètres',
    km: 'kilomètres',
    s: 'secondes',
});

function locales(...preferred: LocaleText[]) {
    return new Locales(concretize, preferred, DefaultLocale);
}

describe('getUnitKey', () => {
    test('names a single dimension', () => {
        expect(getUnitKey(Dimension.make(false, 'km', 1))).toBe('km');
    });

    test('names a dimension the menu offers after another one', () => {
        // The menu builds these with a leading `·`, which is part of the node.
        expect(getUnitKey(Dimension.make(true, 'km', 1))).toBe('km');
    });

    test('matches on the unit text, not the table key', () => {
        // The key `us` names the dimension `µs`; comparing key strings would miss it.
        expect(getUnitKey(Dimension.make(false, 'µs', 1))).toBe('us');
        expect(getUnitKey(Dimension.make(false, 'us', 1))).toBeUndefined();
    });

    test('names a compound unit', () => {
        expect(getUnitKey(Unit.create(['m'], ['s']))).toBe('mps');
    });

    test('names a power, which the table spells as a repeated dimension', () => {
        expect(getUnitKey(Dimension.make(false, 'm', 2))).toBe('m2');
        expect(getUnitKey(Unit.create(['m', 'm']))).toBe('m2');
    });

    test('names the unit on a number literal', () => {
        expect(getUnitKey(NumberLiteral.make(1, Unit.create(['kg'])))).toBe(
            'kg',
        );
    });

    test("doesn't name a creator's own unit", () => {
        expect(getUnitKey(Dimension.make(false, 'cat', 1))).toBeUndefined();
        expect(getUnitKey(Unit.create(['cat']))).toBeUndefined();
    });

    test("doesn't name a unitless number", () => {
        expect(getUnitKey(NumberLiteral.make(1))).toBeUndefined();
    });
});

describe('getUnitName', () => {
    test('gives the primary locale name', () => {
        expect(getUnitName('km', locales(DefaultLocale))).toBe('kilometers');
        expect(getUnitName('km', locales(French))).toBe('kilomètres');
    });

    test('distinguishes units that share the generic doc', () => {
        const l = locales(DefaultLocale);
        expect(getUnitName('s', l)).not.toBe(getUnitName('min', l));
    });
});

describe('getUnitNameMarkup', () => {
    test('resolves the name in each chosen locale', () => {
        const both = locales(DefaultLocale, French);
        const markup = getUnitNameMarkup('km', both);
        expect(markup).toBeDefined();
        const echoed = [both, ...both.getSecondaryLocaleViews()].map((view) =>
            markup?.perLocale(view)?.toText(),
        );
        expect(echoed).toEqual(['kilometers', 'kilomètres']);
    });

    test('is a single name when one locale is chosen', () => {
        const one = locales(DefaultLocale);
        expect(one.getSecondaryLocaleViews()).toHaveLength(0);
        expect(getUnitNameMarkup('km', one)?.perLocale(one)?.toText()).toBe(
            'kilometers',
        );
    });
});
