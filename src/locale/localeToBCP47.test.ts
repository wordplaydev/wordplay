import { expect, test } from 'vitest';
import localeToBCP47 from './localeToBCP47';

test('a multi-region locale keeps only the first region', () => {
    // `ta-IN-LK-SG` is a locale name, not a language tag: handed to Intl whole
    // it throws a RangeError rather than degrading.
    expect(localeToBCP47({ language: 'ta', regions: ['IN', 'LK', 'SG'] })).toBe(
        'ta-IN',
    );
    expect(
        new Intl.DateTimeFormat(
            localeToBCP47({ language: 'ta', regions: ['IN', 'LK', 'SG'] }),
        ).resolvedOptions().locale,
    ).toContain('ta');
});

test('a multilingual locale uses its primary language', () => {
    expect(
        localeToBCP47({
            language: 'es',
            regions: ['MX'],
            multilingual: ['es', 'en'],
        }),
    ).toBe('es-MX');
});

test('a locale with no region is just its language', () => {
    expect(localeToBCP47({ language: 'ja', regions: [] })).toBe('ja');
});
