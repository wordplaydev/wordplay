import type LocaleText from '@locale/LocaleText';
import type Log from '@util/verify-locales/Log';
import { docStatus } from '@util/verify-locales/checkStringArrays';
import { leadingAnnotations } from '@util/verify-locales/protect';
import { getCheckableLocalePairs } from '@util/verify-locales/verifyLocale';

/**
 * Check that a plain string carries at most one write-status annotation.
 *
 * Stacked markers are not cosmetic — they make a string invisible to the
 * tooling. `isRevised` tests `startsWith('$!')`, so `"$~$!…"` reads as merely
 * machine translated: `shouldStringBeMachineTranslated` skips it outside
 * `override`, and the `$!` asking for re-translation is never honored. Around a
 * hundred strings sat in that state, silently never re-translated.
 *
 * Markup arrays are already normalized by `checkStringArrays`; this covers the
 * scalar strings it doesn't look at. With `fix`, collapses to the same
 * highest-priority status ($? > $! > $~) that `docStatus` picks for arrays.
 */
export default function checkAnnotations(
    log: Log,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix
        ? (JSON.parse(JSON.stringify(target)) as LocaleText)
        : target;
    for (const pair of getCheckableLocalePairs(revised)) {
        const value = pair.value;
        if (typeof value !== 'string') continue;
        const annotation = leadingAnnotations(value);
        if (annotation.length <= 2) continue;
        const status = docStatus([annotation]);
        log.bad(
            `${pair.toString()} carries stacked annotations ("${annotation}"); a string has one write-status, so this reads as "${annotation.slice(
                0,
                2,
            )}" and its "${status}" is never honored.`,
        );
        if (fix) pair.repair(revised, status + value.slice(annotation.length));
    }
    return revised;
}
