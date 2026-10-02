import { Revised } from '#locale/Annotations.ts';
import type LocaleText from '#locale/LocaleText.ts';
import { classifyPair } from '#util/verify-locales/classifyLocalePath.ts';
import { getKeyTemplatePairs } from '#util/verify-locales/LocalePath.ts';
import type Log from '#util/verify-locales/Log.ts';
import {
    leadingAnnotations,
    restoreLinkTargets,
} from '#util/verify-locales/protect.ts';

/**
 * Find the web links a translation broke, and put back what can be put back.
 *
 * `protectLinks` keeps a translator from touching a link's target and
 * `mismatchedWebLinks` refuses one that comes back changed, but both act only on
 * a string being translated; a string already on disk was never asked. 246
 * shipped broken: seven landing and about strings in every locale had lost the
 * `@:` of their link and rendered `<localize//localize>` as text, and fourteen
 * had translated a route name (`://rights` → `://droits`) into a 404.
 * `restoreLinkTargets` repairs both from en-US.
 *
 * What it cannot place — a link dropped outright, or one en-US doesn't have —
 * is marked `$!` under `fix`, so the next translation run redoes the string with
 * its links protected. A string already queued is left for that run.
 */
export default function checkLinkTargets(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix ? structuredClone(target) : target;
    const repaired: string[] = [];
    const unresolved: string[] = [];

    for (const pair of getKeyTemplatePairs(revised)) {
        const english = pair.resolve(source);
        if (english === undefined) continue;
        const value = pair.value;
        const englishList = [english].flat();
        // A markup array is one document, its status on the first element. Any
        // other array is a positional tuple whose every element is its own
        // string — and a label holding a link at all is how tr-TR's music
        // options turned out to be shifted one slot, the last holding a blurb.
        const units: Array<{ en: string; text: string[]; index?: number }> =
            Array.isArray(value) && classifyPair(pair) !== 'markup'
                ? value.map((element, index) => ({
                      en: englishList[index] ?? '',
                      text: [element],
                      index,
                  }))
                : [{ en: englishList.join('\n\n'), text: [value].flat() }];

        let next = [value].flat();
        let touched = false;
        for (const unit of units) {
            // Most strings hold no link at all.
            if (
                !unit.en.includes('<') &&
                !unit.text.some((t) => t.includes('<'))
            )
                continue;
            // Queued: the translation run that clears the marker will redo it.
            if (/^\$[?!]/.test(unit.text[0] ?? '')) continue;

            const repair = restoreLinkTargets(unit.en, unit.text);
            if (repair.repaired === 0 && !repair.unresolved) continue;
            const path =
                pair.toString() +
                (unit.index === undefined ? '' : `[${unit.index}]`);
            if (repair.repaired > 0) repaired.push(path);
            if (repair.unresolved) unresolved.push(path);
            const written = repair.unresolved
                ? requeue(repair.text)
                : repair.text;
            if (unit.index === undefined) next = written;
            else next[unit.index] = written[0] ?? '';
            touched = true;
        }
        if (fix && touched)
            pair.repair(
                revised,
                typeof value === 'string' ? (next[0] ?? '') : next,
            );
    }

    if (repaired.length > 0) {
        const message = `${repaired.length} string(s) had broken web links that en-US can repair: ${bound(repaired)}`;
        if (fix) log.say(`Repaired: ${message}`);
        else log.bad(`${message}. locales-fix repairs them.`);
    }
    if (unresolved.length > 0)
        log.bad(
            `${unresolved.length} string(s) dropped or invented a web link, which only a translation can put right${fix ? `; marked "${Revised}" so the next run redoes them` : ''}: ${bound(unresolved)}`,
        );

    return revised;
}

/** Mark the value revised, replacing whatever status it carried: a string has
 *  exactly one. The status goes on the first element only. */
function requeue(text: string[]): string[] {
    return text.map((element, index) =>
        index === 0
            ? Revised + element.slice(leadingAnnotations(element).length)
            : element,
    );
}

/** Bounded, like checkUntranslated's: a broken locale would list hundreds. */
function bound(paths: string[]): string {
    const listed = paths.slice(0, 20);
    const rest = paths.length - listed.length;
    return `${listed.join(', ')}${rest > 0 ? `, and ${rest} more` : ''}`;
}
