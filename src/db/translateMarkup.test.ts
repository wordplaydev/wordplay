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
