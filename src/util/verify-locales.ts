import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import * as prettier from 'prettier';
import parseDoc from '../parser/parseDoc';
import {
    parseLocaleDoc,
    toDocString,
    withoutAnnotations,
    isUnwritten,
    Unwritten,
    isOutdated,
    Outdated,
    isAutomated,
    MachineTranslated,
} from '../locale/LocaleText';
import type LocaleText from '../locale/LocaleText';
import { toTokens } from '../parser/toTokens';
import Token from '../nodes/Token';
import Sym from '../nodes/Sym';
import ConceptLink from '../nodes/ConceptLink';
import { Performances } from '../tutorial/Performances';
import type Tutorial from '../tutorial/Tutorial';
import type { Performance, Line, Dialog } from '../tutorial/Tutorial';
import Source from '../nodes/Source';
import type Node from '../nodes/Node';
import { DOCS_SYMBOL } from '../parser/Symbols';
import Project from '../models/Project';
import { tokenize } from '../parser/Tokenizer';
import DefaultLocales from '../locale/DefaultLocales';
import Translate from '@google-cloud/translate';
import { concretizeOrUndefined } from '@locale/concretize';

// Read in and compile the two schema so we can check files.
const localeSchema = JSON.parse(
    fs.readFileSync('static/schemas/LocaleText.json', 'utf8'),
);
const tutorialSchema = JSON.parse(
    fs.readFileSync('static/schemas/Tutorial.json', 'utf8'),
);

// Initialize the schema validator.
const ajv = new Ajv({ strictTuples: false, allErrors: true });

// Create a validator function.
const LocaleValidator = ajv.compile(localeSchema);

// Initialize chalk's 16 color support.
chalk.level = 1;

// A helper class to gather messages for later printing, to overcome parallel validation of locales.
class Log {
    private readonly messages: string[] = [];
    constructor() {}

    add(message: string) {
        this.messages.push(message);
    }

    say(level: number, message: string) {
        this.add('  '.repeat(level) + message);
    }

    good(level: number, message: string) {
        this.say(level, '✓ ' + chalk.blue(message));
    }

    bad(level: number, message: string) {
        this.say(level, 'x ' + chalk.magenta(message));
    }

    flush() {
        for (const message of this.messages) console.log(message);
        this.messages.splice(0, this.messages.length);
    }
}

/** We use this for repair. Make sure it's valid before we do any repairs. */
const DefaultLocale = getLocaleJSON(new Log(), 'en-US') as LocaleText;
const DefaultTutorial = getTutorialJSON(new Log(), 'en-US') as Tutorial;

if (!LocaleValidator(DefaultLocale)) {
    console.log(
        'Default locale is invalid. It needs to be repaired before we can proceed.',
    );
    if (LocaleValidator.errors)
        for (const error of LocaleValidator.errors) {
            if (error.message)
                console.log(
                    'x ' +
                        chalk.magenta(
                            `${error.instancePath}: ${error.message}`,
                        ),
                );
        }
    process.exit(0);
}

/** Given a path, load a JSON file and ensure it's an object, not some other kind of value. */
function getObjectFromJSONFile(log: Log, path: string): object | undefined {
    try {
        const localeText = fs.readFileSync(path, 'utf8');
        try {
            const localeObject = JSON.parse(localeText);
            if (
                typeof localeObject === 'object' &&
                !Array.isArray(localeObject) &&
                localeObject !== null
            )
                return localeObject;
            else {
                log.bad(2, "Locale isn't an object");
                return undefined;
            }
        } catch (err) {
            log.bad(2, `Locale file has a parsing error: ${err}`);
        }
    } catch (err) {
        return undefined;
    }
}

/** Get a locale file path from a locale name. */
function getLocalePath(locale: string) {
    return locale === 'en-US'
        ? path.join('src', 'locale', 'en-US.json')
        : path.join('static', 'locales', locale, `${locale}.json`);
}

/** Get a tutorial path from a locale name. */
function getTutorialPath(locale: string) {
    return path.join('static', 'locales', locale, `${locale}-tutorial.json`);
}

/** Get the locale JSON for the given locale. */
function getLocaleJSON(log: Log, locale: string): unknown | undefined {
    return getObjectFromJSONFile(log, getLocalePath(locale));
}

