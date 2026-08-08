import type Locale from '@locale/Locale';
import { localeToString } from '@locale/Locale';
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

/** One markup string to translate, tagged with a caller-chosen id (so the
 *  result can be correlated back) and its own source locale. */
export type MarkupTranslationInput = {
    id: string;
    text: string;
    from: Locale;
};

/** The outcome of a {@link translateMarkupTexts} pass: the translated text for
 *  every id that succeeded, and the set of ids whose batch failed. */
export type MarkupTranslationResults = {
    translated: Map<string, string>;
    failed: Set<string>;
};

/**
 * Translate many Wordplay markup strings into one target locale — the plural of
 * {@link translateMarkupText}. Inputs are grouped by source locale so each
 * language costs a single batched call instead of one round-trip per string,
 * with embedded `\code\` preserved. A batch that errors (or returns a
 * non-string for an entry) marks only its own ids failed, so one bad group
 * doesn't fail the rest. Backend-agnostic via the injected {@link RawTranslator}.
 */
export async function translateMarkupTexts(
    inputs: MarkupTranslationInput[],
    to: Locale,
    translate: RawTranslator,
    context?: { names?: string[]; docs?: string[] },
): Promise<MarkupTranslationResults> {
    const translated = new Map<string, string>();
    const failed = new Set<string>();

    // Group by source locale so each language is one batched call.
    const grouped = new Map<
        string,
        { from: Locale; ids: string[]; texts: string[] }
    >();
    for (const input of inputs) {
        const key = localeToString(input.from);
        const normalized = normalizeSoftBreaks(input.text);
        const existing = grouped.get(key);
        if (existing) {
            existing.ids.push(input.id);
            existing.texts.push(normalized);
        } else {
            grouped.set(key, {
                from: input.from,
                ids: [input.id],
                texts: [normalized],
            });
        }
    }

    await Promise.all(
        Array.from(grouped.values()).map(async (group) => {
            try {
                const result = await translate(
                    group.texts,
                    group.from,
                    to,
                    context,
                );
                if (result === null) {
                    for (const id of group.ids) failed.add(id);
                    return;
                }
                for (let i = 0; i < group.ids.length; i += 1) {
                    const value = result[i];
                    if (typeof value === 'string')
                        translated.set(group.ids[i], value);
                    else failed.add(group.ids[i]);
                }
            } catch (_) {
                // This batch failed; mark its ids so callers can flag each one
                // rather than failing the whole pass.
                for (const id of group.ids) failed.add(id);
            }
        }),
    );

    return { translated, failed };
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
