/**
 * One concept, one word — and the word has to be one a reader could meet.
 *
 * A `@term` reference only tells a reader what a word means where that word is
 * actually written, so a glossary word the locale's own prose never uses is a
 * definition nobody can reach. de-DE's term said *Datenstrom* while its lessons
 * said *Strom*; five locales were like that for `stream` alone.
 *
 * The problem splits in two, and so does this module.
 *
 * `repairGlossaryWords` fixes the shapes a machine can see. These are not word
 * choice at all — they are orthography and formatting, and a word in any of them
 * can never match prose *or* be written as a reference:
 *
 *   - a parenthetical gloss (`கோவை (expression)`), 22 of them in ta-IN-LK-SG,
 *   - Hebrew vowel points (`שְׁאֵלָה`), the same reading aid `checkPointedNames`
 *     strips from names, which glossary words never got because `word` is
 *     `[plain]` rather than `NameText`,
 *   - a concept link left inside the word (hi-IN's `पेहला @Source`).
 *
 * `checkGlossaryWordUsage` reports what is left: a word the locale's prose
 * genuinely disagrees with. It never repairs, for `checkTypedInputNames`'
 * reason — sometimes the glossary is the mistranslation and sometimes the prose
 * is, and only a speaker of the language can say which.
 */
import type { GlossaryText } from '@locale/GlossaryTexts';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import type LocaleText from '@locale/LocaleText';
import { ExcludedTerms } from '@util/verify-locales/glossaryLinks';
import type Log from '@util/verify-locales/Log';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import { leadingAnnotations } from '@util/verify-locales/protect';
import type Tutorial from '../../tutorial/Tutorial';

/** Whether a word the prose disagrees with should fail the run. False while the
 *  21 that need a native speaker are outstanding — the treatment
 *  `TypedInputNamesAreFatal` gives its own backlog. */
export const GlossaryWordsAreFatal = false;

/** How many times en-US's own text must use a term's word before a locale is
 *  held to using its own. Below this the signal is noise: en-US mentions
 *  "tutorial" once, and 24 locales phrase that one sentence differently, which
 *  is not an inconsistency. */
const MinimumEnglishUses = 5;

/** A parenthetical gloss, in either width of bracket. */
const Parenthetical = /\s*[（(][^）)]*[）)]\s*/gu;
/** Hebrew points and cantillation (U+0591–U+05C7), the range `checkPointedNames`
 *  strips from names for the same reason. */
const HebrewMarks = /[֑-ׇ]/gu;
/** A `@reference` left inside a word. */
const Reference = /\s*@[\p{L}][\p{L}\p{N}]*(?:[./][\p{L}][\p{L}\p{N}]*)?/gu;

/** The word a malformed one should have been, or the same string if it was
 *  already well formed. Annotation-free — callers put the marker back. */
export function wellFormed(word: string): string {
    return withoutAnnotations(word)
        .replace(Parenthetical, ' ')
        .replace(HebrewMarks, '')
        .replace(Reference, '')
        .trim();
}

/** Every word and form a locale's glossary declares, annotation-free and folded,
 *  so a repair can be checked against what it would collide with. */
function wordsOf(locale: LocaleText): Map<string, Set<string>> {
    const byWord = new Map<string, Set<string>>();
    for (const [id, entry] of Object.entries(locale.glossary))
        for (const text of [entry.word, ...(entry.forms ?? [])]) {
            const folded = wellFormed(text).toLowerCase();
            if (folded.length === 0) continue;
            const ids = byWord.get(folded) ?? new Set<string>();
            ids.add(id);
            byWord.set(folded, ids);
        }
    return byWord;
}

/**
 * Strip the malformations above from every glossary word and form.
 *
 * A strip that would make two terms share a word is refused and reported —
 * `getGlossaryFormIndex` maps a folded form to one id, so a collision makes a
 * reference silently ambiguous, and nothing else would notice. The guard has
 * never fired on the shipped locales; it exists so a future word can't.
 */
export default function repairGlossaryWords(
    log: Log,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix
        ? (JSON.parse(JSON.stringify(target)) as LocaleText)
        : target;
    const claimed = wordsOf(target);

    let repaired = 0;
    const collisions: string[] = [];

    for (const [id, entry] of Object.entries(revised.glossary)) {
        /** Repair one value, keeping whatever write-status it carried — 37 of
         *  the 38 malformed words are machine translated, so dropping the
         *  marker would quietly claim they had been reviewed. */
        const settle = (text: string, where: string): string => {
            const plain = wellFormed(text);
            if (plain === withoutAnnotations(text)) return text;
            if (plain.length === 0) {
                collisions.push(`${where}: repairing "${text}" leaves nothing`);
                return text;
            }
            const sharing = claimed.get(plain.toLowerCase());
            if (
                sharing !== undefined &&
                (sharing.size > 1 || !sharing.has(id))
            ) {
                collisions.push(
                    `${where}: "${withoutAnnotations(text)}" would become "${plain}", which another term already claims`,
                );
                return text;
            }
            repaired++;
            return `${leadingAnnotations(text)}${plain}`;
        };

        const word = settle(entry.word, `glossary.${id}.word`);
        if (fix) entry.word = word;
        if (entry.forms !== undefined) {
            const forms = entry.forms.map((form, index) =>
                settle(form, `glossary.${id}.forms.${index}`),
            );
            if (fix) entry.forms = forms;
        }
    }

    if (repaired > 0)
        log[fix ? 'good' : 'warning'](
            fix
                ? `Repaired ${repaired} glossary word(s) that carried a gloss, vowel points, or a reference.`
                : `${repaired} glossary word(s) carry a parenthetical gloss, vowel points, or a reference, so they can never match this locale's prose. Run "npm run locales-fix" to repair them.`,
        );
    for (const collision of collisions) log.warning(collision);

    return revised;
}

