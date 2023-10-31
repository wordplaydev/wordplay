import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { concretizeOrUndefined } from '../locale/concretize';
import parseDoc from '../parser/parseDoc';
import { parseLocaleDoc, type Locale, toDocString } from '../locale/Locale';
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
import { DefaultLocales } from '../locale/DefaultLocale';

// Read in and compile the two schema
const localeSchema = JSON.parse(
    fs.readFileSync('static/schemas/Locale.json', 'utf8')
);
const tutorialSchema = JSON.parse(
    fs.readFileSync('static/schemas/Tutorial.json', 'utf8')
);

const ajv = new Ajv({ strictTuples: false, allErrors: true });

chalk.level = 1;
const log = console.log;

function say(level: number, message: string) {
    log('  '.repeat(level) + message);
}

function good(level: number, message: string) {
    say(level, '✓ ' + chalk.blue(message));
}

function bad(level: number, message: string) {
    say(level, 'x ' + chalk.magenta(message));
}

say(0, 'Checking locale files for problems!');

fs.readdirSync(path.join('static', 'locales'), { withFileTypes: true }).forEach(
    (file) => {
        if (file.isDirectory()) {
            const language = file.name;
            say(1, `Let's inspect ${chalk.blue(language)}`);
            // Make sure there's a locale file.

            const stringsPath =
                language === 'en-US'
                    ? path.join('src', 'locale', 'en-US.json')
                    : path.join(
                          'static',
                          'locales',
                          language,
                          `${language}.json`
                      );

            let stringsData: string | undefined;
            try {
                stringsData = fs.readFileSync(stringsPath, 'utf8');
                good(2, 'Found a locale file.');
            } catch (err) {
                bad(2, `No locale strings file at ${stringsPath}`);
            }

            if (stringsData) {
                let locale: Locale | undefined = undefined;
                try {
                    locale = JSON.parse(stringsData);
                } catch (_) {
                    bad(
                        2,
                        "Couldn't parse the JSON file, it must have a syntax error."
                    );
                }

                if (locale) {
                    const validate = ajv.compile(localeSchema);
                    const valid = validate(locale);
                    if (!valid && validate.errors) {
                        bad(2, "Locale isn't valid");
                        for (const error of validate.errors) {
                            if (error.message)
                                bad(
                                    3,
                                    `${error.instancePath}: ${error.message}`
                                );
                        }
                    } else verifyLocale(locale, file.name !== 'example');
                }
                else bad(2, "Couldn't find locale schema");

                // Make sure there's a tutorial file.
                const tutorialPath = path.join(
                    'static',
                    'locales',
                    language,
                    `${language}-tutorial.json`
                );

                let tutorialData: string | undefined = undefined;
                try {
                    tutorialData = fs.readFileSync(tutorialPath, 'utf8');
                    good(2, 'Found a tutorial file.');
                } catch (err) {
                    if (file.name !== 'example')
                        bad(
                            2,
                            `No tutorial file at ${tutorialPath}. Can you make one?`
                        );
                }

                if (locale && tutorialData) {
                    let tutorial: Tutorial | undefined = undefined;
                    try {
                        tutorial = JSON.parse(tutorialData);
                    } catch (_) {
                        bad(
                            2,
                            "Couldn't parse tutorial, there must be a syntax error"
                        );
                    }

                    if (tutorial) {
                        const validate = ajv.compile(tutorialSchema);
                        const valid = validate(tutorial);
                        if (!valid && validate.errors) {
                            bad(2, "Tutorial isn't valid");
                            for (const error of validate.errors) {
                                if (error.message)
                                    bad(
                                        3,
                                        `${error.instancePath}: ${error.message}`
                                    );
                            }
                        }
                        verifyTutorial(locale, tutorial);
                    }
                    else bad(2, "Couldn't find tutorial schema");
                }
            }
        }
    }
);

type Strings = [string[], string, string][];

/** This converts the locale into a list of key/value pairs for verification.
 */
function getKeyTemplatePairs(
    path: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: Record<any, any>,
    pairs: Strings
) {
    for (const key of Object.keys(record)) {
        const value = record[key];
        if (typeof value === 'string') pairs.push([path, key, value]);
        // Many docs are lists of strings that are intended to be joined together.
        // Account for these when finding strings for verification.
        else if (
            Array.isArray(value) &&
            value.every((v) => typeof v === 'string') &&
            key !== "names"
        )
            pairs.push([path, key, value.join('\n\n')]);
        else if (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value)
        )
            getKeyTemplatePairs([...path, key], value, pairs);
        else if (Array.isArray(value)) {
            for (const record of value)
                getKeyTemplatePairs([...path, key], record, pairs);
        }
    }
}

function pathToString(locale: Locale, path: string[]) {
    return `${locale.language} -> ${path.join(' -> ')}`;
}

