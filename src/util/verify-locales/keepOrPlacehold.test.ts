import { MachineTranslated, Revised, Unwritten } from '@locale/Annotations';
import { isRevised, isUnwritten } from '@locale/LocaleText';
import { expect, test } from 'vitest';
import { keepOrPlacehold, stripMarkers } from './verifyLocale';

const English = 'It tells you whether the button is pressed.';
const Translated = 'ಇದು ಬಟನ್ ಒತ್ತಲಾಗಿದೆಯೇ ಎಂದು ಹೇಳುತ್ತದೆ.';

test('a failed re-translation keeps the existing translation, re-queued', () => {
    // The regression this exists for: drift marking made re-translating an
    // existing string the common case, and a failure replaced 20 real
    // translations across four languages with English.
    const result = keepOrPlacehold(
        `${MachineTranslated}${Translated}`,
        English,
    );
    expect(result).toBe(`${Revised}${Translated}`);
    expect(isRevised(result)).toBe(true);
    expect(result).not.toContain(English);
});

test('a string with no translation still becomes the English source, unwritten', () => {
    // Nothing to keep, so fall back loudly rather than silently shipping
    // English that looks translated.
    const result = keepOrPlacehold(undefined, English);
    expect(result).toBe(`${Unwritten}${English}`);
    expect(isUnwritten(result)).toBe(true);
});

test('an existing value that is only a marker counts as nothing to keep', () => {
    expect(keepOrPlacehold(Unwritten, English)).toBe(`${Unwritten}${English}`);
    expect(keepOrPlacehold(`${Revised}   `, English)).toBe(
        `${Unwritten}${English}`,
    );
});

test('markers never stack on the kept translation', () => {
    for (const marker of [Unwritten, Revised, MachineTranslated])
        expect(keepOrPlacehold(`${marker}${Translated}`, English)).toBe(
            `${Revised}${Translated}`,
        );
});

test('the English source is written without its own markers', () => {
    expect(keepOrPlacehold(undefined, `${Revised}${English}`)).toBe(
        `${Unwritten}${English}`,
    );
});

test('stripMarkers removes the queueing markers', () => {
    expect(stripMarkers(`${Unwritten}a`)).toBe('a');
    expect(stripMarkers(`${Revised}a`)).toBe('a');
});
