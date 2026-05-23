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
import type { RevisedString } from '@util/verify-locales/start';
import {
    checkTemplateInputs,
    getDeclaredInputs,
} from '@util/verify-locales/templateInputs';
import translate, {
    getGoogleTranslateTargetLocale,
} from '@util/verify-locales/translate';

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
                // If this path is marked revised in the original, and this
                // is automated, retranslate it.
                if (
                    revisedStrings.some((rev) => rev.path.equals(path)) &&
                    (typeof value === 'string'
                        ? isMachineTranslated(value)
                        : value.some((s) => isMachineTranslated(s)))
                )
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
            const doc = parseLocaleDoc(toDocString(path.value));
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

            // const unparsables = doc
            //     .nodes()
            //     .filter(
            //         (node) =>
            //             node instanceof UnparsableExpression ||
            //             node instanceof UnparsableType
            //     );

            // expect(
            //     unparsables.length,
            //     `Found unparsables in code inside ${pathToString(
            //         locale,
            //         path
            //     )}: "${unparsables.map((u) => u.toWordplay()).join(', ')}"`
            // ).toBe(0);
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
) {
    const revised = JSON.parse(JSON.stringify(target)) as LocaleText;

    // Resolve all of the source strings, stripping any Unwritten/Revised
    // annotation prefixes so Google Translate doesn't see them as part of
    // the input (otherwise "$!duplicate" can come back with the marker
    // literally embedded in the translation).
    const stripMarkers = (s: string) =>
        s.replace(Unwritten, '').replace(Revised, '');
    const sourceStrings = unwritten
        .map((path) => {
            const match = path.resolve(source);
            return match === undefined
                ? undefined
                : Array.isArray(match)
                  ? match.map(stripMarkers)
                  : stripMarkers(match);
        })
        .filter((s) => s !== undefined)
        .flat();

    const targetLocale = await getGoogleTranslateTargetLocale(
        target.language,
        target.regions,
    );

    const translations = await translate(
        log,
        sourceStrings,
        toLocaleString(source),
        targetLocale,
    );

    if (translations === undefined) {
        log.bad(
            2,
            'Unable to translate. Make sure gcloud cli is installed, you are logged in, and your project is wordplay-prod.',
        );
        return revised;
    }

    // Set all of the target strings to the translated strings.
    for (const path of unwritten) {
        const match = path.resolve(source);
        if (match !== undefined) {
            if (
                Array.isArray(match) &&
                match.every((s) => typeof s === 'string')
            ) {
                const value = [];
                for (let count = 0; count < match.length; count++) {
                    let next = translations.shift();
                    if (next) {
                        if (path.key === 'name' || path.key === 'names')
                            next = next.replaceAll(' ', '');
                        value.push(`${MachineTranslated}${next.trim()}`);
                    }
                }
                path.repair(revised, value);
            } else {
                let translation = translations.shift();
                if (translation) {
                    if (path.key === 'name' || path.key === 'names')
                        translation = translation.replaceAll(' ', '');
                    path.repair(
                        revised,
                        `${MachineTranslated}${translation.trim()}`,
                    );
                }
            }
        }
    }

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