/** Get the tutorial JSON fro the given locale. */
function getTutorialJSON(log: Log, locale: string): object | undefined {
    return getObjectFromJSONFile(log, getTutorialPath(locale));
}

/** Load, validate, and check the locale. */
async function validateLocale(
    log: Log,
    language: string,
    originalJSON: LocaleText,
): Promise<[LocaleText, boolean] | undefined> {
    let revisedJSON: LocaleText = originalJSON as LocaleText;
    const valid = LocaleValidator(originalJSON);
    if (!valid && LocaleValidator.errors) {
        log.bad(
            2,
            "Locale doesn't match the schema. Will attempt to repair it.",
        );
        for (const error of LocaleValidator.errors) {
            if (error.message)
                log.bad(3, `${error.instancePath}: ${error.message}`);
        }

        revisedJSON = repairLocale(
            log,
            DefaultLocale,
            originalJSON as LocaleText,
        );
    } else log.good(2, 'Found valid locale');

    revisedJSON = await checkLocale(
        log,
        revisedJSON as LocaleText,
        language !== 'example',
    );

    return [
        revisedJSON,
        JSON.stringify(revisedJSON) !== JSON.stringify(originalJSON),
    ];
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

/** Load, validate, and check the tutorial. */
async function validateTutorial(
    log: Log,
    locale: LocaleText,
    tutorialJSON: Tutorial,
): Promise<Tutorial | undefined> {
    const validate = ajv.compile(tutorialSchema);
    const valid = validate(tutorialJSON);
    if (!valid && validate.errors) {
        log.bad(
            2,
            "Tutorial doesn't match the schema. Will attempt to repair it.",
        );
        for (const error of validate.errors) {
            if (error.message)
                log.bad(3, `${error.instancePath}: ${error.message}`);
        }
    } else log.good(2, 'Found valid tutorial.');

    const revisedJSON = await checkTutorial(log, locale, tutorialJSON as Tutorial);

    return revisedJSON;
}

class StringPath {
    // The key or number indexing into the object literal.
    readonly path: (string | number)[];
    readonly key: string;
    readonly value: string | string[];

    constructor(
        path: (string | number)[],
        key: string,
        value: string | string[],
    ) {
        this.path = path;
        this.key = key;
        this.value = value;
    }

    private retrieve(
        locale: Record<string, unknown>,
    ): Record<string, unknown> | undefined {
        let record: Record<string, unknown> = locale;
        for (const key of this.path) {
            if (!(key in record)) return undefined;
            const value = record[key];
            if (typeof value !== 'object' || value === null) return undefined;
            record = value as Record<string, unknown>;
        }

        return record;
    }

    resolve(locale: Record<string, unknown>): string | string[] | undefined {
        const record = this.retrieve(locale);
        if (record === undefined) return undefined;
        const text = record[this.key];
        if (
            text === undefined ||
            (typeof text !== 'string' &&
                !(
                    Array.isArray(text) &&
                    text.every((t) => typeof t === 'string')
                ))
        )
            return undefined;
        return text;
    }

    repair(
        locale: Record<string, unknown>,
        value: string | string[] = Unwritten,
    ) {
        const record = this.retrieve(locale);
        if (record) record[this.key] = value;
    }

    toString(): string {
        return `${this.path.join(' -> ')}: ${this.key}`;
    }
}

/** This converts the locale into a list of key/value pairs for verification.
 */
function getKeyTemplatePairs(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: Record<any, any>,
    pairs: StringPath[] = [],
    path: (string | number)[] = [],
): StringPath[] {
    for (const key of Object.keys(record)) {
        const value = record[key];
        if (
            typeof value === 'string' ||
            (Array.isArray(value) && value.every((s) => typeof s === 'string'))
        )
            pairs.push(new StringPath(path, key, value));
        // Many docs are lists of strings that are intended to be joined together.
        // Account for these when finding strings for verification.
        else if (
            Array.isArray(value) &&
            value.every((v) => typeof v === 'string') &&
            key !== 'names'
        )
            pairs.push(new StringPath(path, key, value));
        else if (
            typeof value === 'object' &&
            value !== undefined &&
            value !== null &&
            !Array.isArray(value)
        )
            getKeyTemplatePairs(value, pairs, [...path, key]);
        else if (Array.isArray(value)) {
            for (let index = 0; index < value.length; index++) {
                const element = value[index];
                if (element)
                    getKeyTemplatePairs(element, pairs, [...path, key, index]);
            }
        }
    }
    return pairs;
}

function removeExtraKeys(
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

/** Add missing keys relative to a source locale. */
function addMissingKeys(
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
                        if (sourceValueElement === undefined)
                            delete targetValue[index];
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
            }
        }
    }
}

