/**
 * Italic text in locale markup, and what each locale calls the things it names.
 *
 * en-US writes the name of an on-screen control or an input in italics — "the
 * /shortcuts/ list", "the /distance/ input" — and nothing told the translator
 * what italics meant, so it often left the word in English: every locale kept
 * `/shortcuts/` in the Boolean doc, as-IN keeps 33 English italic names in its
 * tours, and ja-JP's docs say `/distance/` though it names that input `距離`.
 * This module finds italic spans and derives, from the locale's own strings,
 * the word it already uses for each one, which the translator is then given and
 * `checkItalicSpans` holds translations to.
 */
import { isRevised, isUnwritten } from '@locale/LocaleText';
import type LocaleText from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import Words from '@nodes/Words';
import { toMarkup } from '@parser/toMarkup';
import { isNameTextPath } from '@util/verify-locales/classifyLocalePath';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import { protectMarkupUnit } from '@util/verify-locales/protect';

/**
 * The italic spans in a markup string, in order, trimmed. Examples are masked
 * before parsing, so italics inside an example's own doc aren't counted, and
 * only strings with a `/` are parsed at all, which is most of what makes this
 * cheap enough to run over every locale.
 */
export function getItalicSpans(text: string): string[] {
    if (!text.includes('/')) return [];
    const [markup] = toMarkup(protectMarkupUnit(text).masked);
    return markup
        .nodes()
        .filter(
            (node): node is Words =>
                node instanceof Words && node.getFormat() === 'italic',
        )
        .map((words) => words.toText().trim())
        .filter((span) => span.length > 0);
}

/** A span worth recording: a word or short phrase, not a key combination
 *  (`/ctrl+9/`) or a lone character, which stay as written everywhere. */
function isNameLike(span: string): boolean {
    return (
        span.length > 1 &&
        !span.includes('+') &&
        !span.includes('⟦') &&
        span.split(/\s+/).length <= 3
    );
}

/** One comparable string for a pair's value, skipping queued values, which
 *  hold English awaiting translation and so say nothing about the locale. */
function valueText(value: string | string[] | undefined): string | undefined {
    if (value === undefined) return undefined;
    const parts = Array.isArray(value) ? value : [value];
    const first = parts[0];
    if (first === undefined || isUnwritten(first) || isRevised(first))
        return undefined;
    return withoutAnnotations(parts.join('\n\n'));
}

/**
 * What this locale calls each thing en-US names in italics, keyed by the
 * lowercased English. Three sources, in order of precedence:
 *
 * 1. Alignment: a string whose en-US and translated versions have the same
 *    number of italic spans pairs them by position, and the locale's most
 *    common word for each English span wins.
 * 2. Input names: an italic span that is an input's English name maps to the
 *    locale's own name for that input.
 * 3. Interface labels: a short `ui` string equal to an italic span maps to its
 *    translation, when every such string in the locale agrees.
 */
export function getItalicLabels(
    source: LocaleText,
    target: LocaleText,
): Map<string, string> {
    const votes = new Map<string, Map<string, number>>();
    const englishSpans = new Set<string>();
    const names = new Map<string, string>();
    const labels = new Map<string, Set<string>>();

    const pairs = getKeyTemplatePairs(source);
    for (const pair of pairs) {
        const english = pair.value;
        const translated = pair.resolve(target);
        const englishText = valueText(english);
        if (englishText === undefined) continue;
        const spans = getItalicSpans(englishText);
        for (const span of spans) englishSpans.add(span.toLowerCase());
        const translatedText = valueText(translated);
        if (translatedText === undefined || spans.length === 0) continue;
        const theirs = getItalicSpans(translatedText);
        if (theirs.length !== spans.length) continue;
        spans.forEach((span, index) => {
            const their = theirs[index];
            if (their === undefined || their === span || !isNameLike(span))
                return;
            const key = span.toLowerCase();
            const tally = votes.get(key) ?? new Map<string, number>();
            tally.set(their, (tally.get(their) ?? 0) + 1);
            votes.set(key, tally);
        });
    }

    for (const pair of pairs) {
        const segments = [...pair.path, pair.key];
        const english = pair.value;
        const translated = pair.resolve(target);
        if (
            pair.key === 'names' &&
            isNameTextPath(segments) &&
            Array.isArray(english) &&
            Array.isArray(translated)
        ) {
            // The locale's own name for the input: the first that en-US doesn't
            // also declare, since every locale's basis falls back to en-US's.
            const own = translated
                .map((name) => withoutAnnotations(name))
                .find((name) => name.length > 0 && !english.includes(name));
            if (own !== undefined)
                for (const name of english)
                    if (englishSpans.has(name.toLowerCase()))
                        names.set(name.toLowerCase(), own);
        } else if (
            pair.path[0] === 'ui' &&
            typeof english === 'string' &&
            typeof translated === 'string' &&
            englishSpans.has(withoutAnnotations(english).toLowerCase())
        ) {
            const text = valueText(translated);
            if (text === undefined) continue;
            const key = withoutAnnotations(english).toLowerCase();
            const seen = labels.get(key) ?? new Set<string>();
            seen.add(text);
            labels.set(key, seen);
        }
    }

    const record = new Map<string, string>();
    for (const [key, seen] of labels)
        if (seen.size === 1) {
            const [only] = seen;
            if (only !== undefined && only.toLowerCase() !== key)
                record.set(key, only);
        }
    for (const [key, name] of names)
        if (name.toLowerCase() !== key) record.set(key, name);
    for (const [key, tally] of votes) {
        const [winner] = [...tally].sort(
            ([a, countA], [b, countB]) => countB - countA || a.localeCompare(b),
        );
        if (winner !== undefined) record.set(key, winner[0]);
    }
    return record;
}

/** The record as prompt lines, sorted so the prompt is identical run to run
 *  and caches, and bounded so a large record can't crowd out the rules. */
export function getItalicLabelsForPrompt(labels: Map<string, string>): string {
    return [...labels]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, 150)
        .map(([english, local]) => `- "${english}" -> "${local}"`)
        .join('\n');
}
