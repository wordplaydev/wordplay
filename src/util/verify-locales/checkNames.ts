import { Unwritten } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { Sym } from '@nodes/Sym';
import { tokenize } from '@parser/Tokenizer';
import { isNameTextPath } from '@util/verify-locales/classifyLocalePath';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import type Log from '@util/verify-locales/Log';
import { leadingAnnotations } from '@util/verify-locales/protect';
import toValidName from '@util/verify-locales/toValidName';

/** A valid Wordplay identifier: a single name or operator token (plus End). */
function isValidName(text: string): boolean {
    const tokens = tokenize(text).getTokens();
    return (
        tokens.length <= 2 &&
        (tokens[0].isName() || tokens[0].isSymbol(Sym.Operator))
    );
}

/**
 * Check that every NameText-typed value — identifiers fed to `Name.make` via
 * `getNameLocales` (`names`, `basis.*.name`, basis type variables, Easing
 * names) — is a single valid name or operator token. Values copied verbatim
 * from en-US are trusted (the symbolic names like `⊤⊥` are deliberately
 * multi-token). With `fix`, repairs a copy: fold separators via `toValidName`;
 * if still invalid, fall back to the en-US element at the same index; failing
 * that, mark it `$?` (unwritten names are filtered out of `Names` at runtime,
 * so a broken identifier never ships).
 */
export default function checkNames(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix
        ? (JSON.parse(JSON.stringify(target)) as LocaleText)
        : target;
    for (const pair of getKeyTemplatePairs(revised)) {
        const segments = [...pair.path, pair.key];
        if (!isNameTextPath(segments)) continue;
        const values = Array.isArray(pair.value) ? pair.value : [pair.value];
        const sourceValue = pair.resolve(source);
        const sourceValues = (
            sourceValue === undefined
                ? []
                : Array.isArray(sourceValue)
                  ? sourceValue
                  : [sourceValue]
        ).map(withoutAnnotations);
        let changed = false;
        const repaired = values.map((value, index) => {
            if (value.trim().length === 0) {
                log.bad(2, `Name is empty at ${pair.toString()}`);
                return value;
            }
            const clean = withoutAnnotations(value);
            // A bare placeholder carries no name to validate.
            if (clean.length === 0) return value;
            // Verbatim en-US values (symbolic names, operators) are trusted.
            if (sourceValues.includes(clean)) return value;
            if (isValidName(clean)) return value;
            log.bad(
                2,
                `"${clean}" at ${pair.toString()} is not a single valid name or operator token.`,
            );
            const annotations = leadingAnnotations(value);
            const folded = toValidName(clean);
            let repair;
            if (isValidName(folded)) repair = `${annotations}${folded}`;
            else if (sourceValues[index] !== undefined) {
                // Falling back to en-US discards a translation, so say so rather than
                // letting the name quietly revert to English in the diff.
                repair = `${annotations}${sourceValues[index]}`;
                log.bad(
                    2,
                    `Replacing untranslatable name "${clean}" at ${pair.toString()} with the en-US name "${sourceValues[index]}". This drops a translation — give it a name that is a single valid token instead.`,
                );
            } else {
                repair = `${Unwritten}${clean}`;
                log.bad(
                    2,
                    `Marking "${clean}" at ${pair.toString()} unwritten; it has no en-US fallback, so this name will be missing at runtime.`,
                );
            }
            changed = true;
            return repair;
        });
        if (fix && changed)
            pair.repair(
                revised,
                Array.isArray(pair.value) ? repaired : repaired[0],
            );
    }
    return revised;
}
