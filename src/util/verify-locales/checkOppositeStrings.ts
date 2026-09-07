import { Revised } from '@locale/Annotations';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { isRevised, isUnwritten } from '@locale/LocaleText';
import { classifyPair } from '@util/verify-locales/classifyLocalePath';
import LocalePath, {
    getKeyTemplatePairs,
} from '@util/verify-locales/LocalePath';
import type Log from '@util/verify-locales/Log';
import { leadingAnnotations } from '@util/verify-locales/protect';

/**
 * Find two strings whose keys name opposites and whose translation says the same thing twice.
 *
 * `checkReducedTemplates` catches a translation that lost its words; this catches one that
 * lost a *distinction*, which is the same defect seen from the side that matters to a reader.
 * With ja-JP selected, adding and removing a path point both announce "点$number", and a
 * gallery being listed and being refused both announce "$name。" — and because the Announcer
 * drops a consecutive duplicate, the second one is silent rather than wrong.
 *
 * The pairs are **derived from the keys**, not listed: en-US names these things in opposing
 * pairs on purpose (`formatOn`/`formatOff`, `point.added`/`point.removed`, `fold.collapsed`/
 * `fold.expanded`), so the convention below finds 64 of them across the file and needs no
 * maintenance when one is added. Restricting to `On`/`Off`, which is what the two strings that
 * prompted this happened to use, would have found five pairs and no defects at all.
 *
 * The general form of the rule — *any* two siblings whose en-US differs must differ in a
 * translation — is measurably unshippable: 418 findings corpus-wide, nearly all of them
 * legitimate synonym collapses (`token.Link` and `token.URL` are both "رابط" in Arabic,
 * `input.Objects.categories` has "hair dryer" and "hair drier"). Opposite keys are the subset
 * where an identical translation cannot be right, and it reports five, all genuine.
 *
 * Repair queues **both** members with `$!`. Which one lost the distinction isn't knowable from
 * here, and `keepOrPlacehold` already protects a re-translation that fails from throwing away
 * what it had. A re-translation can reproduce the collision, since the model sees each string
 * alone — the check then fails the build again, which is this gate doing its job.
 */

/**
 * Key words that name opposites, most-positive first. Matched four ways, which is how en-US
 * actually spells them: as the whole key (`fold.collapse`/`fold.expand`, `toggle.on`/
 * `toggle.off`), and as a camelCase or all-lowercase suffix (`formatOn`/`formatOff`,
 * `toggleon`/`toggleoff`). Adding a convention costs nothing; it only ever finds more pairs.
 */
const Antonyms: readonly (readonly [string, string])[] = [
    ['On', 'Off'],
    ['Added', 'Removed'],
    ['Enabled', 'Disabled'],
    ['Shown', 'Hidden'],
    ['Show', 'Hide'],
    ['Opened', 'Closed'],
    ['Open', 'Close'],
    ['In', 'Out'],
    ['Yes', 'No'],
    ['True', 'False'],
    ['Start', 'End'],
    ['Up', 'Down'],
    ['Collapsed', 'Expanded'],
    ['Collapse', 'Expand'],
    ['Selected', 'Deselected'],
    ['Approved', 'Denied'],
    ['Enter', 'Exit'],
    ['More', 'Less'],
    ['Increase', 'Decrease'],
    ['Next', 'Previous'],
    ['Forward', 'Backward'],
    ['Before', 'After'],
];

/** Two en-US strings whose keys declare them opposites. */
export type OppositeStrings = {
    first: LocalePath;
    second: LocalePath;
    /** For messages: `On/Off`. */
    convention: string;
};

let derived: OppositeStrings[] | undefined;

/**
 * Every opposing pair en-US declares. Computed once: the keys are the same in every locale, so
 * the answer doesn't vary by the locale being checked — the same reason `checkTypedInputNames`
 * reads its pairs off the en-US basis.
 */
export function getOppositeStrings(): OppositeStrings[] {
    if (derived) return derived;

    // Keyed by parent path, so a sibling is a lookup rather than a scan. `getKeyTemplatePairs`
    // rather than `getCheckableLocalePairs`, which lives in `verifyLocale` and would make this
    // an import cycle; the exclusions below are the ones that matter here.
    const siblings = new Map<string, Map<string, LocalePath>>();
    for (const pair of getKeyTemplatePairs(DefaultLocale)) {
        if (typeof pair.value !== 'string') continue;
        // A name is a different regime with its own checks, and a locale rightly repeats an
        // en-US symbol or emoji there.
        if (classifyPair(pair) === 'name') continue;
        const parent = pair.path.join('.');
        const group = siblings.get(parent) ?? new Map<string, LocalePath>();
        group.set(String(pair.key), pair);
        siblings.set(parent, group);
    }

    derived = [];
    for (const group of siblings.values()) {
        for (const [key, pair] of group) {
            for (const [positive, negative] of Antonyms) {
                const opposite = oppositeKey(key, positive, negative);
                if (opposite === undefined) continue;
                const other = group.get(opposite);
                if (other === undefined) continue;
                // Nothing to say when en-US itself says the same thing twice.
                if (
                    withoutMarker(String(pair.value)) ===
                    withoutMarker(String(other.value))
                )
                    continue;
                derived.push({
                    first: pair,
                    second: other,
                    convention: `${positive}/${negative}`,
                });
            }
        }
    }
    return derived;
}

/** The key of `key`'s opposite, if `key` spells the positive side of this convention. Only the
 *  positive side matches, so each unordered pair is found exactly once. */
function oppositeKey(
    key: string,
    positive: string,
    negative: string,
): string | undefined {
    for (const [from, to] of [
        [positive, negative],
        [positive.toLowerCase(), negative.toLowerCase()],
    ]) {
        if (key === from) return to;
        if (key.length > from.length && key.endsWith(from))
            return key.slice(0, -from.length) + to;
    }
    return undefined;
}

export default function checkOppositeStrings(
    log: Log,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix
        ? (JSON.parse(JSON.stringify(target)) as LocaleText)
        : target;

    const collisions: string[] = [];
    for (const { first, second, convention } of getOppositeStrings()) {
        const label = `${first.toString()} / ${String(second.key)}`;
        const one = first.resolve(revised);
        const other = second.resolve(revised);
        if (typeof one !== 'string' || typeof other !== 'string') continue;
        // Either one already queued: known broken, and a run is coming for it.
        if ([one, other].some((v) => isUnwritten(v) || isRevised(v))) continue;

        const said = withoutMarker(one);
        if (said.trim().length === 0) continue;
        if (said !== withoutMarker(other)) continue;

        collisions.push(
            `${label} (${convention}) both say "${said}", but en-US distinguishes them`,
        );
        if (fix) {
            first.repair(revised, Revised + said);
            second.repair(revised, Revised + withoutMarker(other));
        }
    }

    if (collisions.length > 0) {
        const report = log[fix ? 'good' : 'bad'](
            fix
                ? `Queued ${collisions.length * 2} string(s) in ${collisions.length} opposing pair(s) that had been translated identically.`
                : `${collisions.length} pair(s) of opposites are translated identically, so there is no way to tell one from the other — and an announcement repeated verbatim is never spoken twice. Run "npm run locales-fix" to queue them, then "npm run locales-translate" to redo them.`,
        );
        for (const problem of collisions.slice(0, 20)) report.warning(problem);
        if (collisions.length > 20)
            report.warning(`…and ${collisions.length - 20} more`);
    }

    return revised;
}

/** The value without its leading write-status, which the caller re-decides. */
function withoutMarker(value: string): string {
    return value.slice(leadingAnnotations(value).length);
}