async function translate(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    unwritten: StringPath[],
) {
    const revised = JSON.parse(JSON.stringify(target)) as LocaleText;

    // Resolve all of the source strings
    const sourceStrings = unwritten
        .map((path) => {
            const match = path.resolve(source);
            return match === undefined
                ? undefined
                : Array.isArray(match)
                  ? match
                  : match;
        })
        .filter((s) => s !== undefined)
        .flat();

    // Split the strings into groups of 100, since Google Translate only allows 128 at a time.
    const sourceStringsBatches: string[][] = [];
    while (sourceStrings.length > 0)
        sourceStringsBatches.push(sourceStrings.splice(0, 100));

    // Pass them to Google Translate
    let translations: string[] = [];
    for (const batch of sourceStringsBatches) {
        try {
            // Create a Google Translate client
            const translator = new Translate.v2.Translate();
            // Translate the strings
            const [translatedBatch] = await translator.translate(batch, {
                from: source.language,
                to: target.language,
            });
            translations = [...translations, ...translatedBatch];
        } catch (error) {
            log.bad(
                2,
                "Unable to translate. Make sure gcloud cli is installed, you are logged in, and your project is wordplay-prod. Here's the error Google gave" +
                    error,
            );
            return revised;
        }
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

async function translateTutorial(
    log: Log,
    source: Tutorial,
    target: Tutorial,
    unwritten: StringPath[],
) {
    const revised = JSON.parse(JSON.stringify(target)) as Tutorial; // 深拷贝目标对象

    // 从 source 提取需要翻译的字符串
    const sourceStrings = unwritten
        .map((path) => {
            const match = path.resolve(source); // 从 source 中解析路径值
            return match === undefined
                ? undefined
                : Array.isArray(match) // 如果值是数组，则返回数组内容，否则直接返回值
                ? match
                : match;
        })
        .filter((s) => s !== undefined)
        .flat(); // 将数组展开为一维

    // 将字符串分组，每组最多100个
    const sourceStringsBatches: string[][] = [];
    while (sourceStrings.length > 0) {
        sourceStringsBatches.push(sourceStrings.splice(0, 100));
    }

    // 调用 Google Translate API 翻译字符串
    let translations: string[] = [];
    for (const batch of sourceStringsBatches) {
        try {
            const translator = new Translate.v2.Translate();
            const [translatedBatch] = await translator.translate(batch, {
                from: source.language,
                to: target.language,
            });
            translations = [...translations, ...translatedBatch]; // 累积翻译结果
        } catch (error) {
            log.bad(
                2,
                "翻译失败。请确保 gcloud CLI 配置正确，错误信息：" + error,
            );
            return revised; // 如果翻译失败，返回原始目标对象
        }
    }

    // 根据 unwritten 的路径，将翻译后的字符串写入 revised 对象
    for (const path of unwritten) {
        const match = path.resolve(source); // 从 source 获取当前路径的值
        if (match !== undefined) {
            if (
                Array.isArray(match) &&
                match.every((s) => typeof s === 'string') // 确保是字符串数组
            ) {
                const value = [];
                for (let i = 0; i < match.length; i++) {
                    let next = translations.shift();
                    if (next) {
                        value.push(`${MachineTranslated}${next.trim()}`); // 添加翻译标记
                    }
                }
                path.repair(revised, value); // 更新目标路径的值
            } else if (typeof match === 'string') {
                let translation = translations.shift();
                if (translation) {
                    path.repair(
                        revised,
                        `${MachineTranslated}${translation.trim()}`, // 单个字符串翻译并更新
                    );
                }
            }
        }
    }

    return revised; // 返回更新后的对象
}





/** Given a locale, check it's validity, and repair what we can. */
async function checkLocale(
    log: Log,
    original: LocaleText,
    warnUnwritten: boolean,
): Promise<LocaleText> {
    let revised = JSON.parse(JSON.stringify(original)) as LocaleText;

    // Get the key/value pairs
    let pairs: StringPath[] = getKeyTemplatePairs(revised);

    const unwritten = pairs.filter(({ value }) =>
        typeof value === 'string'
            ? isUnwritten(value)
            : value.some((s) => isUnwritten(s)),
    );

    if (unwritten.length > 0 && warnUnwritten) {
        log.bad(
            2,
            `Locale has ${unwritten.length} unwritten strings ("${Unwritten}"). Translating using Google translate.`,
        );

        revised = await translate(
            log,
            DefaultLocale,
            revised,
            // Don't translate emotions; those have meaning.
            unwritten.filter(({ key }) => key !== 'emotion'),
        );
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

            if (unknownTokens.length > 0)
                log.bad(
                    2,
                    `Found invalid tokens in ${path.toString()}: ${unknownTokens.join(
                        ', ',
                    )}`,
                );

            const missingConcepts = doc
                .nodes()
                .filter(
                    (node) =>
                        node instanceof ConceptLink && !node.isValid(revised),
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

                        // We expect oone name and one end token.

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

    const outofdate = pairs.filter(({ value }) =>
        typeof value === 'string'
            ? isOutdated(value)
            : value.some((s) => isOutdated(s)),
    );

    if (outofdate.length > 0)
        log.bad(
            2,
            `Locale has ${outofdate.length} potentially out of date strings ("${Outdated}"). Compare them against the English translation and decide whether to keep or translate.`,
        );

    const automated = pairs.filter(({ value }) =>
        typeof value === 'string'
            ? isAutomated(value)
            : value.some((s) => isAutomated(s)),
    );

    if (automated.length > 0)
        log.bad(
            2,
            `Locale has ${automated.length} machine translated ("${MachineTranslated}"). Make sure they're sensible for 6th grade reading levels.`,
        );

    return revised;
}

function checkTutorialLineType(line: Line): boolean {
    return (
        line !== null &&
        ['fit', 'fix', 'edit', 'use'].includes((line as Performance)[0])
    );
}

async function checkTutorial(log: Log, locale: LocaleText, original: Tutorial): Promise<Tutorial | undefined> {
    let revised = JSON.parse(JSON.stringify(original)) as Tutorial;

    // Get the key/value pairs
    let pairs: StringPath[] = getKeyTemplatePairs(revised);

    const unwritten = pairs.filter(({ value }) =>
        typeof value === 'string'
            ? isUnwritten(value)
            : value.some((s) => isUnwritten(s)),
    );

    if (unwritten.length > 0) {
        log.bad(
            2,
            `Tutorial has ${unwritten.length} unwritten strings ("${Unwritten}"). Translating using Google translate.`,
        );

        revised = await translateTutorial(
            log,
            DefaultTutorial,
            revised,
            unwritten,
        );
    }


    const programs = revised.acts
        .map((act) => {
            const programs = [
                // Verify act programs
                ...(checkTutorialLineType(act.performance)
                    ? [
                          {
                              kind: act.performance[0],
                              list: act.performance.slice(1),
                          },
                      ]
                    : []),
                // Verify scene programs
                ...act.scenes
                    .filter((scene) => checkTutorialLineType(scene.performance))
                    .map((scene) => {
                        return {
                            kind: scene.performance[0],
                            list: scene.performance.slice(1),
                        };
                    })
                    .flat(),
                // Verify all programs in the scenes
                ...act.scenes
                    // Map act's scenes to lines
                    .map((scene) => scene.lines)
                    // Flatten them into a list of lines
                    .flat()
                    // Filter out anything that's not code, that has an intentional conflict, or is an performance import
                    .filter((line): line is Performance =>
                        checkTutorialLineType(line),
                    )
                    // Map the code onto their start source code
                    .map((performance) => {
                        return {
                            kind: performance[0],
                            list: performance.slice(1),
                        };
                    })
                    .flat(),
            ];
            return programs;
        })
        .flat();

    for (const { kind, list } of programs) {
        let code: string | undefined = undefined;
        let conflictsIntentional = false;
        // If it's a Performance import, get it's code. Otherwise, join lines.
        if (kind === 'use') {
            conflictsIntentional = list[0] === 'conflict';
            const name = list[1];
            const inputs = list.slice(2);
            const fun = (
                Performances as Record<
                    string,
                    ((...input: string[]) => string) | undefined
                >
            )[name];
            if (fun === undefined)
                log.bad(
                    2,
                    `use ${name} doesn't exist in Performances. Is it misspelled or missing?`,
                );
            else {
                code = fun(...inputs);
            }
        } else code = list.join('\n');

        if (code) {
            const project = Project.make(
                null,
                'test',
                new Source('start', code),
                [],
                locale,
            );
            project.analyze();
            project.getAnalysis();

            if (
                !conflictsIntentional &&
                project.getPrimaryConflicts().size > 0
            ) {
                log.bad(
                    2,
                    `Uh oh, there's a conflict in...\n\n${code}, ${Array.from(
                        project.getPrimaryConflicts().values(),
                    )
                        .flat()
                        .map((c) => c.toString())
                        .join(',')}`,
                );
            }
        }
    }

    // Build a list of all concept links
    const conceptLinks: { dialog: Dialog; link: ConceptLink }[] = revised.acts
        .map((act) => [
            // Across all scenes
            ...act.scenes
                // Across all lines
                .map((scene) => scene.lines)
                // Flatten them into a list of lines
                .flat()
                // Keep all dialog that aren't null
                .filter((line): line is Dialog => line !== null)
                // Map each line of dialog to a flat list of concepts in the dialog
                .map((line) => {
                    return parseDoc(
                        toTokens(
                            DOCS_SYMBOL +
                                line.slice(2).join('\n\n') +
                                DOCS_SYMBOL,
                        ),
                    )
                        .nodes()
                        .filter(
                            (node: Node): node is ConceptLink =>
                                node instanceof ConceptLink,
                        )
                        .map((link) => ({ dialog: line, link }))
                        .flat();
                })
                .flat(2),
        ])
        .flat();

    for (const { dialog, link } of conceptLinks)
        if (!link.isValid(locale))
            log.bad(
                2,
                `Unknown tutorial concept: ${link.getName()}, found in ${dialog}`,
            );

    return revised;
}

console.log('Checking locale files for problems!');

fs.readdirSync(path.join('static', 'locales'), { withFileTypes: true }).forEach(
    async (file) => {
        if (file.isDirectory()) {
            const log = new Log();

            const language = file.name;
            log.say(1, `Checking ${chalk.blue(language)}`);
            log.flush();
            log.say(1, `Results for ${chalk.blue(language)}`);

            // Find prettier options
            const localePath = getLocalePath(language);
            const prettierOptions = await prettier.resolveConfig(localePath);

            const originalLocale = getLocaleJSON(log, language);
            if (originalLocale === undefined) {
                log.bad(
                    2,
                    "Couldn't find locale file. Can't validate it, or it's tutorial.",
                );
                return undefined;
            }

            // Validate, repair, and translate the locale file.
            const localeResults = await validateLocale(
                log,
                language,
                originalLocale as LocaleText,
            );
            if (localeResults) {
                const [revisedLocale, localeChanged] = localeResults;
                if (localeChanged) {
                    // Write a formatted version of the revised locale file.
                    const prettyLocale = await prettier.format(
                        JSON.stringify(revisedLocale, null, 4),
                        { ...prettierOptions, parser: 'json' },
                    );

                    console.log('Writing ' + language);
                    fs.writeFileSync(getLocalePath(language), prettyLocale);
                }

                const currentTutorial = getTutorialJSON(log, language);
                if (currentTutorial === undefined) {
                    log.bad(2, "Couldn't find tutorial file.");
                    return undefined;
                }

                // Validate, repair, and translate the tutorial file.
                const revisedTutorial = await validateTutorial(
                    log,
                    revisedLocale,
                    currentTutorial as Tutorial,
                );
                if (
                    revisedTutorial &&
                    JSON.stringify(currentTutorial) !==
                        JSON.stringify(revisedTutorial)
                ) {
                    // Write a formatted version of the revised tutorial file.
                    const prettyTutorial = await prettier.format(
                        JSON.stringify(revisedTutorial, null, 4),
                        { ...prettierOptions, parser: 'json' },
                    );

                    if (JSON.stringify(revisedTutorial) !== prettyTutorial) {
                        console.log('Writing ' + language + ' tutorial');
                        fs.writeFileSync(
                            getTutorialPath(language),
                            prettyTutorial,
                        );
                    }
                }
            }

            // Print out the results.
            log.flush();
        }
    },
);