/** Whole-word count of a term's word and forms in some text. Only ever applied
 *  to en-US, whose script marks word boundaries. */
function englishUses(entry: GlossaryText, text: string) {
    let uses = 0;
    for (const candidate of [entry.word, ...(entry.forms ?? [])]) {
        const word = wellFormed(candidate);
        if (word.length === 0) continue;
        uses += (
            text.match(
                new RegExp(
                    `(?<![\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`,
                    'giu',
                ),
            ) ?? []
        ).length;
    }
    return uses;
}

/**
 * Report a term whose word this locale's own prose never uses.
 *
 * Three things keep it low-noise. Matching is **substring**, not whole-word:
 * the question is only whether the word appears at all, so this degrades
 * correctly in the unspaced scripts and agglutinative languages where
 * `glossaryLinks` deliberately declines, and absorbs inflection without needing
 * `forms`. `ExcludedTerms` is shared with that pass, because a homograph is as
 * untrustworthy here as there. And a word the locale merely repeats from en-US
 * is skipped, since `Wordplay`, German `Code`, and French `expression`
 * legitimately are the English.
 */
export function checkGlossaryWordUsage(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    /** Every translatable string this locale writes, prose and interface alike.
     *  More text means fewer false claims that a word goes unused. */
    localeText: string,
    /** The same, for en-US, to decide which terms are in play. */
    sourceText: string,
): void {
    const unused: string[] = [];
    const haystack = localeText.toLowerCase();
    // Entries rather than an index, so a runtime string id needs no unsafe cast
    // into `GlossaryTexts`, whose keys are the `GlossaryId` union.
    const english = new Map<string, GlossaryText>(
        Object.entries(source.glossary),
    );

    for (const [id, entry] of Object.entries(target.glossary)) {
        if (ExcludedTerms.has(id)) continue;
        const source_ = english.get(id);
        if (source_ === undefined) continue;
        if (englishUses(source_, sourceText) < MinimumEnglishUses) continue;

        const word = wellFormed(entry.word);
        if (word.length === 0) continue;
        // A word this locale only repeats from en-US isn't its own word, the
        // rule `checkRedundantNames` applies to names.
        if (word.toLowerCase() === wellFormed(source_.word).toLowerCase())
            continue;

        const written = [word, ...(entry.forms ?? []).map(wellFormed)].some(
            (candidate) =>
                candidate.length > 0 &&
                haystack.includes(candidate.toLowerCase()),
        );
        if (!written)
            unused.push(
                `${id}: the glossary says "${word}", but nothing this locale writes uses it`,
            );
    }

    if (unused.length > 0) {
        const report = log[GlossaryWordsAreFatal ? 'bad' : 'warning'](
            `${unused.length} glossary word(s) appear nowhere in this locale's own text, so a @reference to them can never explain them. One concept should be one word; pick the better word for each — a translator, not a script, since sometimes the glossary is the mistranslation and sometimes the prose is.`,
        );
        for (const problem of unused) report.warning(problem);
    }
}

/**
 * Every string a locale writes — interface labels as much as documentation —
 * plus its tutorials' dialogue. Searching all of it rather than the prose alone
 * is what keeps the check conservative: the more places a word could turn up,
 * the surer we are when it turns up nowhere.
 *
 * The glossary block itself is excluded, or every word would trivially find
 * itself in its own entry.
 */
export function collectLocaleText(
    locale: LocaleText,
    tutorials: Tutorial[],
): string {
    const parts: string[] = [];
    for (const pair of getKeyTemplatePairs(locale)) {
        if (pair.path[0] === 'glossary') continue;
        for (const value of Array.isArray(pair.value)
            ? pair.value
            : [pair.value])
            if (typeof value === 'string') parts.push(value);
    }
    for (const tutorial of tutorials)
        for (const act of tutorial.acts)
            for (const scene of act.scenes)
                for (const line of scene.lines) {
                    if (!Array.isArray(line)) continue;
                    for (const paragraph of line.slice(2))
                        if (typeof paragraph === 'string')
                            parts.push(paragraph);
                }
    return parts.join('\n');
}
