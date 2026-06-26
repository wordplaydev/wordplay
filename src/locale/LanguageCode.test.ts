import { expect, test } from 'vitest';
import {
    GoogleTranslateCodeOverrides,
    Languages,
    Translatable,
    TranslatableLocales,
} from '@locale/LanguageCode';

test('every translatable code is a real language', () => {
    for (const code of Translatable)
        expect(Languages, `${code} is not in Languages`).toHaveProperty(code);
});

test('TranslatableLocales only offers allowlisted languages', () => {
    for (const locale of TranslatableLocales)
        expect(
            Translatable,
            `${locale.language} is offered but not translatable`,
        ).toContain(locale.language);
});

test('languages Google Translate does not support are not offered', () => {
    // Verified absent from https://cloud.google.com/translate/docs/languages
    // (2026-06-25). These previously slipped through the denylist and would
    // have failed the whole translation at request time.
    const unsupported = [
        'av',
        'bh',
        'ce',
        'fo',
        'ks',
        'bax',
        'blt',
        'brx',
        'bsq',
        'bug',
        'ccp',
        'chr',
        'cjm',
        'cop',
        'emk',
        'fon',
        'hnn',
        'hoc',
        'khb',
        'kha',
        'kru',
        'lep',
        'lif',
        'lis',
        'mad',
        'mag',
        'men',
        'mos',
        'mro',
        'nnp',
        'nod',
        'nst',
        'osa',
        'raj',
        'rej',
        'rhg',
        'sah',
        'sat',
        'saz',
        'srb',
        'syl',
        'tbw',
        'tdd',
        'tem',
        'tzm',
        'txo',
        'unr',
        'vai',
        'war',
        'zza',
        'kbd',
        'ady',
        'lez',
        'myv',
        'mdf',
        'udm',
        'tyv',
    ];
    for (const code of unsupported)
        expect(
            Translatable,
            `${code} should not be translatable`,
        ).not.toContain(code);
});

test('code overrides map to the code Google expects', () => {
    expect(GoogleTranslateCodeOverrides).toMatchObject({
        nb: 'no',
        nn: 'no',
        mhr: 'chm',
        tl: 'fil',
        tw: 'ak',
    });
    // Anything with an override must still be offered, since it is supported.
    for (const code of Object.keys(GoogleTranslateCodeOverrides))
        expect(Translatable).toContain(code);
});
