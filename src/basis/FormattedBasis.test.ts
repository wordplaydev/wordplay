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

// Case conversion touches only the prose. Everything else in markup is syntax
// or an identifier: the format delimiters, a URL's path, a @concept link, an
// \example\'s code, and a $mention's key.
test.each([
    ['`hello`.uppercase()', '`HELLO`'],
    ['`HELLO`.lowercase()', '`hello`'],
    // Formatting delimiters and the words inside them both survive.
    ['`/hello/ *world*`.uppercase()', '`/HELLO/ *WORLD*`'],
    // Spacing between words survives: it lives in a map keyed by token, so a
    // rebuilt markup that loses those keys runs every word together.
    ['`hello there world`.uppercase()', '`HELLO THERE WORLD`'],
    // A concept link is an identifier, not a word.
    ['`see @Text now`.uppercase()', '`SEE @Text NOW`'],
    // A link's description is prose; its URL's path case is significant.
    [
        '`<wordplay@https://wordplay.dev/Guide>`.uppercase()',
        '`<WORDPLAY@https://wordplay.dev/Guide>`',
    ],
    // The locale tag survives, and decides the rules.
    ['`iyi`/tr.uppercase()', '`İYİ`/tr'],
    ['`iyi`/en.uppercase()', '`IYI`/en'],
])('%s evaluates to %s', (code, expected) => {
    expect(evaluateCode(code)?.toWordplay()).toBe(expected);
});
