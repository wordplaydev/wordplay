import { expect, test } from 'vitest';
import {
    getCollationLocale,
    getCollator,
    getCollatorFor,
} from '@unicode/collation';

// Root is spelled 'en' because the obvious spellings of "no locale in
// particular" — no argument, or 'und' — resolve to the host locale instead,
// which is exactly the machine dependence this module exists to avoid.
test('root collation resolves to en everywhere, never to the host locale', () => {
    expect(getCollator('en').resolvedOptions().locale).toBe('en');
    expect(new Intl.Collator('und').resolvedOptions().locale).not.toBe('und');
});

// Root asks for CLDR's emoji ordering. A missing collation resolves quietly to
// the default one rather than throwing, so without this the emoji ordering
// could differ per runtime and nothing would say so.
test('the root collator carries the emoji collation', () => {
    expect(getCollationLocale([])).toBe('en-u-co-emoji');
    expect(getCollator('en-u-co-emoji').resolvedOptions().collation).toBe(
        'emoji',
    );
});

test('a collator is built once per locale', () => {
    expect(getCollator('sv')).toBe(getCollator('sv'));
});

test.each([
    // Every tagged key agrees, so that language's collation decides.
    [['sv', 'sv'], 'sv'],
    // Untagged and unusable tags abstain rather than veto: tagging is
    // optional, so one untagged word shouldn't reorder a list the rest agreed
    // on. `es_en` is a valid Wordplay tag and not a valid BCP-47 one.
    [['sv', undefined], 'sv'],
    [[undefined, 'sv', 'es_en'], 'sv'],
    [[undefined, ''], 'en-u-co-emoji'],
    // Nothing to agree on, or a disagreement, falls back to root.
    [[], 'en-u-co-emoji'],
    [['sv', 'de'], 'en-u-co-emoji'],
    // Tags are canonicalized before being compared, so case doesn't split a vote.
    [['SV', 'sv'], 'sv'],
])('the tags %s collate as %s', (tags, expected) => {
    expect(getCollationLocale(tags)).toBe(expected);
});

// The rule has to be independent of the order values arrived in, or sorting
// the same set twice from different starting orders would give two answers.
test('the collation locale does not depend on tag order', () => {
    expect(getCollationLocale(['de', 'sv'])).toBe(
        getCollationLocale(['sv', 'de']),
    );
    expect(getCollationLocale([undefined, 'sv'])).toBe(
        getCollationLocale(['sv', undefined]),
    );
});

// Collation is a strict order, not a case-blind one: a sort needs the pair to
// have an answer, or equal-looking values keep whatever order they arrived in.
test('collation distinguishes case rather than tying it', () => {
    expect(getCollatorFor([]).compare('a', 'A')).toBeLessThan(0);
    expect(getCollatorFor([]).compare('a', 'a')).toBe(0);
});

test('a tag brings its own letter ordering', () => {
    // Swedish puts ä after z; root sorts it with a.
    expect(getCollatorFor(['sv']).compare('ä', 'z')).toBeGreaterThan(0);
    expect(getCollatorFor([]).compare('ä', 'z')).toBeLessThan(0);
});
