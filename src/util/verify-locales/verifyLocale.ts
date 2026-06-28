import { MachineTranslated, Revised, Unwritten } from '@locale/Annotations';
import { concretizeOrUndefined } from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import type LocaleText from '@locale/LocaleText';
import {
    isMachineTranslated,
    isUnwritten,
    parseLocaleDoc,
    toDocString,
    toLocaleString,
} from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import ConceptLink from '@nodes/ConceptLink';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import { tokenize } from '@parser/Tokenizer';
import { toTokens } from '@parser/toTokens';
import LocalePath, {
    getKeyTemplatePairs,
} from '@util/verify-locales/LocalePath';
import { LocaleValidator } from '@util/verify-locales/LocaleSchema';
import type Log from '@util/verify-locales/Log';
import { mismatchedDelimiter } from '@util/verify-locales/protect';
import type { RevisedString } from '@util/verify-locales/start';
import {
    checkTemplateInputs,
    getDeclaredInputs,
} from '@util/verify-locales/templateInputs';
import getTranslator from '@util/verify-locales/getTranslator';
import toValidName from '@util/verify-locales/toValidName';

/** Create a copy of the default tutorial with all dialog marked unwritten */
export function createUnwrittenLocale(): LocaleText {
    // Deep copy default tutorial
    let locale = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;

    // Find the translatable pairs
    const pairs = getCheckableLocalePairs(locale);

    // Mark all strings as unwritten
    for (const pair of pairs)
        pair.repair(
            locale,
            Array.isArray(pair.value)
                ? pair.value.map((s) => Unwritten + s)
                : Unwritten + pair.value,
        );

    // Return the unwritten locale
    return locale;
}

/** Get translatable keys for locale text */
export function getCheckableLocalePairs(locale: LocaleText): LocalePath[] {
    // Find the translatable pairs
    return getKeyTemplatePairs(locale).filter((pair) => {
        // Emotion? Skip it.
        if (pair.key === 'emotion') return false;

        // Top level declaration? Skip it.
        if (
            pair.top() &&
            (pair.key === '$schema' ||
                pair.key === 'language' ||
                pair.key === 'regions')
        )
            return false;

        return true;
    });
}

/** Load, validate, and check the locale. */
export async function verifyLocale(
    log: Log,
    locale: string,
    text: LocaleText,
    /** Whether to fix structural issues */
    fix: boolean,
    /** Whether to translate unwritten strings in the locale */
    translate: boolean,
    /** Whether to override existing machine translations */
    override: boolean,
    /** Strings that have been revised in one or more locales */
    revisedStrings: RevisedString[],
    /** Global names used by other locales */
    globalNames: Map<string, { locale: string; path: LocalePath }[]>,
    /** Accumulator for paths whose translation succeeded in this run; the
     *  caller uses it to strip `$!` Revised markers from the en-US source
     *  once every sibling has been processed. Pass `undefined` for non-
     *  translation runs. */
    translatedPaths?: Set<string>,
): Promise<[LocaleText, boolean]> {
    let revisedText: LocaleText = text;
    const valid = LocaleValidator(text);
    if (!valid && LocaleValidator.errors) {
        log.bad(2, "Locale doesn't match the schema.");
        for (const error of LocaleValidator.errors) {
            if (error.message)
                log.bad(3, `${error.instancePath}: ${error.message}`);
        }

        if (fix) revisedText = repairLocale(log, DefaultLocale, revisedText);
    }

    // Don't warn if we're checking the example locale.
    revisedText = await checkLocale(
        log,
        revisedText,
        DefaultLocale,
        true,
        translate && locale !== 'en-US',
        override,
        revisedStrings,
        globalNames,
        translatedPaths,
    );

    return [revisedText, JSON.stringify(revisedText) !== JSON.stringify(text)];
}

// If the value is unwritten, or marked revised and machine translated, or we're overriding and is machine translated,
function shouldStringBeMachineTranslated(
    text: string,
    override: boolean,
): boolean {
    if (isUnwritten(text)) return true;
    if (isMachineTranslated(text) && override) return true;
    return false;
}