function verifyLocale(locale: Locale, warnUnwritten: boolean) {
    // Get the key/value pairs
    const pairs: Strings = [];
    getKeyTemplatePairs([], locale, pairs);

    // Check each one.
    for (const [path, key, value] of pairs) {
        // If the key suggests that it's documentation, try to parse it as a doc and
        // see if it has any tokens of unknown type or unparsable expressions or types.
        if (key === 'doc') {
            const doc = parseLocaleDoc(toDocString(value));
            const unknownTokens = doc
                .leaves()
                .filter(
                    (node) =>
                        node instanceof Token && node.isSymbol(Sym.Unknown)
                );

            if (unknownTokens.length > 0)
                bad(
                    2,
                    `Found invalid tokens in ${pathToString(
                        locale,
                        path
                    )}: ${unknownTokens.join(', ')}`
                );

            const missingConcepts = doc
                .nodes()
                .filter(
                    (node) =>
                        node instanceof ConceptLink && !node.isValid(locale)
                );

            if (missingConcepts.length > 0)
                bad(
                    2,
                    `Found unknown concept name ${pathToString(
                        locale,
                        path
                    )}: ${missingConcepts
                        .map((u) => u.toWordplay())
                        .join(', ')}`
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
        else if (key === 'names') {
            const names = Array.isArray(value) ? value : [value];
            for (const name of names) {

                if(name.trim().length === 0) {
                    bad(2, `Name is empty:: "${name}`)
                }
                else {
                    const nameWithoutPlaceholder = name.replaceAll('$?', '').replaceAll("$!", "").trim();

                    // If it wasn't just a placeholder
                    if(nameWithoutPlaceholder.length > 0) {
                        const tokens = tokenize(
                            nameWithoutPlaceholder
                        ).getTokens();

                        // One name and one end token.
                        if(tokens.length > 2)
                            bad(2, `Name has space: "${nameWithoutPlaceholder}`)

                        const token = tokens[0];
                        if (
                            token === undefined ||
                            !(token.isName() || token.isSymbol(Sym.Operator))
                        )
                            bad(
                                2,
                                `Name ${name} is not a valid name, it's a ${token
                                    .getTypes()
                                    .join(', ')}`
                            );
                    }
                }
            }
        }
        // If it's not a doc, assume it's a template string and try to parse it as a template.
        // If we can't, complain.
        else {
            const description = concretizeOrUndefined(
                DefaultLocales,
                value,
                'test',
                'test',
                'test',
                'test',
                'test',
                'test',
                'test',
                'test',
                'test'
            );
            if (description === undefined)
                bad(
                    2,
                    `String at ${pathToString(
                        locale,
                        path
                    )} is has unparsable template string "${value}"`
                );
        }
    }

    const unwritten = pairs.filter(([, , value]) => value.startsWith('$?'));

    if (unwritten.length > 0 && warnUnwritten)
        bad(
            2,
            `Locale has ${unwritten.length} unwritten strings ("$?"). Keep writing!`
        );

    const outofdate = pairs.filter(([, , value]) => value.startsWith('$!'));

    if (outofdate.length > 0)
        bad(
            2,
            `Locale has ${outofdate.length} potentially out of date strings ("$!"). Compare them against the English translation.`
        );
}

function check(line: Line): boolean {
    return (
        line !== null &&
        ['fit', 'fix', 'edit', 'use'].includes((line as Performance)[0])
    );
}

function verifyTutorial(locale: Locale, tutorial: Tutorial) {
    const programs = tutorial.acts
        .map((act) => {
            const programs = [
                // Verify act programs
                ...(check(act.performance)
                    ? [
                          {
                              kind: act.performance[0],
                              list: act.performance.slice(1),
                          },
                      ]
                    : []),
                // Verify scene programs
                ...act.scenes
                    .filter((scene) => check(scene.performance))
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
                    .filter((line): line is Performance => check(line))
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
                bad(
                    2,
                    `use ${name} doesn't exist in Performances. Is it misspelled or missing?`
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
                locale
            );
            project.analyze();
            project.getAnalysis();

            if (
                !conflictsIntentional &&
                project.getPrimaryConflicts().size > 0
            ) {
                bad(
                    2,
                    `Uh oh, there's a conflict in...\n\n${code}, ${Array.from(
                        project.getPrimaryConflicts().values()
                    )
                        .flat()
                        .map((c) => c.toString())
                        .join(',')}`
                );
            }
        }
    }

    // Build a list of all concept links
    const conceptLinks: ConceptLink[] = tutorial.acts
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
                .map((line) =>
                    parseDoc(
                        toTokens(
                            DOCS_SYMBOL +
                                line.slice(2).join('\n\n') +
                                DOCS_SYMBOL
                        )
                    )
                        .nodes()
                        .filter(
                            (node: Node): node is ConceptLink =>
                                node instanceof ConceptLink
                        )
                        .flat()
                )
                .flat(2),
        ])
        .flat();

    for (const link of conceptLinks)
        if (!link.isValid(locale))
            bad(2, `Unknown tutorial concept: ${link.getName()}`);
}
