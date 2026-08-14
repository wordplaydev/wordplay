import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import LocalePath from '@util/verify-locales/LocalePath';
import { collectingLog } from '@util/verify-locales/Log';
import { expect, test } from 'vitest';
import checkRedundantNames from './checkRedundantNames';

/**
 * A name a locale only repeats from en-US binds nothing the en-US fallback doesn't, so it
 * comes out — but only while the locale keeps a name of its own to be known by.
 */

function copyLocale(): LocaleText {
    return JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
}

/** `output.Phrase.names` is `["💬","Phrase"]` in en-US. */
const PhraseNames = new LocalePath(['output', 'Phrase'], 'names', []);
/** `basis.Text.function.notequals.names` is the lone `["≠"]`. */
const NotEquals = new LocalePath(
    ['basis', 'Text', 'function', 'notequals'],
    'names',
    [],
);

function fix(names: string[], path = PhraseNames): unknown {
    const target = copyLocale();
    path.repair(target, names);
    return path.resolve(
        checkRedundantNames(collectingLog().log, DefaultLocale, target, true),
    );
}

test('a shared symbol goes when the locale has its own name', () => {
    expect(fix(['💬', 'Frase'])).toEqual(['Frase']);
    // Machine-translated is still translated.
    expect(fix(['$~💬', '$~Frase'])).toEqual(['$~Frase']);
});

test('a shared word goes too, on the same condition', () => {
    // Portuguese and English both call it `Frase`/`Phrase`; only the shared one goes.
    expect(fix(['💬', 'Phrase', 'Frase'])).toEqual(['Frase']);
});

test('an untranslated name stays, so the gap stays visible', () => {
    // Nothing here is the locale's own, so removing the English word would leave the concept
    // nameless in this language and erase the evidence that it needs translating.
    expect(fix(['💬', 'Phrase'])).toEqual(['💬', 'Phrase']);
    // An unwritten placeholder is filtered out of Names at runtime, so it doesn't count as
    // a name of the locale's own either.
    expect(fix(['💬', 'Phrase', '$?Frase'])).toEqual([
        '💬',
        'Phrase',
        '$?Frase',
    ]);
});

test('an array of nothing but a shared symbol is left whole', () => {
    expect(fix(['≠'], NotEquals)).toEqual(['≠']);
});

test('verifying reports without changing anything', () => {
    const target = copyLocale();
    PhraseNames.repair(target, ['💬', 'Frase']);
    const { log, lines } = collectingLog();
    const result = checkRedundantNames(log, DefaultLocale, target, false);
    expect(PhraseNames.resolve(result)).toEqual(['💬', 'Frase']);
    expect(lines.join(' ')).toMatch(/repeat/);
});