/** Given a locale, check it's validity, and repair what we can. */
async function checkLocale(
    log: Log,
    original: LocaleText,
    DefaultLocale: LocaleText,
    warnUnwritten: boolean,
    translate: boolean,
    /** If true, machine written translations are re-translated */
    override: boolean,
    revisedStrings: RevisedString[],
    globalNames: Map<string, { locale: string; path: LocalePath }[]>,
    /** Accumulator for paths whose translation succeeded in this run; see
     *  verifyLocale for details. */
    translatedPaths?: Set<string>,
): Promise<LocaleText> {
    // Make a copy of the original to modify.
    let revised = JSON.parse(JSON.stringify(original)) as LocaleText;

    // If we're translating, find every unwritten/revised string the user
    // wants Google Translate to fill in, then dispatch a batch request. In
    // verify-only mode we skip this entire walk + filter — it produces a
    // list nothing reads. Saves a second tree traversal of every locale.
    if (translate && warnUnwritten) {
        const pairsToTranslate = getCheckableLocalePairs(revised)
            .filter((path) => {
                const value = path.value;
                // If this path is marked revised ($!) in any locale, reset
                // every sibling at this path — even human translations. A
                // revision means the meaning changed, so the existing
                // translation is suspect; re-translating prompts a human
                // reviewer to confirm or revise. Sibling's current value is
                // irrelevant — we replace from the en-US source.
                if (revisedStrings.some((rev) => rev.path.equals(path)))
                    return true;
                return typeof value === 'string'
                    ? shouldStringBeMachineTranslated(value, override)
                    : value.some((s) =>
                          shouldStringBeMachineTranslated(s, override),
                      );
            })
            // Don't translate emotions; those have meaning.
            .filter(({ key }) => key !== 'emotion')
            // Don't translate names that are symbolic operators.
            .map((path) => {
                if (path.key !== 'names') return path;
                const names = (
                    Array.isArray(path.value) ? path.value : [path.value]
                ).map((name) => {
                    if (!isUnwritten(name)) return name;
                    const nameWithoutPlaceholder = withoutAnnotations(name);
                    if (
                        toTokens(nameWithoutPlaceholder)
                            .peek()
                            ?.isSymbol(Sym.Operator)
                    )
                        return nameWithoutPlaceholder;
                    return name;
                });
                return new LocalePath(path.path, path.key, names);
            });

        if (pairsToTranslate.length > 0) {
            log.bad(
                2,
                `Translating ${pairsToTranslate.length} unwritten strings ("${Unwritten}")...`,
            );
            revised = await translateLocale(
                log,
                DefaultLocale,
                revised,
                pairsToTranslate,
                translatedPaths,
            );
        }
    }

    // Check every pair for errors.
    const pairs = getKeyTemplatePairs(revised);

    // Check each one.
    for (const path of pairs) {
        // If the key suggests that it's documentation, try to parse it as a doc and
        // see if it has any tokens of unknown type or unparsable expressions or types.
        if (path.key === 'doc') {
            const docString = toDocString(path.value);

            // An orphaned/duplicated `\…\` or `` `…` `` delimiter (e.g. an LLM
            // doubling a backtick while localizing a nested example) breaks
            // tokenization silently — the markup parser skips over a malformed
            // example, so it surfaces only later when the embedded code is parsed
            // (e.g. building a basis type). Catch it here, where it's introduced.
            // A code (`\…\`) or formatted (`` `…` ``) delimiter the translation
            // dropped or duplicated (vs the en-US source) breaks tokenization
            // silently — the markup parser skips a malformed example, so it
            // surfaces only later when the embedded code is parsed (e.g. building
            // a basis type). Compare counts to the source so external examples
            // (legitimately odd `\`) aren't false-positives. A warning, not an
            // error: many locales carry this from older machine translations, so
            // we surface it (and any new) without failing CI on legacy debt; the
            // translator's preserveBalancedDelimiters is the hard guarantee that
            // no new mismatch ships (it falls back to the source).
            const enValue = path.resolve(DefaultLocale);
            if (enValue !== undefined) {
                const mismatched = mismatchedDelimiter(
                    toDocString(enValue),
                    docString,
                );
                if (mismatched !== undefined)
                    log.warning(
                        2,
                        `Mismatched ${mismatched} delimiter at ${path.toString()} (differs from en-US) in ${docString.substring(0, 50)}...`,
                    );
            }

            const doc = parseLocaleDoc(docString);
            const unknownTokens = doc
                .leaves()
                .filter(
                    (node) =>
                        node instanceof Token && node.isSymbol(Sym.Unknown),
                );

            if (unknownTokens.length > 0) {
                log.bad(
                    2,
                    `Found invalid tokens ${unknownTokens
                        .map((s) => `"${s.getText()}"`)
                        .join(
                            ', ',
                        )} at ${path.toString()} in ${toDocString(path.value).substring(0, 50)}... Ensure all delimiters are closed properly.`,
                );
            }

            const missingConcepts = doc
                .nodes()
                .filter(
                    (node) =>
                        node instanceof ConceptLink &&
                        !node.isValid(revised) &&
                        /^[A-Z].+/.test(node.getName()),
                );

            if (missingConcepts.length > 0)
                log.bad(
                    2,
                    `Found unknown concept name ${path.toString()}: ${missingConcepts
                        .map((u) => u.toWordplay())
                        .join(', ')}`,
                );

            // Note: a full UnparsableExpression/UnparsableType scan over the doc
            // is too noisy here — markup constructs (italic `/`, `…`, etc.) parse
            // to unparsable nodes outside a code context, drowning real code
            // breakage in false positives. The delimiter-balance check above
            // catches the build-breaking class (orphaned/duplicated delimiters).
        }
        // Is one or more names? Make sure they're valid names or operator symbols.
        else if (path.key === 'names') {
            const names = Array.isArray(path.value) ? path.value : [path.value];
            for (const name of names) {
                if (name.trim().length === 0) {
                    log.bad(2, `Name is empty:: "${name}`);
                } else {
                    const nameWithoutPlaceholder = withoutAnnotations(name);

                    // If it wasn't just a placeholder
                    if (nameWithoutPlaceholder.length > 0) {
                        const tokens = tokenize(
                            nameWithoutPlaceholder,
                        ).getTokens();

                        // We expect one name and one end token.
                        const token = tokens[0];
                        if (!(token.isName() || token.isSymbol(Sym.Operator)))
                            log.bad(
                                2,
                                `Name ${name} is not a valid name, it's a ${token
                                    .getTypes()
                                    .join(', ')}`,
                            );
                        else if (tokens.length > 2) {
                            log.bad(
                                2,
                                `Name is valid, but is followed by additional text: "${tokens.slice(
                                    1,
                                    tokens.length - 1,
                                )}": ${path.toString()}`,
                            );
                        }
                        // If the name is valid, make sure no other locales use this name for a different global
                        else if (path.isGlobalName()) {
                            const existing =
                                globalNames
                                    .get(nameWithoutPlaceholder)
                                    ?.filter(
                                        (p) =>
                                            p.locale !==
                                                toLocaleString(original) &&
                                            !p.path.equals(path),
                                    ) ?? [];
                            if (existing.length > 1)
                                log.bad(
                                    2,
                                    `Name "${nameWithoutPlaceholder}" is already used by ${existing.map((l) => `${l.locale}: ${l.path.toString()}`).join(', ')}.`,
                                );
                        }
                    }
                }
            }
        }
        // If it's not a doc, assume it's a template string and try to parse it as a template.
        // If we can't, complain.
        else if (typeof path.value === 'string') {
            // Build an inputs dict with placeholder values for every declared
            // name, so Mention resolution succeeds during this validation pass.
            const declaredNames =
                getDeclaredInputs().get(path.toString()) ?? [];
            const inputs: Record<string, string> = {};
            for (const name of declaredNames) inputs[name] = 'test';
            const description = concretizeOrUndefined(
                DefaultLocales,
                path.value,
                inputs,
            );
            if (description === undefined)
                log.bad(
                    2,
                    `String at ${path.toString()} is has unparsable template string "${
                        path.value
                    }"`,
                );

            // For Template<Names>-typed fields, the generated schema lists
            // the declared input names. Verify that the template references
            // every declared name (and nothing else of the old `$N` syntax).
            const inputCheck = checkTemplateInputs(path.toString(), path.value);
            if (inputCheck) {
                if (inputCheck.numeric.length > 0)
                    log.bad(
                        2,
                        `Template at ${path.toString()} uses old positional refs ${inputCheck.numeric.map((n) => `$${n}`).join(', ')} — use named refs: "${path.value}"`,
                    );
                if (inputCheck.unused.length > 0)
                    log.bad(
                        2,
                        `Template at ${path.toString()} does not reference declared inputs ${inputCheck.unused.map((n) => `$${n}`).join(', ')}: "${path.value}"`,
                    );
                if (inputCheck.unknown.length > 0)
                    log.bad(
                        2,
                        `Template at ${path.toString()} references unknown inputs ${inputCheck.unknown.map((n) => `$${n}`).join(', ')} (not declared, not terminology): "${path.value}"`,
                    );
            }
        }
    }

    // Give warnings on revised strings that are not machine translated.
    let potentiallyOutOfDate = new Set<string>();
    for (const revisedString of revisedStrings) {
        const match = pairs.find((path) => path.equals(revisedString.path));
        if (match) {
            const outOfDate = revisedString.path.resolve(original);
            if (
                typeof outOfDate === 'string' &&
                !isMachineTranslated(outOfDate)
            )
                potentiallyOutOfDate.add(revisedString.path.toString());
        }
    }
    if (potentiallyOutOfDate.size > 0) {
        log.warning(
            2,
            `${potentiallyOutOfDate.size} strings potentially out of date ${Array.from(
                potentiallyOutOfDate,
            ).join(', ')}`,
        );
    }

    const automated = pairs.filter(({ value }) =>
        typeof value === 'string'
            ? isMachineTranslated(value)
            : value.some((s) => isMachineTranslated(s)),
    );

    if (automated.length > 0)
        log.warning(
            2,
            `Locale: ${automated.length} machine translated ("${MachineTranslated}") strings to review.`,
        );

    // Unwritten ("$?") strings fall back to English at runtime. Fail in CI so
    // they never reach production — they should be machine translated first
    // (npm run locales-translate, which converts "$?" to "$~"). Machine
    // translated strings are only warned about above, since they don't fall back.
    const unwritten = pairs.filter(({ value }) =>
        typeof value === 'string'
            ? isUnwritten(value)
            : value.some((s) => isUnwritten(s)),
    );

    if (unwritten.length > 0)
        log.bad(
            2,
            `Locale: ${unwritten.length} unwritten ("${Unwritten}") string(s) would fall back to English. Run "npm run locales-translate" to fill them: ${unwritten
                .slice(0, 10)
                .map((p) => p.toString())
                .join(', ')}${unwritten.length > 10 ? ', …' : ''}`,
        );

    return revised;
}

