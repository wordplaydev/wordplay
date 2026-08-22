import { Unwritten } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { isNameTextPath } from '@util/verify-locales/classifyLocalePath';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import type Log from '@util/verify-locales/Log';

/**
 * Drop the names a translator garbled rather than translated.
 *
 * `checkNames` only asks whether a name is a *single token*, and a degenerate one has no
 * spaces, so `⬟कालिकसंपालिक⬟⬟⬟⬟⬟⬟⬟⬟⬟⬟⬟⬟⬟⬟⬟⬟�` passed as a valid identifier. The doc
 * examples that used it were self-consistently wrong — they invoked the garbled name, which
 * resolved to the garbled definition — so the example analyzer saw a valid program too.
 * Forty-six of these sat in kn-IN and te-IN, along with ~110 doc and how-to strings that had
 * baked them into localized example code.
 *
 * All of them were one failure mode: asked to translate a symbolic name like `⬟`, the model
 * looped on the symbol, drifted into the wrong script, and was cut off mid-token. So the
 * three signatures below are what a *translation* of a symbol looks like when it goes wrong,
 * not a judgment about what names may contain:
 *
 *  - U+FFFD, which only appears when a token was truncated or couldn't be decoded;
 *  - a symbol repeated back to back (`⬟⬟`, `💬💬`), restricted to Unicode symbol categories
 *    so real words with doubled letters are untouched — `멍멍` (woof), `汪汪` (woof), and
 *    `五音音階` (pentatonic) are all legitimate names;
 *  - an en-US *symbolic* name carried along with extra text (`⚛️कालिक`). Only all-symbol
 *    en-US names are used as probes, since an alphabetic one is a substring of its own honest
 *    translations — `tan` of `tangente`, `cos` of `cosseno`, `Volume` of `Volumen`.
 *
 * Repair follows `checkRedundantNames`: a garbled name is a ruined copy of the en-US symbol,
 * which the basis appends as a fallback anyway, so removing it costs the locale nothing —
 * but only while the locale keeps a name of its own. With nothing else to be known by, it's
 * marked `$?` instead, so the gap stays visible rather than the concept going nameless.
 */

/** Unicode symbol categories. A letter that repeats is a word; a symbol that repeats is a loop. */
const SymbolCategories = /\p{S}/u;

/** An en-US name worth using as a probe: entirely symbols and marks, no letters or digits. */
function isSymbolic(name: string): boolean {
    return name.length > 0 && !/[\p{L}\p{N}]/u.test(name);
}

function repeatsASymbol(name: string): string | undefined {
    const characters = [...name];
    for (let i = 0; i < characters.length - 1; i++)
        if (
            characters[i] === characters[i + 1] &&
            SymbolCategories.test(characters[i])
        )
            return characters[i];
    return undefined;
}

/** Why this name looks garbled, or undefined if it looks fine. */
export function degeneracy(
    name: string,
    sourceNames: string[],
): string | undefined {
    if (name.includes('�'))
        return 'it was cut off mid-token (it contains U+FFFD)';
    const repeated = repeatsASymbol(name);
    if (repeated !== undefined) return `it repeats the symbol "${repeated}"`;
    for (const source of sourceNames)
        if (isSymbolic(source) && name.includes(source) && name !== source)
            return `it is the en-US name "${source}" with extra text attached`;
    return undefined;
}

export default function checkDegenerateNames(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix
        ? (JSON.parse(JSON.stringify(target)) as LocaleText)
        : target;

    let garbled = 0;
    for (const pair of getKeyTemplatePairs(revised)) {
        const segments = [...pair.path, pair.key];
        if (!isNameTextPath(segments)) continue;
        const values = Array.isArray(pair.value) ? pair.value : [pair.value];

        const sourceValue = pair.resolve(source);
        const sourceNames = (
            Array.isArray(sourceValue)
                ? sourceValue
                : sourceValue === undefined
                  ? []
                  : [sourceValue]
        ).map(withoutAnnotations);

        const bad = new Map<number, string>();
        values.forEach((value, index) => {
            const clean = withoutAnnotations(value);
            if (clean.length === 0) return;
            // Verbatim en-US values are trusted, exactly as in checkNames.
            if (sourceNames.includes(clean)) return;
            const why = degeneracy(clean, sourceNames);
            if (why !== undefined) bad.set(index, why);
        });
        if (bad.size === 0) continue;

        for (const [index, why] of bad)
            log.bad(
                `"${withoutAnnotations(values[index])}" at ${pair.toString()} doesn't look translated: ${why}. It was probably garbled while being translated from the en-US name.`,
            );
        garbled += bad.size;

        if (!fix) continue;

        // A name of the locale's own to fall back on, judged as in checkRedundantNames:
        // written, and not one of the garbled ones.
        const keep = values.filter(
            (value, index) =>
                !bad.has(index) &&
                withoutAnnotations(value).length > 0 &&
                !value.startsWith(Unwritten),
        );
        if (keep.length > 0) {
            pair.repair(revised, Array.isArray(pair.value) ? keep : keep[0]);
            continue;
        }
        // Nothing else to be known by: keep the garbled text but mark it unwritten, so it is
        // filtered out of Names at runtime and still shows up as needing a translator.
        const marked = values.map((value, index) =>
            bad.has(index) && !value.startsWith(Unwritten)
                ? `${Unwritten}${withoutAnnotations(value)}`
                : value,
        );
        pair.repair(revised, Array.isArray(pair.value) ? marked : marked[0]);
        log.bad(
            `Marking the garbled name(s) at ${pair.toString()} unwritten; this locale has no other name there, so it needs a person.`,
        );
    }

    if (garbled > 0)
        log[fix ? 'good' : 'warning'](
            fix
                ? `Removed ${garbled} garbled name(s).`
                : `${garbled} name(s) here look garbled rather than translated. Run "npm run locales-fix" to remove them.`,
        );

    return revised;
}
