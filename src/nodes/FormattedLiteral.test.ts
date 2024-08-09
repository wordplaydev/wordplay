import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';
import type LocaleText from '../locale/LocaleText';
import { readFileSync } from 'fs';
import DefaultLocale from '../locale/DefaultLocale';
import Locales from '../locale/Locales';
import DefaultLocales from '@locale/DefaultLocales';
import concretize from '@locale/concretize';

/** Load a few locales for testing. */
const en = DefaultLocale;
const es = JSON.parse(readFileSync('static/locales/es-MX/es-MX.json', 'utf8'));

test.each([
    ['`hello`', 'hello', [en]],
    ['`hello`/', 'hello', [en]],
    ['`hello`/en', 'hello', [en]],
    ['`hello\\1\\world`/en', 'hello1world', [en]],
    ['`hello\\"no"\\world`/en', 'hellonoworld', [en]],
    ['`hello`', 'hello', [en]],
    ['`hello`/en', 'hello', [en]],
    ['`hello`/en`hola`/es', 'hello', [en]],
    ['`hello`/en`hola`/es', 'hola', [es]],
    ['`hello`/en`hola`/es', 'hola', [es, en]],
    ['`hola`/es`hello`/en', 'hola', [es, en]],
    ['`hola`/es`hello`/en', 'hello', [en]],
])('%s -> %s', async (code, value, locales: LocaleText[]) => {
    const loc = new Locales(
        concretize,
        locales.length === 0 ? [en] : locales,
        DefaultLocale,
    );
    expect(evaluateCode(code, [], loc)?.toWordplay(loc)).toBe(value);
});

test.each([
    // Test JavaScript number translation.
    ['`hello`', 'hello'],
    ['`hello`/', 'hello'],
    ['`hello`/en', 'hello'],
    ['`hello\\1\\world`/en', 'hello1world'],
    ["`hello\\'no'\\world`/en", 'hellonoworld'],
])('%s -> %s', (code, value) => {
    expect(evaluateCode(code)?.toWordplay(DefaultLocales)).toBe(value);
});