/** Add missing keys and remove extra ones from a given locale, relative to a source locale. */
function repairLocale(
    log: Log,
    source: LocaleText,
    target: LocaleText,
): LocaleText {
    const revised = JSON.parse(JSON.stringify(target)) as LocaleText;

    // Walk through the source and find any keys that are not defined on the target and remove them.
    removeExtraKeys(log, source, revised);

    // Walk through the target and find any keys that are not defined on the source and add them.
    addMissingKeys(log, source, revised);

    return revised;
}

async function translateLocale(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    unwritten: LocalePath[],
    /** Accumulator for paths whose translation succeeded; see verifyLocale. */
    translatedPaths?: Set<string>,
) {
    const revised = JSON.parse(JSON.stringify(target)) as LocaleText;

    // Strip Unwritten/Revised prefixes so the translator doesn't see them as
    // part of the input (e.g. "$!duplicate" coming back with the marker embedded).
    const stripMarkers = (s: string) =>
        s.replace(Unwritten, '').replace(Revised, '');

    const translator = getTranslator();
    const targetLocale = await translator.getTargetLocale(
        target.language,
        target.regions,
    );

    // Translate a subset of paths and write the results into `revised`. A `null`
    // translation is written as the source marked Unwritten ($?) — never fake
    // machine-translated English; $? fails the unwritten gate (loud) and is
    // retried next run. `targetText` supplies the in-memory target (with the
    // already-translated glossary, Phase 1) so terms localize to the target word.
    // Returns false on a hard failure (caller aborts the locale).
    const apply = async (
        paths: LocalePath[],
        targetText: LocaleText | undefined,
    ): Promise<boolean> => {
        // A `doc` array is one logical markup document (items are an editing
        // convenience, often breaking mid-sentence) → translate atomically as one
        // joined string (toDocString's `\n\n`). Other arrays (names, tips, …) are
        // distinct items, translated per element.
        const sourceStrings = paths.flatMap((path) => {
            const match = path.resolve(source);
            if (match === undefined) return [];
            if (Array.isArray(match))
                return path.key === 'doc'
                    ? [match.map(stripMarkers).join('\n\n')]
                    : match.map(stripMarkers);
            return [stripMarkers(match)];
        });
        if (sourceStrings.length === 0) return true;

        const translations = await translator.translate(
            log,
            sourceStrings,
            toLocaleString(source),
            targetLocale,
            targetText,
        );
        if (translations === undefined) {
            log.bad(
                2,
                'Unable to translate. Check ANTHROPIC_API_KEY (claude) or gcloud auth (google).',
            );
            return false;
        }

        for (const path of paths) {
            const match = path.resolve(source);
            if (match === undefined) continue;
            if (Array.isArray(match)) {
                if (path.key === 'doc') {
                    // Atomic doc: one translation for the whole block; split back
                    // into paragraphs on `\n\n`. On a null result, keep the source
                    // unwritten per original element.
                    const translation = translations.shift();
                    if (translation != null && translation.trim().length > 0) {
                        const parts = translation
                            .split('\n\n')
                            .map((p) => p.trim())
                            .filter((p) => p.length > 0)
                            .map((p) => `${MachineTranslated}${p}`);
                        if (parts.length > 0) {
                            path.repair(revised, parts);
                            translatedPaths?.add(path.toString());
                        }
                    } else {
                        path.repair(
                            revised,
                            match.map((s) => `${Unwritten}${stripMarkers(s)}`),
                        );
                    }
                } else {
                    const value: string[] = [];
                    let wroteAny = false;
                    for (let count = 0; count < match.length; count++) {
                        const next = translations.shift();
                        if (next != null) {
                            const t =
                                path.key === 'name' || path.key === 'names'
                                    ? toValidName(next)
                                    : next;
                            value.push(`${MachineTranslated}${t.trim()}`);
                            wroteAny = true;
                        } else {
                            value.push(
                                `${Unwritten}${stripMarkers(match[count])}`,
                            );
                        }
                    }
                    path.repair(revised, value);
                    if (wroteAny) translatedPaths?.add(path.toString());
                }
            } else {
                const translation = translations.shift();
                if (translation != null) {
                    const t =
                        path.key === 'name' || path.key === 'names'
                            ? toValidName(translation)
                            : translation;
                    path.repair(revised, `${MachineTranslated}${t.trim()}`);
                    translatedPaths?.add(path.toString());
                } else {
                    path.repair(revised, `${Unwritten}${stripMarkers(match)}`);
                }
            }
        }
        return true;
    };

    // Phase 1: translate the glossary words first, so Phase 2 can localize the
    // many bare occurrences of those terms (and the words inside definitions) to
    // the target word. On a fresh locale the glossary isn't translated yet, so
    // this must precede everything else.
    const isGlossaryWord = (p: LocalePath) =>
        p.path[0] === 'glossary' && p.key === 'word';
    const glossaryWords = unwritten.filter(isGlossaryWord);
    const rest = unwritten.filter((p) => !isGlossaryWord(p));
    if (glossaryWords.length > 0)
        log.say(2, `Translating ${glossaryWords.length} glossary terms first…`);
    if (!(await apply(glossaryWords, undefined))) return revised;
    // Phase 2: everything else, with the now-translated glossary supplied.
    if (rest.length > 0)
        log.say(2, `Translating ${rest.length} remaining strings…`);
    await apply(rest, revised);

    return revised;
}

