import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';
import type Locale from '../locale/Locale';
import { readFileSync } from 'fs';
import DefaultLocale from '../locale/DefaultLocale';

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
    locales = locales.length === 0 ? [en] : locales;
    expect(evaluateCode(code, [], locales)?.toWordplay(locales)).toBe(value);
});
