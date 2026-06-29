import Project from '@db/projects/Project';
import { MachineTranslated, Unwritten } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import { isMachineTranslated, isUnwritten } from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import ConceptLink from '@nodes/ConceptLink';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import { DOCS_SYMBOL } from '@parser/Symbols';
import parseDoc from '@parser/parseDoc';
import { toTokens } from '@parser/toTokens';
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

/**
 * Cache of tutorial code conflict-analysis results, keyed by the snippet's
 * source code. Tutorial snippets are overwhelmingly shared across locales
 * (94%+ dedup ratio across all 26 locales) — translators don't change the
 * code, only the surrounding dialog. Without this cache the verifier would
 * re-run `Project.analyze` ~7,600 times per pass; with it, ~430.
 *
 * The cached value is the analysis output, not the Project — Projects are
 * heavy and we don't need them after extracting conflicts.
 */
type AnalyzeResult = { conflicts: string[]; error: string | undefined };
const analyzeCache = new Map<string, AnalyzeResult>();

function analyzeTutorialCode(code: string, locale: LocaleText): AnalyzeResult {
    const cached = analyzeCache.get(code);
    if (cached) return cached;
    let result: AnalyzeResult;
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
        result = {
            conflicts: Array.from(project.getConflictedNodes().values())
                .flat()
                .map((c) => c.toString()),
            error: undefined,
        };
    } catch (error) {
        result = { conflicts: [], error: String(error) };
    }
    analyzeCache.set(code, result);
    return result;
}

/** Load, validate, and check the tutorial, and optionally translate. */
export async function verifyTutorial(
    log: Log,
    locale: LocaleText,
    tutorial: Tutorial,
    translate: boolean,
    override: boolean,
    /** Optional act/scene scope (1-based) to narrow the translation pass to
     *  (e.g. `+tutorial:2/3`). Verification still runs over everything; empty
     *  or undefined = translate the whole tutorial. */
    targets?: TutorialTarget[],
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

    // Verify and repair the tutorial.
    tutorial = await checkTutorial(log, locale, tutorial as Tutorial);

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

async function checkTutorial(
    log: Log,
    locale: LocaleText,
    original: Tutorial,
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
            const result = analyzeTutorialCode(code, locale);
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

    // Build a list of all concept links
    const conceptLinks: { dialog: Dialog; link: ConceptLink }[] = revised.acts
        .map((act) => [
            // Across all scenes
            ...act.scenes
                // Across all lines
                .map((scene) => scene.lines)
                // Flatten them into a list of lines
                .flat()
                // Keep dialog lines (arrays); performances are objects, pauses are null.
                .filter((line): line is Dialog => Array.isArray(line))
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
