import type Locale from '@locale/Locale';
import Markup from '@nodes/Markup';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import { toMarkup } from '@parser/toMarkup';
import { splitMarkupAndCode } from '@util/verify-locales/protect';

/**
 * The raw machine-translation step, injected so this core is independent of the
 * backend and transport. Receives the unique source strings plus the source and
 * target locales, and returns translations aligned 1:1 with the inputs, or
 * `null` on failure. The browser injects a Firebase callable; the CLI injects a
 * direct backend call.
 */
export type RawTranslator = (
    texts: string[],
    from: Locale,
    to: Locale,
    /** Optional context for quality: a sample of the project's other names and
     *  docs so the backend can choose domain-appropriate words. */
    context?: { names?: string[]; docs?: string[] },
) => Promise<(string | undefined)[] | null>;

/**
 * Collapse soft line breaks (single newlines and other whitespace runs) within
 * a paragraph's markup to single spaces, leaving `\code\` blocks untouched.
 *
 * Translators reflow prose, so a source newline has no stable counterpart in the
 * translation; sending the newline through risks the model dropping it entirely
 * and running words together (e.g. "and\nexplain" → "yexplicar"). Normalizing to
 * spaces up front guarantees correct word spacing; the cost is that translated
 * docs don't preserve the source's line wrapping.
 */
export function normalizeSoftBreaks(text: string): string {
    return splitMarkupAndCode(text)
        .map((seg) =>
            seg.kind === 'code' ? seg.text : seg.text.replace(/\s+/g, ' '),
        )
        .join('');
}

/**
 * Serialize a Markup node to translatable Wordplay source text: each paragraph's
 * source with soft breaks normalized, joined by blank lines. `\code\` blocks stay
 * verbatim so the translator preserves them.
 */
export function markupToText(markup: Markup): string {
    return markup.paragraphs
        .map((p) => normalizeSoftBreaks(p.toWordplay()))
        .join('\n\n');
}

/**
 * Parse translated Wordplay markup text back into a Markup node. toMarkup builds
 * the node with no Spaces, but the renderer ([MarkupHTMLView](src/components/concepts/MarkupHTMLView.svelte))
 * falls back to "unable to render markup without spaces" when spaces are missing,
 * so we reattach computed spaces. Metadata (unwritten/machineTranslated) that
 * toMarkup derives from annotations is preserved.
 */
export function textToMarkup(text: string): Markup {
    const [markup] = toMarkup(text);
    return new Markup(
        markup.paragraphs,
        getPreferredSpaces(markup),
        markup.metadata,
    );
}

/**
 * Translate a single Wordplay markup string, preserving embedded `\code\`.
 * Returns the translated string, or `null` on any anomaly so callers keep the
 * source. This is the primitive for markup stored as strings (chat messages,
 * how-to text).
 */
export async function translateMarkupText(
    text: string,
    from: Locale,
    to: Locale,
    translate: RawTranslator,
    context?: { names?: string[]; docs?: string[] },
): Promise<string | null> {
    const result = await translate(
        [normalizeSoftBreaks(text)],
        from,
        to,
        context,
    );
    if (result === null) return null;
    const translated = result[0];
    return typeof translated === 'string' ? translated : null;
}

/**
 * Translate a Markup node (prose plus embedded `\code\`) into a translated Markup
 * node, preserving code and reattaching renderable spaces. Returns `null` on
 * failure so callers keep the original.
 */
export async function translateMarkup(
    markup: Markup,
    from: Locale,
    to: Locale,
    translate: RawTranslator,
    context?: { names?: string[]; docs?: string[] },
): Promise<Markup | null> {
    const translated = await translateMarkupText(
        markupToText(markup),
        from,
        to,
        translate,
        context,
    );
    return translated === null ? null : textToMarkup(translated);
}
