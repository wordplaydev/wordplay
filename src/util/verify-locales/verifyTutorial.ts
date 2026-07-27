import { MachineTranslated, Unwritten } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import { isMachineTranslated, isUnwritten } from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import ConceptLink, {
    ConceptName,
    getConceptPropertyNames,
} from '@nodes/ConceptLink';
import type Node from '@nodes/Node';
import { DOCS_SYMBOL, LINK_SYMBOL } from '@parser/Symbols';
import parseDoc from '@parser/parseDoc';
import { toTokens } from '@parser/toTokens';
import analyzeCode from '@util/verify-locales/analyzeCode';
import {
    tutorialTargetMatches,
    type TutorialTarget,
} from '@util/verify-locales/contentCategories';
import type LocalePath from '@util/verify-locales/LocalePath';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import type Log from '@util/verify-locales/Log';
import TutorialSchema, {
    getDefaultTutorial,
} from '@util/verify-locales/TutorialSchema';
import Validator from '@util/verify-locales/Validator';
import getTranslator from '@util/verify-locales/getTranslator';
import { Performances } from '../../tutorial/Performances';
import {
    DEFAULT_TUTORIAL_MODE,
    type TutorialMode,
} from '../../tutorial/TutorialMode';
import type Tutorial from '../../tutorial/Tutorial';
import {
    isPerformance,
    parsePerformance,
    type Dialog,
    type Performance,
} from '../../tutorial/Tutorial';


/** Load, validate, and check the tutorial, and optionally translate. */
export async function verifyTutorial(
    log: Log,
    locale: LocaleText,
    tutorial: Tutorial,
    translate: boolean,
    override: boolean,
    /** When true (fix/translate), apply concept-link repairs to the tutorial;
     *  when false (verify), report each repairable link as an error instead of
     *  silently rewriting the file, so verify stays read-only. */
    repair: boolean,
    /** Optional act/scene scope (1-based) to narrow the translation pass to
     *  (e.g. `+tutorial:2/3`). Verification still runs over everything; empty
     *  or undefined = translate the whole tutorial. */
    targets?: TutorialTarget[],
    /** Which tutorial this is, so checks can compare against the same default tutorial. */
    mode: TutorialMode = DEFAULT_TUTORIAL_MODE,
): Promise<Tutorial | undefined> {
    const validate = Validator.compile(TutorialSchema);
    const valid = validate(tutorial);
    if (!valid && validate.errors) {
        log.bad(2, "Tutorial doesn't match the schema.");
        for (const error of validate.errors) {
            if (error.message)
                log.bad(3, `${error.instancePath}: ${error.message}`);
        }
    }

    // Verify and (when repairing) fix the tutorial.
    tutorial = await checkTutorial(log, locale, tutorial as Tutorial, mode, repair);

    // Translate if requested.
    if (translate)
        tutorial = await translateTutorial(log, tutorial, override, targets);

    return tutorial;
}

/** Whether a tutorial path falls under one of the act/scene targets (1-based).
 *  Empty targets = include everything. */
function pathInTutorialTargets(
    path: LocalePath,
    targets: TutorialTarget[],
): boolean {
    if (targets.length === 0) return true;
    const actAt = path.path.indexOf('acts');
    const act = actAt > -1 ? path.path[actAt + 1] : undefined;
    if (typeof act !== 'number') return false;
    const sceneAt = path.path.indexOf('scenes');
    const scene =
        sceneAt > -1 && typeof path.path[sceneAt + 1] === 'number'
            ? (path.path[sceneAt + 1] as number) + 1
            : undefined;
    return targets.some((t) => tutorialTargetMatches(act + 1, scene, t));
}

/** The concept links in a dialog's text. */
function extractConceptLinks(line: Dialog): ConceptLink[] {
    return parseDoc(
        toTokens(DOCS_SYMBOL + line.slice(2).join('\n\n') + DOCS_SYMBOL),
    )
        .nodes()
        .filter((node: Node): node is ConceptLink => node instanceof ConceptLink);
}

/** All the names by which properties of the named concept can be referenced in the locale. */
function getValidProperties(locale: LocaleText, name: string): string[] {
    for (const section of [
        locale.node,
        locale.input,
        locale.output,
        locale.basis,
    ]) {
        const record: unknown = section;
        if (record === null || typeof record !== 'object' || !(name in record))
            continue;
        const entry = Object.entries(record).find(([key]) => key === name)?.[1];
        const names = getConceptPropertyNames(entry);
        // Basis concepts keep their functions in a nested object.
        const fn =
            entry !== null && typeof entry === 'object' && 'function' in entry
                ? entry.function
                : undefined;
        return [...names, ...getConceptPropertyNames(fn)];
    }
    return [];
}

/** Attempt to repair a mangled tutorial concept link name (e.g. `Boolean.andુલિયન`, where
 * translation glued text onto a property name). Returns the repaired name, or undefined
 * if there's no confident repair. */
