import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';
import type LocaleText from '../locale/LocaleText';
import { readFileSync } from 'fs';
import DefaultLocale from '../locale/DefaultLocale';
import Locales from '../locale/Locales';
import concretize from '@locale/concretize';

/** Load a few locales for testing. */
const en = DefaultLocale;
const es = JSON.parse(readFileSync('static/locales/es-MX/es-MX.json', 'utf8'));

test.each([
    [`"hello"`, '"hello"', [en]],
    [`"hello"/`, '"hello"', [en]],
    [`"hello"/en`, '"hello"/en', [en]],
    [`"hello\\1\\world"/en`, '"hello1world"/en', [en]],
    [`"hello\\'no'\\world"/en`, '"hellonoworld"/en', [en]],
    ['"hello"', '"hello"', [en]],
    ['"hello"/en', '"hello"/en', [en]],
    ['"hello"/en"hola"/es', '"hello"/en', [en]],
    ['"hello"/en"hola"/es', '"hola"/es', [es]],
    ['"hello"/en"hola"/es', '"hola"/es', [es, en]],
    ['"hola"/es"hello"/en', '"hola"/es', [es, en]],
    ['"hola"/es"hello"/en', '"hello"/en', [en]],
])('%s -> %s', async (code, value, locales: LocaleText[]) => {
    const loc = new Locales(concretize, locales, DefaultLocale);
    expect(evaluateCode(code, [], loc)?.toWordplay(loc)).toBe(value);
});
