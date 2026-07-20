import concretize from '@locale/concretize';
import { readFileSync } from 'fs';
import { expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import evaluateCode from '@runtime/evaluate';

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
    // Multilingual selection — issue #430:
    // A user with an `es` locale prefers the monolingual `/es` translation
    // even when a multilingual `/es_en` translation is also a match.
    ['"hola"/es"hola gentleman"/es_en', '"hola"/es', [es]],
    // When no monolingual translation matches, a multilingual one wins.
    ['"hola gentleman"/es_en"hello"/en', '"hola gentleman"/es_en', [es]],
    // A multilingual tag matches via either of its languages.
    ['"hola gentleman"/es_en', '"hola gentleman"/es_en', [en]],
])('%s -> %s', async (code, value, locales: LocaleText[]) => {
    const loc = new Locales(concretize, locales, DefaultLocale);
    expect(evaluateCode(code, [], loc)?.toWordplay(loc)).toBe(value);
});

// A non-codepoint `@`-link in text is literal, not a stray control character.
// Only `@U/<2–6 hex>` resolves as a codepoint escape; `@example.com`, `@b`,
// bare hex like `@2713`, etc. stay verbatim — consistent with the tokenizer (#773).
test.each([
    ["'amy@example.com'", 'amy@example.com'],
    ["'a@b'", 'a@b'],
    ["'@cat'", '@cat'],
    ["'@U/2713'", '✓'], // 4-hex codepoint escape resolves (✓)
    ["'@U/1F600'", '😀'], // astral codepoint escape (not truncated)
    ["'@2713'", '@2713'], // bare hex is a name, not a codepoint
    ["'hi@U/2713'", 'hi✓'], // the `/` form is unambiguous even mid-word
    ["'@U/xyz'", '@U/xyz'], // invalid hex stays literal
    // `@@` is an escaped literal `@`, folded left-to-right so it shields a
    // following codepoint too (`@@U/2713` is `@` then `U/2713`, not the codepoint).
    ["'a@@b'", 'a@b'],
    ["'a@@U/2713b'", 'a@U/2713b'],
    ["'a@@name'", 'a@name'],
])('%s value -> %j', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(`"${value}"`);
});
