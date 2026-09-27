import type LocaleText from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { scopeOf } from '@util/verify-locales/checkPointedNames';
import { isNameTextPath } from '@util/verify-locales/classifyLocalePath';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import type Log from '@util/verify-locales/Log';

/**
 * Find two members of one definition that a locale gives the same name.
 *
 * Every name is translated on its own, so nothing stops a translator from choosing one word for
 * two things English keeps apart: ko-KR calls both `Result.start` and `Result.starts` 시작, and
 * zh-CN once called both a shape's `y` and its `z` 是. Each is a valid name in isolation, so the
 * schema, `checkNames`, and every per-string check pass it, and the program silently binds the
 * word to whichever member is found first. The other one can then only be reached by its English
 * name.
 *
 * Scope is `checkPointedNames`' rule: an identity field (`name`, `names`) competes with its
 * siblings one level up, every other name field with the other members of the definition it sits
 * on. Compared annotation-stripped and NFC-normalized, and deliberately *not* case-folded, since
 * Wordplay names are case-sensitive and en-US itself pairs `bubble` with `Bubble`.
 *
 * Choosing the other word is word choice, which no check here repairs, so there is no `fix`. A
 * collision already in the corpus when this check arrived is listed in `SiblingNameExemptions`
 * for a person who reads the language; anything new is an error, and so is an exemption that no
 * longer matches, so the list only shrinks.
 */

/** Two or more paths in one scope sharing a name. */
export type SiblingCollision = { scope: string; name: string; paths: string[] };

export function findSiblingNameCollisions(
    locale: LocaleText,
): SiblingCollision[] {
    const scopes = new Map<string, Map<string, Set<string>>>();
    for (const pair of getKeyTemplatePairs(locale)) {
        if (!isNameTextPath([...pair.path, pair.key])) continue;
        const scope = scopeOf(pair.path, pair.key);
        const byName = scopes.get(scope) ?? new Map<string, Set<string>>();
        scopes.set(scope, byName);
        for (const value of Array.isArray(pair.value)
            ? pair.value
            : [pair.value]) {
            if (typeof value !== 'string') continue;
            const name = withoutAnnotations(value).normalize('NFC');
            if (name.length === 0) continue;
            const paths = byName.get(name) ?? new Set<string>();
            paths.add(pair.toString());
            byName.set(name, paths);
        }
    }

    const collisions: SiblingCollision[] = [];
    for (const [scope, byName] of scopes)
        for (const [name, paths] of byName)
            if (paths.size > 1)
                collisions.push({ scope, name, paths: [...paths].sort() });
    return collisions;
}

/** The key an exemption is written with. */
export function exemptionKey(collision: SiblingCollision): string {
    return `${collision.scope} ${collision.name}`;
}

/**
 * Collisions that predate this check, by locale, each needing a speaker to choose a second word.
 * Remove an entry when its locale is fixed; the check fails on one that no longer matches.
 */
export const SiblingNameExemptions: Record<string, readonly string[]> = {
    // সূচী is this locale's word for both a list (the type, and its glossary word) and an
    // index, so every function taking an item, its index, and its list names two inputs alike.
    'as-IN': [
        'basis.List.function.translate.translator সূচী',
        'basis.List.function.filter.checker সূচী',
        'basis.List.function.all.checker সূচী',
        'basis.List.function.until.checker সূচী',
        'basis.List.function.find.checker সূচী',
        'basis.List.function.combine.combiner সূচী',
        'output.Group বিষয়',
    ],
    'de-DE': ['output.Result Ende'],
    'gu-IN': ['output.Result અંત'],
    'ko-KR': ['output.Result 시작', 'output.Result 끝'],
    'ta-IN-LK-SG': ['input.Rebound பொருள்'],
    'tr-TR': ['output.Result son'],
    'vi-VN': ['output.Result bắtđầu', 'output.Result kếtthúc'],
};

export default function checkSiblingNames(
    log: Log,
    code: string,
    locale: LocaleText,
    exemptions: Record<string, readonly string[]> = SiblingNameExemptions,
) {
    const exempt = new Set(exemptions[code] ?? []);
    const found = findSiblingNameCollisions(locale);
    const foundKeys = new Set(found.map(exemptionKey));

    const fresh = found.filter((c) => !exempt.has(exemptionKey(c)));
    if (fresh.length > 0) {
        const report = log.bad(
            `${fresh.length} name(s) are shared by two members of one definition, so the word reaches only one of them. Choose a different word for one; this is word choice, so nothing repairs it automatically.`,
        );
        for (const collision of fresh)
            report.warning(
                `"${collision.name}" names ${collision.paths.join(' and ')}`,
            );
    }

    const stale = [...exempt].filter((key) => !foundKeys.has(key));
    if (stale.length > 0) {
        const report = log.bad(
            `${stale.length} sibling name exemption(s) no longer match a collision. Remove them from SiblingNameExemptions in checkSiblingNames.ts.`,
        );
        for (const key of stale) report.warning(key);
    }
}