export function removeExtraKeys(
    log: Log,
    source: Record<string, unknown>,
    target: Record<string, unknown>,
) {
    for (const key of Object.keys(target)) {
        const targetValue = target[key];
        // Key not in the source? Delete it from the target.
        if (typeof source === 'object' && !(key in source)) {
            log.bad(2, `Removing extra key ${key}`);
            delete target[key];
        }
        // Is the value an object? Remove it's extra keys.
        else {
            const sourceValue = source[key];
            if (
                typeof targetValue === 'object' &&
                targetValue !== null &&
                !Array.isArray(targetValue) &&
                typeof sourceValue === 'object' &&
                sourceValue !== null &&
                !Array.isArray(sourceValue)
            )
                removeExtraKeys(
                    log,
                    sourceValue as Record<string, unknown>,
                    targetValue as Record<string, unknown>,
                );
            // If they are arrays, go through them and remove any extra keys.
            else if (
                Array.isArray(targetValue) &&
                Array.isArray(sourceValue) &&
                key !== 'regions'
            ) {
                for (let index = 0; index < targetValue.length; index++) {
                    const sourceValueElement = sourceValue[index];
                    if (sourceValueElement === undefined) {
                        targetValue[index] = undefined;
                    } else
                        removeExtraKeys(
                            log,
                            sourceValueElement,
                            targetValue[index],
                        );
                }
                // Truncate any undefined values created in the list.
                const firstNullIndex = targetValue.indexOf(undefined);
                if (firstNullIndex !== -1) targetValue.length = firstNullIndex;
            }
        }
    }
}

