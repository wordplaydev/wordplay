/**
 * Link a glossary word to its definition the first time a reader meets it.
 *
 * en-US `guidance` already states the convention — "a glossary reference the
 * first time you use shared vocabulary like value or expression" — but nothing
 * enforced it, so the words a lesson leans on were introduced late or never.
 * Measured over the en-US tutorial in reading order, `type` was first used 107
 * paragraphs before it was first linked, `value` 22, `stage` 14; `operator`,
 * `loop`, and `side effect` were never linked at all. That is the whole of
 * issue #960: a reader meets "stream" as load-bearing jargon with no way to ask
 * what it means that doesn't leave the lesson.
 *
 * **First use, not every use.** `value` is already a term and is still written
 * bare 143 times against 41 links; a pass that linked every occurrence would
 * carpet the tutorial in dotted underlines and make the affordance invisible
 * through repetition. The unit here is the **scene**, because a scene is what a
 * reader lands on and reads through.
 *
 * The pass is **deterministic** — no model. Editing an en-US line marks its 29
 * translations stale, and re-translating would pay to reproduce prose that did
 * not change, so each locale's own lines are linked using that locale's own
 * glossary words and `forms`. Same reasoning as `retargetExampleNames`: re-derive
 * rather than re-buy.
 *
 * It refuses rather than guesses: a term with no form matching this locale's
 * text simply goes unlinked, which is the status quo, not a regression.
 *
 * **Where it declines, and why that is the right answer.** Matching is
 * whole-word, so it finds nothing in a script that marks no word boundaries
 * (Japanese `ストリームから`, Chinese, Thai) or where a suffix attaches directly
 * to the noun (Korean `스트림부터`, Turkish `akışı`). Relaxing the boundary there
 * would be worse than the gap: zh-CN's word for stream is the single character
 * `流`, which sits inside 交流, 流行, and 物流, so a boundary-free match would
 * link it in dozens of places where it means nothing of the kind. Those locales
 * still receive the links en-US carries, since a reference is protected through
 * translation, and a locale that wants a particular inflection linked can list
 * it in that term's `forms`.
 */
import { Unwritten } from '@locale/Annotations';
import { getGlossaryForms } from '@locale/Glossary';
import scanLiteralGlossaryTerms from '@locale/glossaryScan';
import type LocaleText from '@locale/LocaleText';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import type { GlossaryWord } from 'shared-types';
import type Tutorial from '../../tutorial/Tutorial';

/**
 * Terms whose word is ordinary English far more often than it is jargon, so a
 * first-use match is almost always a false positive. Extends the `EXCLUDE` set
 * `linkGlossary.ts` already keeps for `start`, for the same reason and with the
 * same remedy: link these by hand where they are genuinely meant.
 *
 * Without them the first-use scan reports ~150 findings across the tutorial,
 * dominated by "a new value" and "at this stage"; with them it reports 8.
 */
export const ExcludedTerms = new Map<string, string>([
    ['start', 'a beginning or an edge, not the source-file term'],
    ['entered', 'its word is literally "new"'],
    ['moved', 'an everyday verb'],
    ['act', 'an everyday verb and noun'],
    ['column', 'used for ordinary columns of text'],
    ['project', 'an everyday noun, and the word for any piece of work'],
    ['stage', 'commonly "at this stage"'],
    // Homographs whose verb reading dominates this corpus. A lexical scanner
    // cannot tell "did you type something?" from "the type of a value", and in
    // the en-US tutorial every single occurrence of these was the verb:
    // 7 of 7 for `type`, and "I haven't named anything", "let you name things",
    // "come to inspire and guide us" for the rest.
    ['type', 'the verb "to type" dominates; every tutorial match was the verb'],
    ['name', 'the verb "to name" is as common as the noun'],
    ['guide', 'the verb "to guide"'],
    ['loop', 'the verb "to loop", as in a marquee that loops through messages'],
    // `key` is the @Map key here, but the tutorial's keys are keyboard keys —
    // a different idea that @Key already documents.
    ['key', 'the keyboard sense, which @Key owns, dominates'],
]);

/**
 * A `\` sitting against a `` ` ``, the signature of an example nested inside
 * markup about markup (`` \`\'code'\`\ ``). Example spans pair by alternation, so
 * the four delimiters there pair as `` \`\ `` and `` \`\ `` and leave `'code'`
 * looking like prose — linking it produced `'@code'` *inside* a code example and
 * broke it in 26 locales. All 15 strings in en-US that match are documentation
 * of the markup syntax itself, so skipping them costs no vocabulary at all.
 */
const NestedExample = /\\`|`\\/;

/** A `@Concept` or `@term` reference, matching `glossaryScan`'s own rule. */
const ReferencePattern = /@([\p{L}][\p{L}\p{N}]*)(?:[./][\p{L}\p{N}]+)?/gu;

/**
 * This locale's glossary as the scanner wants it, minus the excluded words.
 * Each locale supplies its own word and `forms`, which is what lets one pass
 * serve 30 languages without translating anything.
 */
export function getGlossaryWords(locale: LocaleText): GlossaryWord[] {
    const words: GlossaryWord[] = [];
    for (const [id, entry] of Object.entries(locale.glossary)) {
        if (ExcludedTerms.has(id)) continue;
        const word = withoutAnnotations(entry.word).trim();
        if (word.length === 0) continue;
        words.push({ id, word, forms: getGlossaryForms(locale, id) });
    }
    return words;
}

/** The glossary ids a piece of markup already links, by id or by any of its
 *  forms — so a scene that wrote `@streams` counts as having introduced
 *  `stream`. */
