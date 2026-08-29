import type Locale from '@locale/Locale';
import { localeToString } from '@locale/Locale';
import Markup from '@nodes/Markup';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import { toMarkup } from '@parser/toMarkup';
import {
    hasResidualLinkMask,
    mismatchedConceptLinks,
    mismatchedDelimiter,
    protectConceptLinks,
    restoreConceptLinks,
    splitMarkupAndCode,
} from '@util/verify-locales/protect';

/**
 * The raw machine-translation step, injected so this core is independent of the
 * backend and transport. Receives the unique source strings plus the source and
 * target locales, and returns translations aligned 1:1 with the inputs, or
 * `null` on failure. The browser injects a Firebase callable; the CLI injects a
 * direct backend call.
 */
/** How far a translation has got, for a caller that wants to show progress.
 *  Beside RawTranslator because every backend reports it the same way. */
export type TranslationProgress = {
    /** Strings translated so far. */
    done: number;
    /** Strings in total. */
    total: number;
    /** Of those done, how many came back with no translation and so keep their
     *  original words. */
    kept: number;
};

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

/** A markup string taken apart for translation: its segments in order, the
 *  masked prose to send, and the `@Concept` links each unit is holding. */
export type ProtectedMarkup = {
    segments: { kind: 'markup' | 'code'; text: string }[];
    units: string[];
    links: string[][];
};

/** Whether a segment is prose a translator should see at all. */
function translatable(segment: { kind: 'markup' | 'code'; text: string }) {
    return segment.kind === 'markup' && segment.text.trim().length > 0;
}

/**
 * Take a markup string apart so a translator only ever sees prose.
 *
 * `\code\` never leaves at all — `splitMarkupAndCode` holds it out, so no
 * backend gets the chance to reflow a program — and `@Concept` links become
 * `⟦n⟧` placeholders, because asking is not enforcing. The system prompt
 * already tells the model to keep them verbatim, in about as strong terms as
 * English allows, and it renames them anyway (`@Program` → `@Програм`). The
 * on-device translator was never told anything at all, and will translate a
 * link the way it translates any other word.
 *
 * The same protection `ClaudeTranslator` applies to locale files, written here
 * rather than imported from it: that module's first import is the Anthropic
 * SDK, which must not reach the browser bundle.
 */
export function protectMarkup(text: string): ProtectedMarkup {
    const segments = splitMarkupAndCode(normalizeSoftBreaks(text));
    const units: string[] = [];
    const links: string[][] = [];
    for (const segment of segments)
        if (translatable(segment)) {
            const masked = protectConceptLinks(segment.text);
            units.push(masked.masked);
            links.push(masked.links);
        }
    return { segments, units, links };
}

/**
 * Put a markup string back together from its translated prose, or null when the
 * translation cannot be trusted.
 *
 * Four ways it cannot, and all four keep the source instead. A unit that came
 * back missing — the backend's per-item `undefined`. A placeholder that survived
 * restoration, which means the restore silently failed and a reader would be
 * shown `⟦0⟧`; `mismatchedConceptLinks` cannot catch that alone, because when
 * the source has no links of its own both sides count zero and it sails
 * through. A link the translation renamed or dropped, which now resolves to
 * nothing. And a `\` or backtick the translation invented: every real one was
 * held out of this unit, so one in what came back is the model's, and left in it
 * unbalances the rebuilt markup and breaks tokenization for everything after.
 *
 * A chat message gets the same four checks a locale doc does, for the same
 * reason: a reader shown `⟦0⟧` has been shown a bug, where a reader shown the
 * original words has merely been shown the original words.
 */
export function restoreMarkup(
    protectedMarkup: ProtectedMarkup,
    translations: (string | undefined)[],
): string | null {
    let unit = 0;
    let rebuilt = '';
    for (const segment of protectedMarkup.segments) {
        if (!translatable(segment)) {
            rebuilt += segment.text;
            continue;
        }
        const translated = translations[unit];
        const links = protectedMarkup.links[unit] ?? [];
        unit += 1;
        if (typeof translated !== 'string') return null;
        const restored = restoreConceptLinks(translated, links);
        if (hasResidualLinkMask(restored)) return null;
        if (mismatchedConceptLinks(segment.text, restored) !== undefined)
            return null;
        if (mismatchedDelimiter(segment.text, restored) !== undefined)
            return null;
        rebuilt += restored;
    }
    return rebuilt;
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
    const protectedMarkup = protectMarkup(text);
    // Nothing but code and whitespace: keep it rather than ask a translator
    // about a program.
    if (protectedMarkup.units.length === 0)
        return restoreMarkup(protectedMarkup, []);
    const result = await translate(protectedMarkup.units, from, to, context);
    return result === null ? null : restoreMarkup(protectedMarkup, result);
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

    // Group by source locale so each language is one batched call — which is
    // also what lets a backend be chosen per language pair, since one call is
    // then always one direction of translation.
    const grouped = new Map<
        string,
        {
            from: Locale;
            items: { id: string; protectedMarkup: ProtectedMarkup }[];
        }
    >();
    for (const input of inputs) {
        const key = localeToString(input.from);
        let group = grouped.get(key);
        if (group === undefined) {
            group = { from: input.from, items: [] };
            grouped.set(key, group);
        }
        group.items.push({
            id: input.id,
            protectedMarkup: protectMarkup(input.text),
        });
    }

    await Promise.all(
        Array.from(grouped.values()).map(async (group) => {
            function failAll() {
                for (const item of group.items) failed.add(item.id);
            }

            // Deduplicated by masked *unit* rather than by whole message, so
            // two people saying the same thing — and one person's two identical
            // sentences — cost one translation between them.
            //
            // The links are deliberately not part of the key. `See ⟦0⟧.` is the
            // same sentence whether the link was @Phrase or @Group, and each
            // occurrence restores its own, so keying on the links as well would
            // pay twice for one translation.
            const order = new Map<string, number>();
            const unique: string[] = [];
            for (const item of group.items)
                for (const unit of item.protectedMarkup.units)
                    if (!order.has(unit)) {
                        order.set(unit, unique.length);
                        unique.push(unit);
                    }

            let answers: (string | undefined)[] | null = [];
            if (unique.length > 0)
                try {
                    answers = await translate(unique, group.from, to, context);
                } catch (_) {
                    // This batch failed; mark its ids so callers can flag each
                    // one rather than failing the whole pass.
                    answers = null;
                }
            if (answers === null) return failAll();

            const given = answers;
            for (const item of group.items) {
                const rebuilt = restoreMarkup(
                    item.protectedMarkup,
                    item.protectedMarkup.units.map((unit) => {
                        const at = order.get(unit);
                        return at === undefined ? undefined : given[at];
                    }),
                );
                if (rebuilt === null) failed.add(item.id);
                else translated.set(item.id, rebuilt);
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
