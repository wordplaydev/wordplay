import { concretizeOrUndefined } from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import type LocaleText from '@locale/LocaleText';
import {
    isAutomated,
    isUnwritten,
    MachineTranslated,
    parseLocaleDoc,
    toDocString,
    toLocale,
    Unwritten,
} from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import ConceptLink from '@nodes/ConceptLink';
import Sym from '@nodes/Sym';
import Token from '@nodes/Token';
import { tokenize } from '@parser/Tokenizer';
import LocalePath, { getKeyTemplatePairs } from './LocalePath';
import { LocaleValidator } from './LocaleSchema';
import type Log from './Log';
import type { RevisedString } from './start';
import translate from './translate';

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
    /** Whether to translate unwritten strings in the locale */
    translate: boolean,
    /** Strings that have been revised in one or more locales */
    revisedStrings: RevisedString[],
    /** Global names used by other locales */
    globalNames: Map<string, { locale: string; path: LocalePath }[]>,
): Promise<[LocaleText, boolean]> {
    let revisedText: LocaleText = text;
    const valid = LocaleValidator(text);
    if (!valid && LocaleValidator.errors) {
        log.bad(
            2,
            "Locale doesn't match the schema. Will attempt to repair it.",
        );
        for (const error of LocaleValidator.errors) {
            if (error.message)
                log.bad(3, `${error.instancePath}: ${error.message}`);
        }

        revisedText = repairLocale(log, DefaultLocale, text);
    }

    // Don't warn if we're checking the example locale.
    revisedText = await checkLocale(
        log,
        revisedText,
        DefaultLocale,
        true,
        translate && locale !== 'en-US',
        revisedStrings,
        globalNames,
    );

    return [revisedText, JSON.stringify(revisedText) !== JSON.stringify(text)];
}

/** Given a locale, check it's validity, and repair what we can. */
async function checkLocale(
    log: Log,
    original: LocaleText,
    DefaultLocale: LocaleText,
    warnUnwritten: boolean,
    translate: boolean,
    revisedStrings: RevisedString[],
    globalNames: Map<string, { locale: string; path: LocalePath }[]>,
): Promise<LocaleText> {
    // Make a copy of the original to modify.
    let revised = JSON.parse(JSON.stringify(original)) as LocaleText;

    // Get the key/value pairs to check.
    let pairs: LocalePath[] = getCheckableLocalePairs(revised);

    // Find all of the unwritten strings.
    const unwritten = pairs
        .filter(({ value }) =>
            typeof value === 'string'
                ? isUnwritten(value)
                : value.some((s) => isUnwritten(s)),
        )
        // Don't translate emotions; those have meaning.
        .filter(({ key }) => key !== 'emotion');

    // If there are any unwritten strings and we were asked to translate them, do so.
    if (unwritten.length > 0 && warnUnwritten && translate) {
        log.bad(
            2,
            `Locale has ${unwritten.length} unwritten strings ("${Unwritten}"). Translating using Google translate.`,
        );

        revised = await translateLocale(log, DefaultLocale, revised, unwritten);
    }

    // Check the translated pairs for errors.
    pairs = getKeyTemplatePairs(revised);

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
                                            p.locale !== toLocale(original) &&
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
            const description = concretizeOrUndefined(
                DefaultLocales,
                path.value,
                'test',
                'test',
                'test',
                'test',
                'test',
                'test',
                'test',
                'test',
                'test',
            );
            if (description === undefined)
                log.bad(
                    2,
                    `String at ${path.toString()} is has unparsable template string "${
                        path.value
                    }"`,
                );
        }
    }

    for (const revisedString of revisedStrings) {
        const match = pairs.find((path) => path.equals(revisedString.path));
        if (match)
            log.warning(
                2,
                `Potentially out of date string at ${revisedString.path.toString()}: "${revisedString.path.resolve(original)}". Revision in ${revisedString.locale}: "${revisedString.text}"`,
            );
    }

    const automated = pairs.filter(({ value }) =>
        typeof value === 'string'
            ? isAutomated(value)
            : value.some((s) => isAutomated(s)),
    );

    if (automated.length > 0)
        log.warning(
            2,
            `Locale has ${automated.length} machine translated ("${MachineTranslated}"). Make sure they're sensible for 6th grade reading levels.`,
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

    // Resolve all of the source strings
    const sourceStrings = unwritten
        .map((path) => {
            const match = path.resolve(source);
            return match === undefined
                ? undefined
                : Array.isArray(match)
                  ? match.map((s) => s.replace(Unwritten, ''))
                  : match.replace(Unwritten, '');
        })
        .filter((s) => s !== undefined)
        .flat();

    const translations = await translate(
        log,
        sourceStrings,
        source.language,
        target.language,
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
            else if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
                for (let index = 0; index < targetValue.length; index++) {
                    const sourceValueElement = sourceValue[index];
                    if (sourceValueElement === undefined)
                        delete targetValue[index];
                    else
                        removeExtraKeys(
                            log,
                            sourceValueElement,
                            targetValue[index],
                        );
                }
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
                else
                    log.bad(
                        2,
                        `Target has the key ${key}, but it's not an object. Repair manually.`,
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