/** Add missing keys relative to a source locale. */
export function addMissingKeys(
    log: Log,
    source: Record<string, unknown>,
    target: Record<string, unknown>,
) {
    for (const key of Object.keys(source)) {
        const sourceValue = source[key];
        // Key not in the the target? Add it.
        if (typeof target === 'object' && !(key in target)) {
            log.bad(2, `Adding missing key ${key}`);
            target[key] = placehold(sourceValue);
        }
        // Otherwise, traverse.
        else {
            const targetValue = target[key];
            if (
                typeof sourceValue === 'object' &&
                sourceValue !== null &&
                !Array.isArray(sourceValue)
            ) {
                if (
                    typeof targetValue === 'object' &&
                    targetValue !== null &&
                    !Array.isArray(targetValue)
                )
                    addMissingKeys(
                        log,
                        sourceValue as Record<string, unknown>,
                        targetValue as Record<string, unknown>,
                    );
                else if (
                    typeof targetValue === 'string' &&
                    (targetValue.startsWith(MachineTranslated) ||
                        targetValue === Unwritten)
                ) {
                    target[key] = {} as Record<string, unknown>;
                    addMissingKeys(
                        log,
                        sourceValue as Record<string, unknown>,
                        target[key] as Record<string, unknown>,
                    );
                } else
                    log.bad(
                        2,
                        `Target has the key ${key}, but it's not an object. Repair manually: ${targetValue}`,
                    );
            } else if (
                Array.isArray(sourceValue) &&
                sourceValue.every((s) => typeof s === 'object')
            ) {
                if (
                    Array.isArray(targetValue) &&
                    targetValue.every((t) => typeof t === 'object')
                ) {
                    for (let index = 0; index < targetValue.length; index++) {
                        const sourceValueElement = sourceValue[index];
                        // Delete the value if there's no value at the source.
                        if (sourceValueElement === undefined)
                            delete targetValue[index];
                        // If there is a value, add the missing key.
                        else
                            addMissingKeys(
                                log,
                                sourceValueElement,
                                targetValue[index],
                            );
                    }
                } else {
                    log.bad(
                        2,
                        `Target has the key ${key}, but it's not an array. Repair manually.`,
                    );
                }
            } else if (
                key !== 'names' &&
                key !== 'doc' &&
                key !== 'regions' &&
                Array.isArray(sourceValue) &&
                sourceValue.every((s) => typeof s === 'string')
            ) {
                if (
                    Array.isArray(targetValue) &&
                    targetValue.every((t) => typeof t === 'string')
                ) {
                    for (let index = 0; index < targetValue.length; index++) {
                        const sourceValueElement = sourceValue[index];
                        if (sourceValueElement === undefined)
                            delete targetValue[index];
                    }
                    for (
                        let index = targetValue.length;
                        index < sourceValue.length;
                        index++
                    ) {
                        targetValue[index] = Unwritten;
                    }
                } else {
                    log.bad(
                        2,
                        `Target has the key ${key}, but it's not an array of strings: ${JSON.stringify(targetValue)}. Repair manually.`,
                    );
                }
            }
        }
    }
}

/** Take an object and replace of all of it's string or string[] values with unwritten strings. */
function placehold(value: unknown): unknown {
    if (typeof value === 'string') return Unwritten;
    else if (Array.isArray(value) && value.every((s) => typeof s === 'string'))
        return [Unwritten];
    else if (Array.isArray(value)) return value.map(placehold);
    else if (typeof value === 'object' && value !== null) {
        const copy = { ...value } as Record<string, unknown>;
        for (const key of Object.keys(copy)) copy[key] = placehold(copy[key]);
        return copy;
    }
    return value;
}
