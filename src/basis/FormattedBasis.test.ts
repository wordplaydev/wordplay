import evaluateCode from '@runtime/evaluate';
import { expect, test } from 'vitest';

// Convert results to plain text so we can assert both content and locale via
// TextValue.toWordplay (`"text"/locale`).
test.each([
    // A formatted literal carries its locale, recoverable via → text.
    ['`hi`/en → ""', '"hi"/en'],
    // combine concatenates and unions the operands' locales.
    ['(`a`/en + `b`/fr)', '`ab`/en_fr'],
    // An untagged side inherits the tagged side's locale.
    ['(`a`/en + `b`)', '`ab`/en'],
    // The /lang operator overrides a computed markup's locale.
    ['((`a` + `b`)/fr)', '`ab`/fr'],
    // repeat repeats the markup.
    ['`ab`.repeat(3)', '`ababab`'],
    // markup preserved
    ['`/hello/ *world*`/en + `_!!!_`/fr', '`/hello/ *world*_!!!_`/en_fr'],
    // Text → formatted carries the locale into the new markup.
    ["'hi'/en → `…`", '`hi`/en'],
])('%s evaluates to %s', (code, expected) => {
    expect(evaluateCode(code)?.toWordplay()).toBe(expected);
});

test.each([
    ['`hello`.length()', '5'],
    ["`hi`.has('h')", '⊤'],
    ["`hi`.starts('h')", '⊤'],
    ["`hi`.ends('i')", '⊤'],
    ["`hi`.ends('h')", '⊥'],
    ['`hi` = `hi`', '⊤'],
    ['`hi` = `bye`', '⊥'],
    ['`hi` ≠ `bye`', '⊤'],
])('%s evaluates to %s', (code, expected) => {
    expect(evaluateCode(code)?.toString()).toBe(expected);
});
