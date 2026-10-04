import { Revised } from '#locale/Annotations.ts';
import type LocaleText from '#locale/LocaleText.ts';
import { classifyPair } from '#util/verify-locales/classifyLocalePath.ts';
import { splitMarkupAndCode } from '#util/verify-locales/protect.ts';
import LocalePath, {
    getKeyTemplatePairs,
} from '#util/verify-locales/LocalePath.ts';
import type Log from '#util/verify-locales/Log.ts';

/**
 * Find translations whose spaces were lost.
 *
 * A translation pass once returned strings with every space removed —
 * `Escolhaumemojiouumapersonagempersonalizada…` in pt-PT, and an example in
 * ar-SA, ne-NP and zh-CN whose code came back as `ƒ( #\n###)#:ƒinteresting(…)`.
 * The schema, the delimiter counts, and every other check accept both, and the
 * example's 🪲 marker exempted it from conflict checking as well.
 *
 * Code and prose are measured apart. Code is spaced the same way in every
 * language, so a code span holding a quarter of en-US's whitespace is damage
 * wherever it appears. Prose is not — Japanese and Chinese use no spaces at all
 * — so the prose test applies only to a locale whose prose overall keeps at
 * least half of en-US's spaces, a fact read off the locale itself rather than a
 * list of scripts.
 */

/** Below this many whitespace characters in en-US, a quarter is too few to mean anything. */
const MinimumEnglishSpaces = 8;
/** A string keeping less than this share of en-US's whitespace has lost its spaces. */
const CollapsedRatio = 0.25;
/** A locale whose prose keeps at least this share of en-US's whitespace separates words with spaces. */
const SpacedLocaleRatio = 0.5;
/** Collapsed prose leaves a run of words with nothing between them. A concise
 *  translation in a spaced language (Korean's `마지막에 확인할 @Text입니다.` for a
 *  nine-space English sentence) keeps its runs short. */
const CollapsedRunLength = 25;

type Measure = { prose: number; code: number; run: number };

export default function checkCollapsedSpaces(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix ? structuredClone(target) : target;

    const measured: { pair: LocalePath; english: Measure; local: Measure }[] =
        [];
    let englishProse = 0;
    let localProse = 0;
    for (const pair of getKeyTemplatePairs(revised)) {
        // `guidance` is the locale's own conventions, not a translation.
        if (pair.top()) continue;
        if (classifyPair(pair) === 'name') continue;
        const raw = flatten(pair.value);
        const english = flatten(pair.resolve(source));
        if (raw === undefined || english === undefined) continue;
        // Queued strings are already going to be redone.
        if (raw.startsWith('$?') || raw.startsWith('$!')) continue;
        const local = measure(raw.replace(/^\$[?!~]/, ''));
        const englishMeasure = measure(english);
        englishProse += englishMeasure.prose;
        localProse += local.prose;
        measured.push({ pair, english: englishMeasure, local });
    }

    const spaced =
        englishProse > 0 && localProse / englishProse >= SpacedLocaleRatio;

    const collapsed: LocalePath[] = measured
        .filter(
            ({ english, local }) =>
                collapsedIn(english.code, local.code) ||
                (spaced &&
                    collapsedIn(english.prose, local.prose) &&
                    local.run >= CollapsedRunLength &&
                    local.run > english.run * 2),
        )
        .map(({ pair }) => pair);

    if (collapsed.length > 0) {
        log.bad(
            `${collapsed.length} string(s) lost most of their spaces in translation${fix ? `; marking them "${Revised}" queues them for re-translation` : ''}: ${collapsed
                .slice(0, 20)
                .map((pair) => pair.toString())
                .join(', ')}`,
        );
        if (fix) for (const pair of collapsed) queue(pair, revised);
    }

    return revised;
}

function collapsedIn(english: number, local: number): boolean {
    return english >= MinimumEnglishSpaces && local < english * CollapsedRatio;
}

/** A doc, a markup literal, or a text literal in any of the tokenizer's quote pairs. */
const Literals =
    /¶[^¶]*¶|`[^`]*`|'[^']*'|"[^"]*"|‘[^’]*’|“[^”]*”|«[^»]*»|「[^」]*」|『[^』]*』/g;

function spaces(text: string): number {
    return (text.match(/\s/g) ?? []).length;
}

/** Whitespace in a string's prose and in its code, counted apart, and the
 *  longest run of prose without any. */
function measure(text: string): Measure {
    const result: Measure = { prose: 0, code: 0, run: 0 };
    for (const segment of splitMarkupAndCode(text)) {
        if (segment.kind === 'markup') {
            result.prose += spaces(segment.text);
            for (const run of segment.text.match(/\S+/g) ?? [])
                result.run = Math.max(result.run, [...run].length);
        }
        // Docs, text, and markup literals inside code are prose, spaced as the
        // language is, so only what's around them is measured as code.
        else result.code += spaces(segment.text.replace(Literals, ''));
    }
    return result;
}

/** One measurable string for a value. An array is joined: a markup array's
 *  elements are paragraphs of one document, and a positional tuple's are short
 *  enough that only the whole could cross the threshold. */
function flatten(value: unknown): string | undefined {
    if (typeof value === 'string') return value.length > 0 ? value : undefined;
    if (Array.isArray(value) && value.every((v) => typeof v === 'string'))
        return value.length > 0 ? value.join('\n\n') : undefined;
    return undefined;
}

/** Replace whatever write-status the value had with `$!`, which keeps the
 *  translation while asking for a new one. A markup array carries its status on
 *  the first element only. */
function queue(pair: LocalePath, revised: LocaleText): void {
    const value = pair.value;
    const mark = (s: string) => Revised + s.replace(/^\$[?!~]/, '');
    pair.repair(
        revised,
        Array.isArray(value)
            ? classifyPair(pair) === 'markup'
                ? value.map((s, index) => (index === 0 ? mark(s) : s))
                : value.map(mark)
            : mark(String(value)),
    );
}
