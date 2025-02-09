import type LocaleText from '@locale/LocaleText';
import type Log from './Log';
import type Tutorial from '../../tutorial/Tutorial';
import type LocalePath from './LocalePath';
import {
    isAutomated,
    isUnwritten,
    MachineTranslated,
    Unwritten,
} from '@locale/LocaleText';
import { getKeyTemplatePairs } from './LocalePath';
import {
    PerformanceMode,
    type Dialog,
    type Line,
    type PeformanceModeType,
    type Performance,
} from '../../tutorial/Tutorial';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import ConceptLink from '@nodes/ConceptLink';
import parseDoc from '@parser/parseDoc';
import { toTokens } from '@parser/toTokens';
import { DOCS_SYMBOL } from '@parser/Symbols';
import { Performances } from '../../tutorial/Performances';
import type Node from '@nodes/Node';
import Validator from './Validator';
import TutorialSchema, { DefaultTutorial } from './TutorialSchema';
import translate from './translate';

/** Load, validate, and check the tutorial, and optionally translate. */
export async function verifyTutorial(
    log: Log,
    locale: LocaleText,
    tutorial: Tutorial,
    translate: boolean,
): Promise<Tutorial | undefined> {
    const validate = Validator.compile(TutorialSchema);
    const valid = validate(tutorial);
    if (!valid && validate.errors) {
        log.bad(
            2,
            "Tutorial doesn't match the schema. Will attempt to repair it.",
        );
        for (const error of validate.errors) {
            if (error.message)
                log.bad(3, `${error.instancePath}: ${error.message}`);
        }
    }

    // Verify and repair the tutorial.
    tutorial = await checkTutorial(log, locale, tutorial as Tutorial);

    // Translate if requested.
    if (translate) tutorial = await translateTutorial(log, tutorial);

    return tutorial;
}

function checkTutorialLineType(line: Line): boolean {
    return (
        line !== null &&
        ['fit', 'fix', 'edit', 'use'].includes((line as Performance)[0])
    );
}

async function checkTutorial(
    log: Log,
    locale: LocaleText,
    original: Tutorial,
): Promise<Tutorial> {
    let revised = JSON.parse(JSON.stringify(original)) as Tutorial;

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
            try {
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
                        `Found conflicts ${Array.from(
                            project.getPrimaryConflicts().values(),
                        )
                            .flat()
                            .map((c) => c.toString())
                            .join(
                                ',',
                            )} in program: ${code.substring(0, 100)}...`,
                    );
                }
            } catch (error) {
                log.bad(
                    2,
                    `Unable to create project and check for conflicts tutorial code: ${code}.\n${error}`,
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

    const pairs = getTranslatableTutorialPairs(revised);

    const automated = pairs.filter(({ value }) =>
        typeof value === 'string'
            ? isAutomated(value)
            : value.some((s) => isAutomated(s)),
    );

    if (automated.length > 0)
        log.warning(
            2,
            `Tutorial has ${automated.length} machine translated ("${MachineTranslated}"). Make sure they're sensible for 6th grade reading levels.`,
        );

    return revised;
}

/** Create a copy of the default tutorial with all dialog marked unwritten */
export function createUnwrittenTutorial(): Tutorial {
    // Deep copy default tutorial
    let tutorial = JSON.parse(JSON.stringify(DefaultTutorial)) as Tutorial;

    // Find the translatable pairs
    const pairs = getTranslatableTutorialPairs(tutorial);

    // Mark all dialog as unwritten
    for (const pair of pairs) pair.repair(tutorial, Unwritten + pair.value);

    // Return the unwritten tutorial
    return tutorial;
}

/** Given a source tutorial and a current target tutorial, translate untranslated tutorial text. */
async function translateTutorial(log: Log, tutorial: Tutorial) {
    // Get the key/value pairs to translate.
    let pairs: LocalePath[] = getTranslatableTutorialPairs(tutorial);

    const unwritten = pairs.filter(({ value }) =>
        typeof value === 'string'
            ? isUnwritten(value)
            : value.some((s) => isUnwritten(s)),
    );

    if (unwritten.length === 0) return tutorial;

    log.say(
        2,
        `Tutorial has ${unwritten.length} unwritten strings ("${Unwritten}"). Translating using Google translate...`,
    );

    // Copy the target tutorial so we can revise it.
    const revised = JSON.parse(JSON.stringify(tutorial)) as Tutorial;

    // Extract strings that need to be translated from source
    const sourceStrings = unwritten
        .map((path) => {
            const match = path.resolve(tutorial);
            return match === undefined || Array.isArray(match)
                ? undefined
                : match.replace(Unwritten, '');
        })
        .filter((s) => s !== undefined)
        .flat();

    const translations = await translate(
        log,
        sourceStrings,
        'en',
        tutorial.language,
    );

    if (translations === undefined) {
        log.bad(
            2,
            'Unable to translate. Make sure gcloud cli is installed, you are logged in, and your project is wordplay-prod.',
        );
        return revised;
    }

    // For each of the untranslated strings, update the revised tutorial with the translated string.
    for (const path of unwritten) {
        // Resolve the path value from source
        const match = path.resolve(tutorial);
        if (match !== undefined) {
            if (
                Array.isArray(match) &&
                match.every((s) => typeof s === 'string') // make sure it's an array of strings
            ) {
                const value = [];
                for (let i = 0; i < match.length; i++) {
                    let next = translations.shift();
                    if (next) {
                        // Add translation mark, so we remember this is machine translated and needs to be checked.
                        value.push(`${MachineTranslated}${next.trim()}`);
                    }
                }
                path.repair(revised, value);
            } else if (typeof match === 'string') {
                let translation = translations.shift();
                if (translation) {
                    path.repair(
                        revised,
                        `${MachineTranslated}${translation.trim()}`, // single string translation and update
                    );
                }
            }
        }
    }

    // Return the translated tutorial
    return revised;
}

/** Given a tutorial, find all string paths that can be translated. */
export function getTranslatableTutorialPairs(tutorial: Tutorial): LocalePath[] {
    // Get the pairs and filter them according to the structure of the tutorial.
    return getKeyTemplatePairs(tutorial).filter((path) => {
        // Title or subtitle? We should translate these.
        if (path.endsWith('title') || path.endsWith('subtitle')) return true;

        // The third element of an array in a line array whose first element is not one of the performance mode changes? We should translate these.
        const linesIndex = path.path.indexOf('lines');

        // If this is a line value, and the next key is an index into its list of lines and the current key is 2, the dialog, then translate it.
        if (
            linesIndex > -1 &&
            typeof path.path[linesIndex + 1] === 'number' &&
            typeof path.key === 'number' &&
            path.key >= 2
        ) {
            const parent = path.parent().resolve(tutorial);
            if (
                Array.isArray(parent) &&
                !PerformanceMode.includes(parent[0] as PeformanceModeType)
            )
                return true;
        }

        return false;
    });
}
