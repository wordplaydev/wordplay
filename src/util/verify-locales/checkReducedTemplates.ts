import { Revised } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import { isRevised, isUnwritten } from '@locale/LocaleText';
import { classifyPair } from '@util/verify-locales/classifyLocalePath';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import type Log from '@util/verify-locales/Log';
import { leadingAnnotations } from '@util/verify-locales/protect';
import {
    getDeclaredInputs,
    withoutMentions,
} from '@util/verify-locales/templateInputs';

/**
 * Find translations that kept only their `$input` and dropped every word around it.
 *
 * Nothing else can see this. The string isn't unwritten, isn't byte-identical to English, and
 * still carries its input, so the schema, `checkUntranslated`, and `checkTemplateInputs` all
 * pass it. What is left is a template that says nothing: ja-JP renders both "collapse $name"
 * and "expand $name" as `$name`, and as-IN renders a thirty-word instruction as `$expected !`.
 *
 * The worst version is silent rather than merely wrong. Two announcements that must differ end
 * up identical, and the Announcer drops a consecutive duplicate — so the second keystroke
 * produces no speech at all, which reads as a broken app. That is the failure the "every
 * recurring announcement must vary its text" rule exists to prevent, arriving through the
 * locale data instead of through the code.
 *
 * Two things keep the check quiet enough to be a gate. It is scoped by the **schema**, to the
 * fields `getDeclaredInputs` says are Template-typed, so an array, a `$term` reference, and an
 * untyped string are all out of range. And en-US must carry a **content** word around its
 * inputs: measured over the corpus, the bare rule finds 44 and this one finds 34, and every
 * case the looser rule added was a language legitimately dropping a function word — "They
 * $description." becoming "$description." in five pro-drop languages, "$first and $second"
 * becoming "$first、$second", "is $type" becoming "$type". The word list is English and only
 * ever applied to the en-US source, which is exactly right: the question it answers is whether
 * *English* carries meaning here beyond the input.
 *
 * A string already queued (`$?`/`$!`) is skipped, the rule `findDialogDelimiterProblems`
 * follows — it is known broken and scheduled, and reporting it again says nothing new. That is
 * also what lets the finding be fatal rather than another standing backlog: `fix` marks each
 * one `$!`, so `npm run locales-fix` queues them and the next `npm run locales-translate`
 * redoes them.
 */

/**
 * English closed-class words: articles, prepositions, conjunctions, pronouns, copulas, and
 * auxiliaries. A template whose only words are these says nothing a translation must keep,
 * because the languages that drop them are dropping grammar rather than meaning.
 */
const FunctionWords = new Set(
    `a an the and or but of to in on at by for with from into out up down about as so
     is are are was were be been it its they them their there this that these those
     not no s do does did has have had`.split(/\s+/),
);

/** Whether en-US says anything here beyond its inputs and the grammar around them. */
function hasContentWord(english: string): boolean {
    return (
        withoutMentions(english)
            .toLowerCase()
            .match(/[a-z]+/g) ?? []
    ).some((word) => !FunctionWords.has(word));
}

/** Whether a translation is nothing but its inputs and the punctuation between them. It must
 *  still hold an input: one that lost the input too is `checkTemplateInputs`' business, and
 *  reporting it twice describes one defect as two. */
function onlyInputs(translation: string): boolean {
    return (
        withoutMentions(translation) !== translation &&
        !/[\p{L}\p{N}]/u.test(withoutMentions(translation))
    );
}

export default function checkReducedTemplates(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix
        ? (JSON.parse(JSON.stringify(target)) as LocaleText)
        : target;

    const declared = getDeclaredInputs();
    const reduced: string[] = [];

    // `getKeyTemplatePairs` rather than `getCheckableLocalePairs`, which lives in `verifyLocale`
    // and would make this an import cycle. Everything the latter excludes is either not a string
    // or not Template-typed, so the schema gate below already covers it.
    for (const pair of getKeyTemplatePairs(revised)) {
        const path = pair.toString();
        // Template-typed by the schema, which is the whole scope of this check.
        if (!declared.has(path)) continue;
        // A name is a different kind of thing; checkRedundantNames owns those.
        if (classifyPair(pair) === 'name') continue;

        const value = pair.value;
        if (typeof value !== 'string') continue;
        // Already queued: known broken, and a run is coming for it.
        if (isUnwritten(value) || isRevised(value)) continue;

        const english = pair.resolve(source);
        if (typeof english !== 'string') continue;

        const translation = withoutMarker(value);
        if (!hasContentWord(withoutMarker(english))) continue;
        if (!onlyInputs(translation)) continue;

        reduced.push(
            `${path}: "${withoutMarker(english)}" became "${translation}"`,
        );
        if (fix) pair.repair(revised, Revised + translation);
    }

    if (reduced.length > 0) {
        const report = log[fix ? 'good' : 'bad'](
            fix
                ? `Queued ${reduced.length} translation(s) that had been reduced to only their template input.`
                : `${reduced.length} translation(s) keep only their template input, dropping every word around it — two of these that must differ end up identical, and an announcement repeated verbatim is never spoken twice. Run "npm run locales-fix" to queue them, then "npm run locales-translate" to redo them.`,
        );
        for (const problem of reduced.slice(0, 20)) report.warning(problem);
        if (reduced.length > 20)
            report.warning(`…and ${reduced.length - 20} more`);
    }

    return revised;
}

/** The value without its leading write-status, which the caller re-decides. */
function withoutMarker(value: string): string {
    return value.slice(leadingAnnotations(value).length);
}