export function getLinkedTermIds(
    text: string,
    words: GlossaryWord[],
): Set<string> {
    const byForm = new Map<string, string>();
    for (const { id, word, forms } of words) {
        byForm.set(id.toLowerCase(), id);
        for (const form of [word, ...(forms ?? [])])
            byForm.set(form.toLowerCase(), id);
    }
    const linked = new Set<string>();
    for (const match of text.matchAll(ReferencePattern)) {
        const id = byForm.get(match[1].toLowerCase());
        if (id !== undefined) linked.add(id);
    }
    return linked;
}

/**
 * Link the first bare occurrence of each term not already introduced, and record
 * what it introduced in `introduced` so the rest of the unit leaves the word
 * alone. Returns `undefined` when nothing changed.
 *
 * An unwritten string is skipped: it holds en-US English awaiting translation,
 * and the translation will replace it wholesale.
 */
export function linkFirstUse(
    text: string,
    words: GlossaryWord[],
    introduced: Set<string>,
): string | undefined {
    if (text.startsWith(Unwritten)) return undefined;
    if (NestedExample.test(text)) return undefined;

    let revised = text;
    for (const word of words) {
        if (introduced.has(word.id)) continue;
        // Re-scan the revised text each time: an earlier link shifts offsets,
        // and `suggestion` is the whole string with one occurrence replaced.
        const [finding] = scanLiteralGlossaryTerms(revised, [word]);
        if (finding === undefined) continue;
        revised = finding.suggestion;
        introduced.add(word.id);
    }
    return revised === text ? undefined : revised;
}

/** One place a link was added, for reporting. */
export type GlossaryLinkChange = {
    /** Where it is, in reading order — e.g. `Scene change / Tick, tick, tick…`. */
    where: string;
    /** The glossary ids introduced there. */
    ids: string[];
};

/**
 * Link first use across a tutorial, one scene at a time. Terms a scene already
 * links are left alone, and every scene starts fresh: a reader who lands in the
 * middle of the tutorial still meets the vocabulary it uses.
 */
export function linkGlossaryInTutorial(
    tutorial: Tutorial,
    locale: LocaleText,
): { tutorial: Tutorial; changes: GlossaryLinkChange[] } {
    const words = getGlossaryWords(locale);
    const changes: GlossaryLinkChange[] = [];
    // Structured clone so a report-only run can compare against the original.
    const revised: Tutorial = JSON.parse(JSON.stringify(tutorial));

    for (const act of revised.acts) {
        for (const scene of act.scenes) {
            // Everything this scene already links counts as introduced, wherever
            // in the scene it sits — the reader will have met it.
            const introduced = new Set<string>();
            for (const line of scene.lines) {
                if (!Array.isArray(line)) continue;
                for (const paragraph of line.slice(2))
                    if (typeof paragraph === 'string')
                        for (const id of getLinkedTermIds(paragraph, words))
                            introduced.add(id);
            }

            const added: string[] = [];
            for (const line of scene.lines) {
                if (!Array.isArray(line)) continue;
                for (let index = 2; index < line.length; index++) {
                    const paragraph = line[index];
                    if (typeof paragraph !== 'string') continue;
                    const before = new Set(introduced);
                    const linked = linkFirstUse(paragraph, words, introduced);
                    if (linked === undefined) continue;
                    line[index] = linked;
                    for (const id of introduced)
                        if (!before.has(id)) added.push(id);
                }
            }
            if (added.length > 0)
                changes.push({
                    // Titles carry their own write-status markers; a report
                    // reads better without them.
                    where: `${withoutAnnotations(act.title)} / ${withoutAnnotations(scene.title)}`,
                    ids: added,
                });
        }
    }

    return { tutorial: revised, changes };
}

/**
 * Link first use across a locale's concept documentation, one `doc` at a time.
 *
 * A doc is the unit because a doc is what a reader reads through — and it is
 * also what the editor's annotations panel quotes when the caret is on a node,
 * so a term introduced here becomes a tappable definition in the inspector,
 * which is where issue #960's reporter asked for the jargon to be explained.
 *
 * Only `doc` fields: UI labels, conflict explanations, names, and glossary
 * definitions are left alone, the same boundary `linkGlossary.ts` drew.
 */
export function linkGlossaryInLocale(locale: LocaleText): {
    locale: LocaleText;
    changes: GlossaryLinkChange[];
} {
    const words = getGlossaryWords(locale);
    const changes: GlossaryLinkChange[] = [];
    const revised: LocaleText = JSON.parse(JSON.stringify(locale));

    for (const path of getKeyTemplatePairs(revised)) {
        if (path.key !== 'doc') continue;
        const value = path.resolve(
            revised as unknown as Record<string, unknown>,
        );
        if (value === undefined) continue;

        const parts = Array.isArray(value) ? [...value] : [value];
        // Everything the doc already links counts as introduced, wherever it is.
        const introduced = new Set<string>();
        for (const part of parts)
            for (const id of getLinkedTermIds(part, words)) introduced.add(id);

        const added: string[] = [];
        let touched = false;
        for (let index = 0; index < parts.length; index++) {
            const before = new Set(introduced);
            const linked = linkFirstUse(parts[index], words, introduced);
            if (linked === undefined) continue;
            parts[index] = linked;
            touched = true;
            for (const id of introduced) if (!before.has(id)) added.push(id);
        }

        if (touched) {
            path.repair(
                revised as unknown as Record<string, unknown>,
                Array.isArray(value) ? parts : parts[0],
            );
            changes.push({ where: path.toString(), ids: added });
        }
    }

    return { locale: revised, changes };
}
