import { MachineTranslated } from '@locale/Annotations';
import { getLanguageScripts } from '@locale/LanguageCode';
import {
    isMachineTranslated,
    isRevised,
    isUnwritten,
} from '@locale/LocaleText';
import type LocaleText from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { escapeRegExp } from '@util/verify-locales/markupText';
import { isDefined } from '@util/nullable';
import { splitMarkupAndCode } from '@util/verify-locales/protect';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import type Log from '@util/verify-locales/Log';
import {
    getItalicLabels,
    getItalicSpans,
} from '@util/verify-locales/italicSpans';

/**
 * Whether an italic name left in English fails the build. Not yet: the backlog
 * this was written to find is hundreds of strings across most locales, and a
 * check that is red until a paid run clears it would be ignored. The same
 * reasoning as `GlossaryWordsAreFatal`.
 */
export const ItalicSpansAreFatal = false;

/**
 * Find italic names a translation left in English.
 *
 * en-US italicizes the name of a control or an input ("the /shortcuts/ list"),
 * and a translation that keeps the English word names a button the reader's
 * interface doesn't have. A span is reported when it is byte-identical to one of
 * the English string's own italic spans and either the locale already calls that
 * thing something else (`getItalicLabels`), or the locale isn't written in Latin
 * script and the span is an English word in a tour, where every italic is the
 * name of something on screen.
 *
 * With `fix`, a machine translation whose every such name has a word on record
 * gets that word in place of the English, deterministically and for free, the
 * way `retargetExampleNames` re-derives rather than re-buys; the rest of the
 * string is untouched, where a re-translation would reword all of it. One with a
 * name nothing records is only reported: re-translating was tried and kept the
 * English, so this check never starts paid work on its own. A human-written
 * string is only reported too, since a person may have meant it.
 */
export default function checkItalicSpans(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix ? structuredClone(target) : target;
    const labels = getItalicLabels(source, target);
    const latin = getLanguageScripts(target.language).includes('Latn');
    // A name that is the English word of a glossary term whose word here is
    // queued to be chosen again waits for that word: what this locale called it
    // before is the very word being replaced (the how-to guide, recorded as the
    // question word "how").
    const pending = new Set(
        Object.entries(target.glossary)
            .filter(
                ([, entry]) => isUnwritten(entry.word) || isRevised(entry.word),
            )
            .flatMap(([id]) =>
                Object.entries(source.glossary)
                    .filter(([key]) => key === id)
                    .map(([, entry]) =>
                        withoutAnnotations(entry.word).toLowerCase(),
                    ),
            ),
    );

    /** Machine translations fixed by swapping in the locale's own word. */
    const swapped: string[] = [];
    /** Machine translations with a name nothing records a word for. */
    const unrecorded: string[] = [];
    const human: string[] = [];
    for (const pair of getKeyTemplatePairs(revised)) {
        if (pair.top()) continue;
        const value = pair.value;
        const first = Array.isArray(value) ? value[0] : value;
        // Queued strings are already going to be translated.
        if (first === undefined || isUnwritten(first) || isRevised(first))
            continue;
        const english = pair.resolve(source);
        if (english === undefined) continue;
        const englishSpans = new Set(
            getItalicSpans(
                withoutAnnotations(
                    Array.isArray(english) ? english.join('\n\n') : english,
                ),
            ),
        );
        if (englishSpans.size === 0) continue;
        const text = withoutAnnotations(
            Array.isArray(value) ? value.join('\n\n') : value,
        );
        const left = getItalicSpans(text).filter((span) => {
            if (!englishSpans.has(span)) return false;
            const known = labels.get(span.toLowerCase());
            if (known !== undefined) return known !== span;
            return (
                !latin &&
                pair.toString().includes('.tour.') &&
                /^[A-Za-z][A-Za-z ]{2,}$/.test(span)
            );
        });
        if (left.length === 0) continue;

        const finding = `${pair.toString()} (${left.map((span) => `/${span}/`).join(', ')})`;
        if (!isMachineTranslated(first)) {
            human.push(finding);
            continue;
        }
        const swaps = left
            .map((span): [string, string] | undefined => {
                const known = labels.get(span.toLowerCase());
                return known === undefined ||
                    known === span ||
                    pending.has(span.toLowerCase())
                    ? undefined
                    : [span, known];
            })
            .filter(isDefined);
        if (swaps.length === left.length) {
            swapped.push(finding);
            if (fix) {
                const swap = (element: string) =>
                    swaps.reduce(
                        (text, [span, known]) => swapItalic(text, span, known),
                        element,
                    );
                pair.repair(
                    revised,
                    Array.isArray(value) ? value.map(swap) : swap(value),
                );
            }
            continue;
        }
        // Nothing records a word for this name. A re-translation is the only
        // remedy, and one was tried: Assamese, Nepali, and Telugu kept these
        // English as loanwords and reworded the rest, so re-queueing from here
        // would buy the same answer on every run. Report it for a person.
        unrecorded.push(finding);
    }

    const report = (message: string) =>
        ItalicSpansAreFatal ? log.bad(message) : log.warning(message);
    if (swapped.length > 0)
        report(
            `${swapped.length} machine translation(s) left an italic name in English that this locale has its own word for${fix ? '; put that word in its place' : '; run locales-fix to put it in its place'}: ${bound(swapped)}`,
        );
    if (unrecorded.length > 0)
        report(
            `${unrecorded.length} machine translation(s) keep an italic name in English that this locale has no word for anywhere; a person who reads the language should choose one: ${bound(unrecorded)}`,
        );
    if (human.length > 0)
        report(
            `${human.length} string(s) not marked "${MachineTranslated}" keep an italic name in English; a person should check them: ${bound(human)}`,
        );
    return revised;
}

/** Replace the italic `/span/` with `/local/` in the prose of `text`, never
 *  inside an example, keeping everything else byte for byte. */
export function swapItalic(text: string, span: string, local: string): string {
    const italic = new RegExp(`/\\s*${escapeRegExp(span)}\\s*/`, 'gu');
    return splitMarkupAndCode(text)
        .map((segment) =>
            segment.kind === 'code'
                ? segment.text
                : segment.text.replace(italic, () => `/${local}/`),
        )
        .join('');
}

/** Bounded: a locale with a large backlog would print hundreds of paths. */
function bound(findings: string[]): string {
    const listed = findings.slice(0, 20);
    const rest = findings.length - listed.length;
    return `${listed.join(', ')}${rest > 0 ? `, and ${rest} more` : ''}`;
}
