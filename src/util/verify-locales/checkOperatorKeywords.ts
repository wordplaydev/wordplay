import { MachineTranslated, Unwritten } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import type Log from '@util/verify-locales/Log';

/** The operator keywords, each of which must also name its Boolean basis function. */
const OperatorKeywordIds = ['and', 'or', 'not'] as const;

/**
 * An operator keyword word (`keyword.and/or/not`) should also be a name of the Boolean
 * basis function it stands for, so a typed word resolves directly rather than through
 * the runtime's canonical-symbol fallback, and so the function's documentation lists
 * the word a creator can actually type. Several locales drifted (fr `non` vs `pas`,
 * id `dan` vs `Dan`, he with vs without niqqud) because nothing tied the two fields.
 *
 * A word matches a name when their annotation-stripped, NFC-normalized forms are equal
 * — the same comparison the runtime makes, since tokens normalize their text. Unwritten
 * (`$?`) names don't count: they're filtered out of `Names` at runtime. The en-US names
 * count too, since every project's basis appends the en-US fallback — so an untranslated
 * keyword needs no alias, and the alias this check adds can't be the en-US duplicate
 * that checkRedundantNames removes. The repair adds the word as an alias (never
 * replacing anything), carrying the keyword's `$~` marker when it has one so unreviewed
 * machine translations stay flagged for review.
 */
export default function checkOperatorKeywords(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix
        ? (JSON.parse(JSON.stringify(target)) as LocaleText)
        : target;

    const unresolvable: string[] = [];
    for (const op of OperatorKeywordIds) {
        const raw = revised.keyword[op];
        if (typeof raw !== 'string') continue;
        // The tokenizer activates any non-empty word, annotations stripped, so the
        // check must hold the same words to the same standard.
        const word = withoutAnnotations(raw);
        if (word.length === 0) continue;

        const fun = revised.basis.Boolean.function[op];
        const names = Array.isArray(fun.names) ? fun.names : [fun.names];
        const sourceFun = source.basis.Boolean.function[op];
        const sourceNames = Array.isArray(sourceFun.names)
            ? sourceFun.names
            : [sourceFun.names];
        const resolves = [...names, ...sourceNames].some(
            (name) =>
                !name.startsWith(Unwritten) &&
                withoutAnnotations(name).normalize() === word.normalize(),
        );
        if (resolves) continue;

        unresolvable.push(`${op} ("${word}")`);
        if (fix) {
            const addition = raw.includes(MachineTranslated)
                ? `${MachineTranslated}${word}`
                : word;
            fun.names = [...names, addition];
        }
    }

    if (unresolvable.length > 0)
        log[fix ? 'good' : 'warning'](
            fix
                ? `Added the operator keyword word(s) ${unresolvable.join(', ')} as names of their Boolean functions.`
                : `The operator keyword word(s) ${unresolvable.join(', ')} are not names of their Boolean functions, so the words don't resolve directly. Run "npm run locales-fix" to add them as aliases.`,
        );

    return revised;
}
