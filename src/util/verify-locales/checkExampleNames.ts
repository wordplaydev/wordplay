import type LocaleText from '@locale/LocaleText';
import type LocalePath from '@util/verify-locales/LocalePath';
import type Log from '@util/verify-locales/Log';
import { getCheckableLocalePairs } from '@util/verify-locales/verifyLocale';
import { retargetExamplesInDocument } from '@util/verify-locales/retargetExampleNames';

/**
 * Bring every localized `\code\` example's named inputs back in line with the names the
 * locale declares.
 *
 * A stored example spells names that live at *other* locale paths, so re-translating a name
 * silently strands every example that used it — the `UnknownInput` in #1323, and the reason
 * a doc example still reads `Choice(selectable: …)` in a locale that calls it `wählbar`.
 * Nothing re-derived them, so this does, deterministically: no model and no API key, which
 * is what lets `npm run locales-fix` repair the divergence rather than queue a paid
 * re-translation of the surrounding prose.
 *
 * An example whose shape no longer matches en-US is reported and left alone. That is
 * ordinary drift (the English example changed), which `npm run locales-drift --mark` already
 * queues; guessing at it here would pair unrelated nodes.
 */
export function retargetExamplePaths<T extends Record<string, unknown>>(
    log: Log,
    source: Record<string, unknown>,
    target: T,
    pairs: LocalePath[],
    /** The locale the examples are analyzed and named in — the locale file itself, even when
     *  `target` is a tutorial or how-to that merely lives beside it. */
    locale: LocaleText,
    fix: boolean,
): T {
    const revised = fix ? (JSON.parse(JSON.stringify(target)) as T) : target;

    let renamed = 0;
    let divergent = 0;
    let refused = 0;
    for (const pair of pairs) {
        const sourceValue = pair.resolve(source);
        if (sourceValue === undefined) continue;
        const sourceItems =
            typeof sourceValue === 'string' ? [sourceValue] : sourceValue;
        const targetItems =
            typeof pair.value === 'string' ? [pair.value] : pair.value;
        // A document with no example delimiter can't hold one, and parsing every locale
        // string to find that out is most of a verify run.
        if (!targetItems.some((item) => item.includes('\\'))) continue;

        // Paired across the whole document rather than per element: a `[formatted]` array's
        // items are paragraphs, and a locale may legitimately split or merge one.
        const result = retargetExamplesInDocument(
            sourceItems,
            targetItems,
            locale,
        );
        renamed += result.renamed;
        divergent += result.divergent;
        refused += result.refused;
        const repaired = result.texts;

        if (fix && repaired.some((item, index) => item !== targetItems[index]))
            pair.repair(
                revised,
                typeof pair.value === 'string' ? repaired[0] : repaired,
            );
    }

    if (renamed > 0)
        log[fix ? 'good' : 'warning'](
            fix
                ? `Renamed ${renamed} input(s) in localized examples to the name this locale declares.`
                : `${renamed} input(s) in localized examples don't use the name this locale declares. Run "npm run locales-fix" to retarget them.`,
        );
    if (refused > 0)
        log.warning(
            `Left ${refused} example(s) alone: retargeting them would have introduced a conflict.`,
        );
    if (divergent > 0)
        log.warning(
            `${divergent} example(s) no longer have the same shape as their en-US source, so their names can't be retargeted. Re-translate the strings holding them.`,
        );

    return revised;
}

/** Retarget the examples in a locale file itself. */
export default function checkExampleNames(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    return retargetExamplePaths(
        log,
        source,
        target,
        getCheckableLocalePairs(target),
        target,
        fix,
    );
}
