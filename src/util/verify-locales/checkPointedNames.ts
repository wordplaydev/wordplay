import type LocaleText from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { isNameTextPath } from '@util/verify-locales/classifyLocalePath';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import type Log from '@util/verify-locales/Log';

/**
 * Hebrew names shouldn't carry vowel points.
 *
 * Niqqud and cantillation are a reading aid; Hebrew is written without them, and nobody types
 * them into code. So a name like `בּוּעָה` is an identifier a creator cannot enter — they would
 * write `בועה`, which binds nothing. he-IL had 400 of them, and because the marks were applied
 * unevenly the same word appeared both ways in one locale (`Color` pointed, `Bubble.color`
 * not), which is a divergence of its own (#1324). `checkOperatorKeywords` had already run into
 * the same thing from the other side.
 *
 * Stripping is orthography, not word choice, so unlike the rest of #1324 a machine can do it:
 * the word is unchanged, only its pointing. The one thing that could go wrong is two pointed
 * words collapsing to the same unpointed one, so any name whose strip would collide with a
 * sibling's is left alone and reported — nothing else checks for two members of one definition
 * sharing a name.
 */

/** Hebrew points and cantillation marks (U+0591–U+05C7). Deliberately only Hebrew: these are
 *  the marks the issue is about, and the strip is measured collision-free for them. Arabic
 *  carries harakat on 17 ar-SA names, which wants its own look. */
const HebrewMarks = /[֑-ׇ]/gu;

/** The scope a name has to be unique within: the definition holding it. `output.Phrase.bubble.names`
 *  and `output.Phrase.place.names` are siblings; so are two functions of one basis type, and two
 *  inputs of one function. */
function scopeOf(path: (string | number)[]): string {
    return path.slice(0, -1).join('.');
}

export default function checkPointedNames(
    log: Log,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix
        ? (JSON.parse(JSON.stringify(target)) as LocaleText)
        : target;

    // What each name would become, grouped by the scope it must stay unique in.
    const scopes = new Map<string, Map<string, Set<string>>>();
    const pairs = getKeyTemplatePairs(revised).filter((pair) =>
        isNameTextPath([...pair.path, pair.key]),
    );
    for (const pair of pairs) {
        const scope = scopeOf(pair.path);
        const byName = scopes.get(scope) ?? new Map<string, Set<string>>();
        scopes.set(scope, byName);
        for (const name of Array.isArray(pair.value)
            ? pair.value
            : [pair.value]) {
            if (typeof name !== 'string') continue;
            const stripped = withoutAnnotations(name).replace(HebrewMarks, '');
            if (stripped.length === 0) continue;
            const paths = byName.get(stripped) ?? new Set<string>();
            paths.add(pair.toString());
            byName.set(stripped, paths);
        }
    }

    let stripped = 0;
    const collisions: string[] = [];
    for (const pair of pairs) {
        const value = Array.isArray(pair.value) ? pair.value : [pair.value];
        let changed = false;
        const next = value.map((name) => {
            if (typeof name !== 'string') return name;
            // Never `HebrewMarks.test`: a global regex carries `lastIndex` between calls, so
            // every other pointed name would test false.
            const plain = name.replace(HebrewMarks, '');
            if (plain === name) return name;
            // Would the unpointed form be a second name for something else here?
            const sharing = scopes
                .get(scopeOf(pair.path))
                ?.get(withoutAnnotations(plain));
            if (sharing !== undefined && sharing.size > 1) {
                collisions.push(
                    `${pair.toString()}: "${withoutAnnotations(name)}" unpointed collides with a sibling`,
                );
                return name;
            }
            changed = true;
            stripped++;
            return plain;
        });
        if (fix && changed)
            pair.repair(revised, Array.isArray(pair.value) ? next : next[0]);
    }

    if (stripped > 0)
        log[fix ? 'good' : 'warning'](
            fix
                ? `Removed vowel points from ${stripped} Hebrew name(s), which nobody types into code.`
                : `${stripped} Hebrew name(s) carry vowel points, so they can't be typed as written. Run "npm run locales-fix" to remove them.`,
        );
    for (const collision of collisions) log.warning(collision);

    return revised;
}
