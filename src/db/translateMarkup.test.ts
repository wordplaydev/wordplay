import { stringToLocale } from '@locale/Locale';
import { toMarkup } from '@parser/toMarkup';
import { expect, test } from 'vitest';
import {
    markupToText,
    translateMarkup,
    translateMarkupText,
    translateMarkupTexts,
    type MarkupTranslationInput,
    type RawTranslator,
} from './translateMarkup';

const en = stringToLocale('en-US');
const es = stringToLocale('es-ES');

/** A fake translator that only rewrites known prose words, so embedded `\code\`
 *  (which contains none of them) passes through verbatim — no network needed. */
const wordTranslator: RawTranslator = async (texts) =>
    texts.map((t) =>
        t.replaceAll('hello', 'hola').replaceAll('world', 'mundo'),
    );

test('translateMarkup translates prose and preserves embedded code and spaces', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    const [markup] = toMarkup('hello \\1 + 2\\ world');

    const result = await translateMarkup(markup, en, es, wordTranslator);

    expect(result).not.toBeNull();
    const out = result?.toWordplay() ?? '';
    // Prose is translated.
    expect(out).toContain('hola');
    expect(out).toContain('mundo');
    // The `\code\` block survives (re-spaced by the parser, but not translated).
    expect(out).toContain('\\1+2\\');
    // Spaces are reattached, so the result is renderable.
    expect(result?.spaces).not.toBeUndefined();
});

test('markupToText leaves code blocks untouched while normalizing prose whitespace', () => {
    const [markup] = toMarkup('a\n\\1 + 2\\\nb');
    // Newlines around prose collapse to single spaces; the code keeps its content.
    expect(markupToText(markup)).toContain('\\1+2\\');
});

test('translateMarkupText returns null when the translator fails', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const failing: RawTranslator = async () => null;
    expect(await translateMarkupText('hello', en, es, failing)).toBeNull();
});

// ---------------------------------------------------------------------------
// translateMarkupTexts
// ---------------------------------------------------------------------------

const fr = stringToLocale('fr-FR');

test('translateMarkupTexts groups by source locale — single batch per language', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const calls: { texts: string[] }[] = [];
    const spy: RawTranslator = async (texts) => {
        calls.push({ texts });
        return texts.map((t) => t + '_translated');
    };
    const inputs: MarkupTranslationInput[] = [
        { id: 'a', text: 'hello', from: en },
        { id: 'b', text: 'world', from: en },
    ];
    const { translated, failed } = await translateMarkupTexts(inputs, es, spy);
    // Both en-US strings go in one call, not two.
    expect(calls).toHaveLength(1);
    expect(calls[0].texts).toHaveLength(2);
    expect(translated.size).toBe(2);
    expect(failed.size).toBe(0);
});

test('translateMarkupTexts sends separate batches for different source locales', async () => {
    if (en === undefined || es === undefined || fr === undefined)
        throw new Error('bad locale');
    const calls: string[][] = [];
    const spy: RawTranslator = async (texts) => {
        calls.push(texts);
        return texts.map((t) => t + '_translated');
    };
    const inputs: MarkupTranslationInput[] = [
        { id: 'a', text: 'hello', from: en },
        { id: 'b', text: 'bonjour', from: fr },
    ];
    await translateMarkupTexts(inputs, es, spy);
    // en-US and fr-FR are separate groups → two calls.
    expect(calls).toHaveLength(2);
});

test('translateMarkupTexts isolates per-group failures — other groups still succeed', async () => {
    if (en === undefined || es === undefined || fr === undefined)
        throw new Error('bad locale');
    const spy: RawTranslator = async (_texts, from) => {
        // The French group fails; the English group succeeds.
        if (from.language === 'fr') return null;
        return _texts.map((t) => t + '_ok');
    };
    const inputs: MarkupTranslationInput[] = [
        { id: 'en1', text: 'hello', from: en },
        { id: 'fr1', text: 'bonjour', from: fr },
    ];
    const { translated, failed } = await translateMarkupTexts(inputs, es, spy);
    expect(translated.has('en1')).toBe(true);
    expect(failed.has('fr1')).toBe(true);
    // The succeeded id must not appear in failed.
    expect(failed.has('en1')).toBe(false);
});

test('translateMarkupTexts marks id failed when translator returns undefined for that entry', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const spy: RawTranslator = async (texts) =>
        // Return undefined for the second entry.
        texts.map((t, i) => (i === 1 ? undefined : t + '_ok'));
    const inputs: MarkupTranslationInput[] = [
        { id: 'a', text: 'one', from: en },
        { id: 'b', text: 'two', from: en },
    ];
    const { translated, failed } = await translateMarkupTexts(inputs, es, spy);
    expect(translated.has('a')).toBe(true);
    expect(failed.has('b')).toBe(true);
});

test('translateMarkupTexts marks all ids in a throwing group as failed', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const spy: RawTranslator = async () => {
        throw new Error('network failure');
    };
    const inputs: MarkupTranslationInput[] = [
        { id: 'x', text: 'hello', from: en },
        { id: 'y', text: 'world', from: en },
    ];
    const { translated, failed } = await translateMarkupTexts(inputs, es, spy);
    expect(translated.size).toBe(0);
    expect(failed).toContain('x');
    expect(failed).toContain('y');
});

test('translateMarkupTexts returns empty maps for empty input', async () => {
    if (es === undefined) throw new Error('bad locale');
    const spy: RawTranslator = async (texts) => texts;
    const { translated, failed } = await translateMarkupTexts([], es, spy);
    expect(translated.size).toBe(0);
    expect(failed.size).toBe(0);
});