export function repairConceptName(
    name: string,
    /** Names of the links at the same position in the default tutorial. */
    defaultNames: string[],
    /** All valid property names for the link's concept in this locale. */
    validProperties: string[],
): string | undefined {
    const concept = ConceptLink.parse(name);
    if (!(concept instanceof ConceptName) || concept.property === undefined)
        return undefined;
    const property = concept.property;
    // Prefer the property that the default tutorial's dialog references at the same
    // position, if exactly one of its links is on the same concept.
    const defaultProperties = new Set(
        defaultNames
            .map((defaultName) => ConceptLink.parse(defaultName))
            .filter(
                (parsed): parsed is ConceptName =>
                    parsed instanceof ConceptName &&
                    parsed.name === concept.name &&
                    parsed.property !== undefined,
            )
            .map((parsed) => parsed.property),
    );
    if (defaultProperties.size === 1)
        return `${concept.name}.${[...defaultProperties][0]}`;
    // Otherwise, if the property starts with a valid property name, truncate to the
    // longest such name.
    const prefix = validProperties
        .filter((valid) => valid.length > 0 && property.startsWith(valid))
        .sort((a, b) => b.length - a.length)[0];
    return prefix !== undefined && prefix !== property
        ? `${concept.name}.${prefix}`
        : undefined;
}

async function checkTutorial(
    log: Log,
    locale: LocaleText,
    original: Tutorial,
    mode: TutorialMode,
    /** Apply repairs (fix/translate) vs. only report them (verify). */
    repair: boolean,
): Promise<Tutorial> {
    let revised = JSON.parse(JSON.stringify(original)) as Tutorial;

    // Every performance in the tutorial: act/scene defaults plus any performance lines.
    const performances: Performance[] = revised.acts.flatMap((act) => [
        act.performance,
        ...act.scenes.map((scene) => scene.performance),
        ...act.scenes.flatMap((scene) => scene.lines).filter(isPerformance),
    ]);

    for (const performance of performances) {
        const parsed = parsePerformance(performance);
        // A program expected to have conflicts isn't analyzed.
        if (parsed.conflicts) continue;

        let code: string | undefined = undefined;
        // A template reference resolves to its program; otherwise use the literal code.
        if (typeof parsed.code === 'string') code = parsed.code;
        else {
            const fun = (
                Performances as Record<
                    string,
                    ((...input: string[]) => string) | undefined
                >
            )[parsed.code.name];
            if (fun === undefined)
                log.bad(
                    2,
                    `#${parsed.code.name} doesn't exist in Performances. Is it misspelled or missing?`,
                );
            else code = fun(...parsed.code.inputs);
        }
        if (code) {
            const result = analyzeCode(code, locale);
            if (result.error)
                log.bad(
                    2,
                    `Unable to create project and check for conflicts tutorial code: ${code}.\n${result.error}`,
                );
            else if (result.conflicts.length > 0)
                log.bad(
                    2,
                    `Found conflicts ${result.conflicts.join(',')} in program: ${code.substring(0, 100)}...`,
                );
        }
    }

    // Check every dialog's concept links, repairing mangled ones from the default
    // tutorial's links at the same position when possible (translation sometimes
    // glues text onto a link's property or translates it entirely).
    const defaultTutorial = getDefaultTutorial(mode);
    revised.acts.forEach((act, actIndex) =>
        act.scenes.forEach((scene, sceneIndex) =>
            scene.lines.forEach((line, lineIndex) => {
                // Keep dialog lines (arrays); performances are objects, pauses are null.
                if (!Array.isArray(line)) return;
                const repairs: [string, string][] = [];
                for (const link of extractConceptLinks(line)) {
                    if (link.isValid(locale)) continue;
                    const defaultLine =
                        defaultTutorial.acts[actIndex]?.scenes[sceneIndex]
                            ?.lines[lineIndex];
                    const defaultNames = Array.isArray(defaultLine)
                        ? extractConceptLinks(defaultLine).map((l) =>
                              l.getName(),
                          )
                        : [];
                    const parsed = ConceptLink.parse(link.getName());
                    const repaired = repairConceptName(
                        link.getName(),
                        defaultNames,
                        parsed instanceof ConceptName
                            ? getValidProperties(locale, parsed.name)
                            : [],
                    );
                    if (repaired !== undefined)
                        repairs.push([link.getName(), repaired]);
                    else
                        log.bad(
                            2,
                            `Unknown tutorial concept: ${link.getName()}, found in ${line}`,
                        );
                }
                if (repairs.length > 0) {
                    // In verify mode, report the mangled links as errors instead
                    // of rewriting the file, so verify stays read-only and fails
                    // until someone runs the fix.
                    if (!repair) {
                        for (const [from, to] of repairs)
                            log.bad(
                                2,
                                `Tutorial concept @${from} should be @${to}. Run "npm run locales-fix" to repair.`,
                            );
                        return;
                    }
                    scene.lines[lineIndex] = [
                        line[0],
                        line[1],
                        ...line
                            .slice(2)
                            .map((text) =>
                                repairs.reduce(
                                    (revisedText, [from, to]) =>
                                        revisedText.replaceAll(
                                            LINK_SYMBOL + from,
                                            LINK_SYMBOL + to,
                                        ),
                                    text,
                                ),
                            ),
                    ];
                    for (const [from, to] of repairs)
                        log.good(
                            2,
                            `Repaired tutorial concept @${from} → @${to}`,
                        );
                }
            }),
        ),
    );

    const pairs = getTranslatableTutorialPairs(revised);

    const automated = pairs.filter(({ value }) =>
        typeof value === 'string'
            ? isMachineTranslated(value)
            : value.some((s) => isMachineTranslated(s)),
    );

    if (automated.length > 0)
        log.warning(
            2,
            `Tutorial: ${automated.length} machine translated ("${MachineTranslated}") strings to review.`,
        );

    // Unwritten ("$?") strings fall back to English at runtime. Fail in CI so
    // they never reach production — they should be machine translated first.
    const unwritten = pairs.filter(({ value }) =>
        typeof value === 'string'
            ? isUnwritten(value)
            : value.some((s) => isUnwritten(s)),
    );

    if (unwritten.length > 0)
        log.bad(
            2,
            `Tutorial: ${unwritten.length} unwritten ("${Unwritten}") string(s) would fall back to English. Run "npm run locales-translate" to fill them.`,
        );

    return revised;
}

