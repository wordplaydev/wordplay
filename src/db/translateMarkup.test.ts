import { stringToLocale } from '@locale/Locale';
import { toMarkup } from '@parser/toMarkup';
import { expect, test } from 'vitest';
import {
    markupToText,
    translateMarkup,
    translateMarkupText,
    type RawTranslator,
} from './translateMarkup';

const en = stringToLocale('en-US');
const es = stringToLocale('es-ES');

/** A fake translator that only rewrites known prose words, so embedded `\code\`
 *  (which contains none of them) passes through verbatim — no network needed. */
const wordTranslator: RawTranslator = async (texts) =>
    texts.map((t) => t.replaceAll('hello', 'hola').replaceAll('world', 'mundo'));

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