test('translateMarkupTexts deduplicates identical source texts — one translator entry per unique string', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const calls: string[][] = [];
    const spy: RawTranslator = async (texts) => {
        calls.push([...texts]);
        return texts.map((t) => t + '_translated');
    };
    const inputs: MarkupTranslationInput[] = [
        { id: 'a', text: 'hello', from: en },
        { id: 'b', text: 'hello', from: en }, // exact duplicate
        { id: 'c', text: 'world', from: en },
    ];
    const { translated, failed } = await translateMarkupTexts(inputs, es, spy);
    // Only 2 unique texts sent to the translator, not 3.
    expect(calls).toHaveLength(1);
    expect(calls[0]).toHaveLength(2);
    // All three ids succeeded; duplicates share the same result.
    expect(failed.size).toBe(0);
    expect(translated.size).toBe(3);
    expect(translated.get('a')).toBe(translated.get('b'));
});

/**
 * What a translator does to markup it was never told about.
 *
 * The Firebase backend is asked, in the system prompt, to keep `@Concept` links
 * and `\code\` verbatim; the on-device one cannot be asked anything at all. So
 * neither is trusted with either: code is held out of what is sent, links are
 * masked, and a translation that comes back having lost or renamed one is
 * refused rather than shown.
 */

/** Uppercases everything, the way a translator changes every word it is given. */
const shouty: RawTranslator = async (texts) =>
    texts.map((text) => text.toUpperCase());

test('a translator never sees embedded code, so it cannot rewrite it', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const seen: string[][] = [];
    const watching: RawTranslator = async (texts) => {
        seen.push([...texts]);
        return texts.map((text) => text.toUpperCase());
    };

    const { translated } = await translateMarkupTexts(
        [{ id: 'a', text: 'try \\1 + 2\\ now', from: en }],
        es,
        watching,
    );

    // The code never left.
    expect(seen[0].join('|')).not.toContain('1 + 2');
    // And came back byte-identical, while the prose around it was translated.
    expect(translated.get('a')).toContain('\\1 + 2\\');
    expect(translated.get('a')).toContain('TRY');
});

test('a concept link survives a translator that would have renamed it', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const { translated, failed } = await translateMarkupTexts(
        [{ id: 'a', text: 'see @Phrase for more', from: en }],
        es,
        shouty,
    );
    expect(failed.size).toBe(0);
    // Masked, so uppercasing the sentence could not reach it.
    expect(translated.get('a')).toContain('@Phrase');
});

test('a translation that drops a link mask is refused, not shown', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const losesLinks: RawTranslator = async (texts) =>
        texts.map((text) => text.replace(/⟦\d+⟧/gu, ''));

    const { translated, failed } = await translateMarkupTexts(
        [{ id: 'a', text: 'see @Phrase for more', from: en }],
        es,
        losesLinks,
    );
    // A reader shown the original words has merely been shown the original
    // words; a reader shown a link that resolves to nothing has been shown a bug.
    expect(failed.has('a')).toBe(true);
    expect(translated.has('a')).toBe(false);
});

test('a translation still carrying a placeholder is refused', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    // Transliterates the mask's digit into another script, which is exactly
    // what a model rewriting a sentence into that script does. This one is not
    // recoverable, so it has to be caught: when the source carries no links of
    // its own, counting links finds nothing wrong and `⟦0⟧` reaches a reader.
    const mangles: RawTranslator = async (texts) =>
        texts.map((text) => text.replace(/⟦(\d+)⟧/gu, '[[$1]]'));

    const { failed } = await translateMarkupTexts(
        [{ id: 'a', text: 'see @Phrase for more', from: en }],
        es,
        mangles,
    );
    expect(failed.has('a')).toBe(true);
});

test('a translation that invents a delimiter is refused', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const inventsCode: RawTranslator = async (texts) =>
        texts.map((text) => text + ' `');

    const { failed } = await translateMarkupTexts(
        [{ id: 'a', text: 'plain words', from: en }],
        es,
        inventsCode,
    );
    // Every real delimiter was held out of this unit, so one in what came back
    // is the translator's — and left in it unbalances everything after it.
    expect(failed.has('a')).toBe(true);
});

test('two messages sharing a sentence each restore their own link', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const calls: string[][] = [];
    const spy: RawTranslator = async (texts) => {
        calls.push([...texts]);
        return texts.map((text) => text.toUpperCase());
    };

    const { translated } = await translateMarkupTexts(
        [
            { id: 'a', text: 'see @Phrase', from: en },
            { id: 'b', text: 'see @Group', from: en },
        ],
        es,
        spy,
    );

    // One translation bought: masked, both sentences are `see ⟦0⟧`.
    expect(calls[0]).toHaveLength(1);
    // But each keeps the link it actually had — the trap in deduplicating on
    // masked text while restoring from a shared array of links.
    expect(translated.get('a')).toContain('@Phrase');
    expect(translated.get('b')).toContain('@Group');
});

test('a message that is nothing but code costs no translation at all', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const calls: string[][] = [];
    const spy: RawTranslator = async (texts) => {
        calls.push([...texts]);
        return texts;
    };

    const { translated, failed } = await translateMarkupTexts(
        [{ id: 'a', text: '\\1 + 2\\', from: en }],
        es,
        spy,
    );
    expect(calls).toHaveLength(0);
    expect(failed.size).toBe(0);
    expect(translated.get('a')).toBe('\\1 + 2\\');
});
