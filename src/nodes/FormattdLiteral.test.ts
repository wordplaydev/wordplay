import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';
import type Locale from '../locale/Locale';
import { readFileSync } from 'fs';
import DefaultLocale from '../locale/DefaultLocale';
import Locales from '../locale/Locales';

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
])('%s -> %s', async (code, value, locales: Locale[]) => {
    const loc = new Locales(
        locales.length === 0 ? [en] : locales,
        DefaultLocale
    );
    expect(evaluateCode(code, [], loc)?.toWordplay(loc)).toBe(value);
});