/** Create a copy of the default (en-US) tutorial for a mode, with all dialog marked unwritten */
export function createUnwrittenTutorial(
    mode: TutorialMode = DEFAULT_TUTORIAL_MODE,
): Tutorial {
    // Deep copy default tutorial for this mode
    let tutorial = JSON.parse(
        JSON.stringify(getDefaultTutorial(mode)),
    ) as Tutorial;

    // Find the translatable pairs
    const pairs = getTranslatableTutorialPairs(tutorial);

    // Mark all dialog as unwritten
    for (const pair of pairs) pair.repair(tutorial, Unwritten + pair.value);

    // Return the unwritten tutorial
    return tutorial;
}

/** Given a source tutorial and a current target tutorial, translate untranslated tutorial text. */
async function translateTutorial(
    log: Log,
    tutorial: Tutorial,
    override: boolean,
    targets: TutorialTarget[] = [],
): Promise<Tutorial> {
    // Get the key/value pairs to translate, narrowed to the requested act/scene
    // scope (if any).
    let pairs: LocalePath[] = getTranslatableTutorialPairs(tutorial).filter(
        (path) => pathInTutorialTargets(path, targets),
    );

    const unwritten = pairs.filter(({ value }) =>
        typeof value === 'string'
            ? isUnwritten(value) || (override && isMachineTranslated(value))
            : value.some(
                  (s) => isUnwritten(s) || (override && isMachineTranslated(s)),
              ),
    );

    if (unwritten.length === 0) return tutorial;

    // Copy the target tutorial so we can revise it.
    const revised = JSON.parse(JSON.stringify(tutorial)) as Tutorial;

    // Extract the strings to translate. Strip ALL annotation markers (not just
    // $?), because the tutorial resolves from the target — which already carries
    // $~ on machine-translated strings — so without this an override run would
    // re-mark an already-marked string and accumulate markers ($~$~$~…).
    const sourceStrings = unwritten
        .map((path) => {
            const match = path.resolve(tutorial);
            return match === undefined || Array.isArray(match)
                ? undefined
                : withoutAnnotations(match);
        })
        .filter((s) => s !== undefined)
        .flat();

    // See if the region of the target language is supported and append it if so.
    const translator = getTranslator();
    const targetLocale = await translator.getTargetLocale(
        tutorial.language,
        tutorial.regions,
    );
    const sourceLocale = 'en-US';

    log.say(
        2,
        `Translating ${unwritten.length} unwritten strings ("${Unwritten}")...`,
    );

    const translations = await translator.translate(
        log,
        sourceStrings,
        sourceLocale,
        targetLocale,
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

        // A string at index ≥ 2 of a dialog line (a Dialog is an array; performances are objects, so
        // their code/template strings are never reached here). Translate these.
        const linesIndex = path.path.indexOf('lines');

        // If this is a line value, and the next key is an index into its list of lines and the current key is 2, the dialog, then translate it.
        if (
            linesIndex > -1 &&
            typeof path.path[linesIndex + 1] === 'number' &&
            typeof path.key === 'number' &&
            path.key >= 2
        ) {
            const parent = path.parent().resolve(tutorial);
            if (Array.isArray(parent)) return true;
        }

        return false;
    });
}
