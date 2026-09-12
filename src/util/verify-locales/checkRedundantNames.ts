import { Unwritten } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import classifyLocalePath, {
    isGlossaryFormsPath,
    isNameTextPath,
} from '@util/verify-locales/classifyLocalePath';
import { docStatus } from '@util/verify-locales/checkStringArrays';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import type Log from '@util/verify-locales/Log';
import { leadingAnnotations } from '@util/verify-locales/protect';

/**
 * Drop the names a locale only repeats from en-US.
 *
 * Every project's basis is built with en-US appended as the fallback
 * (`Locales.getLocales()`), so an en-US name binds whatever the project declares. A locale
 * that lists the same string is therefore saying nothing: `output.Phrase.names` was
 * `["💬","Frase"]` in all 30 locales, and the `💬` in the other 29 bound nothing the en-US
 * one didn't. Worse, it read as translatable — most of these carried a `$~` marker asking a
 * reviewer to check a machine "translation" of `&`, `≠`, or `ø`.
 *
 * A name is redundant when en-US declares the same string at the same path. It is only
 * removed while the locale keeps a name of its own — one it doesn't share with en-US and
 * hasn't left unwritten. So `["💬","Frase"]` becomes `["Frase"]`, but an untranslated
 * `["🎨","Color"]` keeps `Color`: with nothing of the locale's own to fall back on, deleting
 * it would erase the evidence that it still needs translating, and `["≠"]` stays whole
 * rather than emptying.
 *
 * The second pass answers the same question about a locale's own list: a name declared
 * twice in one array binds nothing the first one didn't, and reads as two aliases to
 * anyone maintaining it. 69 arrays across 25 locales carried one, almost all from
 * translation returning the same word for a definition and its imperative alias.
 *
 * Name arrays are exempt from the source-length padding that positional arrays get (see
 * verifyLocale's array repair), so a shortened one stays shortened.
 */
export default function checkRedundantNames(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix
        ? (JSON.parse(JSON.stringify(target)) as LocaleText)
        : target;

    let redundant = 0;
    for (const pair of getKeyTemplatePairs(revised)) {
        const segments = [...pair.path, pair.key];
        if (!isNameTextPath(segments)) continue;
        // Only lists of aliases: a lone name has nothing to fall back on in this file.
        if (!Array.isArray(pair.value)) continue;
        const values = pair.value as string[];

        const sourceValue = pair.resolve(source);
        const sourceNames = new Set(
            (Array.isArray(sourceValue)
                ? sourceValue
                : sourceValue === undefined
                  ? []
                  : [sourceValue]
            ).map(withoutAnnotations),
        );
        if (sourceNames.size === 0) continue;

        // A name of the locale's own: not shared with en-US, and actually written. An
        // unwritten one is filtered out of `Names` at runtime, so it can't be what remains.
        const own = values.filter((value) => {
            const clean = withoutAnnotations(value);
            return (
                clean.length > 0 &&
                !sourceNames.has(clean) &&
                !value.startsWith(Unwritten)
            );
        });
        if (own.length === 0) continue;

        if (own.length === values.length) continue;
        redundant += values.length - own.length;
        if (fix) pair.repair(revised, own);
    }

    if (redundant > 0)
        log[fix ? 'good' : 'warning'](
            fix
                ? `Removed ${redundant} name(s) this locale only repeated from en-US.`
                : `${redundant} name(s) here only repeat en-US, which every project already has. Run "npm run locales-fix" to remove them.`,
        );

    const repeated = removeRepeatedNames(revised, fix);
    if (repeated > 0)
        log[fix ? 'good' : 'warning'](
            fix
                ? `Removed ${repeated} name(s) this locale declared twice in one list.`
                : `${repeated} name(s) here are declared twice in the same list, which binds nothing extra. Run "npm run locales-fix" to remove them.`,
        );

    return revised;
}

/**
 * Drop a name a list declares more than once, keeping the first position.
 *
 * Whole entries only: every occurrence found was an exact repeat, and a name that shares
 * an entry with others behind commas is `checkBasisNames`' business rather than something
 * to rewrite inside a string. Glossary forms are left to `checkGlossaryForms`, which
 * already owns collisions among them.
 */
function removeRepeatedNames(target: LocaleText, fix: boolean): number {
    let repeated = 0;
    for (const pair of getKeyTemplatePairs(target)) {
        const segments = [...pair.path, pair.key];
        if (
            classifyLocalePath(segments) !== 'name' ||
            isGlossaryFormsPath(segments) ||
            !Array.isArray(pair.value)
        )
            continue;

        const values = pair.value as string[];
        const kept: string[] = [];
        const at = new Map<string, number>();
        for (const value of values) {
            const name = withoutAnnotations(value).normalize('NFC').trim();
            const first = name.length === 0 ? undefined : at.get(name);
            if (first === undefined) {
                if (name.length > 0) at.set(name, kept.length);
                kept.push(value);
                continue;
            }
            // The survivor keeps the more urgent of the two statuses, since a string has
            // exactly one and dropping a `$?` would claim work nobody has done.
            const status = docStatus([
                leadingAnnotations(kept[first]),
                leadingAnnotations(value),
            ]);
            kept[first] = status + withoutAnnotations(kept[first]);
            repeated++;
        }
        if (fix && kept.length !== values.length) pair.repair(target, kept);
    }
    return repeated;
}
