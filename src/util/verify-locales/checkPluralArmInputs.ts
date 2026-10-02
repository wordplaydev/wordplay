import { Revised } from '#locale/Annotations.ts';
import type LocaleText from '#locale/LocaleText.ts';
import { isRevised, isUnwritten } from '#locale/LocaleText.ts';
import {
    getPluralBranchBodies,
    getTemplateReferences,
} from '#locale/templateInputs.ts';
import { withoutAnnotations } from '#locale/withoutAnnotations.ts';
import { getKeyTemplatePairs } from '#util/verify-locales/LocalePath.ts';
import type Log from '#util/verify-locales/Log.ts';
import { leadingAnnotations } from '#util/verify-locales/protect.ts';
import { getDeclaredInputs } from '#util/verify-locales/templateInputs.ts';

/**
 * Find plural branches whose number went missing from the translation.
 *
 * `$#rows[one row|$rows rows]` picks an arm by `rows`, and its last arm — the general form every
 * language has — says `$rows`. pl-PL's table summary picked by `rows` and then said `$columns` in
 * every arm after the first, so a two-by-five table was described as five rows; es-MX's thanks
 * page dropped the number of contributors altogether. Every other check passed both: the arm
 * count was right, every input was declared, and none was unknown.
 *
 * So when en-US's general form says its count, the translation must say it somewhere other than
 * the declaration. Deliberately not "in the same arm": a branch may pick only the noun's form
 * with the number written before it ("$limit ৰ … $#limit[আখৰ|আখৰ]"), and any arm may carry other
 * inputs along, since agreement pulls them inside ("una fila de $columns columnas"). A rule over
 * arms reported both as defects. `$count` and `$#count` name the same input.
 *
 * Queued strings (`$?`/`$!`) are skipped, and `fix` marks each finding `$!` so the next
 * `npm run locales-translate` redoes it, keeping the existing text until it does.
 */

/** A `$#name[` declaration, which chooses a form rather than saying the number. */
const Declaration = /(?<!\$)\$#[a-zA-Z0-9]+\[/g;

export default function checkPluralArmInputs(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix ? structuredClone(target) : target;
    const declared = getDeclaredInputs();
    const problems: string[] = [];

    for (const pair of getKeyTemplatePairs(revised)) {
        const path = pair.toString();
        const inputs = declared.get(path);
        if (inputs === undefined) continue;
        const value = pair.value;
        if (typeof value !== 'string') continue;
        if (isUnwritten(value) || isRevised(value)) continue;
        const english = pair.resolve(source);
        if (typeof english !== 'string') continue;

        const names = new Set(inputs);
        const says = (arms: string[], name: string) =>
            getTemplateReferences(arms.at(-1) ?? '', names).named.has(name);
        const counted = new Set(
            getPluralBranchBodies(withoutAnnotations(english))
                .filter((branch) => says(branch.texts, branch.name))
                .map((branch) => branch.name),
        );

        const said = getTemplateReferences(
            withoutAnnotations(value).replace(Declaration, '['),
            names,
        ).named;
        const lost = getPluralBranchBodies(withoutAnnotations(value))
            .filter(
                (branch) => counted.has(branch.name) && !said.has(branch.name),
            )
            .map((branch) => `$#${branch.name}`);
        if (lost.length === 0) continue;

        problems.push(`${path}: ${lost.join(', ')} — "${value}"`);
        if (fix)
            pair.repair(
                revised,
                Revised + value.slice(leadingAnnotations(value).length),
            );
    }

    if (problems.length > 0) {
        const report = log[fix ? 'good' : 'bad'](
            fix
                ? `Queued ${problems.length} translation(s) whose plural branch lost the number that chose it.`
                : `${problems.length} translation(s) choose a plural form by a number and then never say it, so they report the wrong number or none. Run "npm run locales-fix" to queue them, then "npm run locales-translate" to redo them.`,
        );
        for (const problem of problems) report.warning(problem);
    }

    return revised;
}
