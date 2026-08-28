import { MachineTranslated, Revised, Unwritten } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import {
    isMachineTranslated,
    isRevised,
    isUnwritten,
    toLocaleString,
} from '@locale/LocaleText';
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
import { retargetTutorialExamples } from '@util/verify-locales/retargetExampleNames';
import type Log from '@util/verify-locales/Log';
import TutorialSchema, {
    getDefaultTutorial,
} from '@util/verify-locales/TutorialSchema';
import {
    mismatchedDelimiter,
    unclosedInCode,
} from '@util/verify-locales/protect';
import Validator from '@util/verify-locales/Validator';
import { alignTutorialLines } from '@util/verify-locales/syncTutorialStructure';
import getTranslator from '@util/verify-locales/getTranslator';
import { TranslationFailedAdvice } from '@util/verify-locales/getTranslator';
import type Translator from '@util/verify-locales/Translator';
import { Performances, performanceSource } from '../../tutorial/Performances';
import { Themes, themeSource } from '../../tutorial/Themes';
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
    /** The run's shared translation backend, so its caches (localized examples)
     *  and usage accounting span the whole locale run. Undefined = the
     *  env-selected backend, constructed on demand. */
    translator?: Translator,
): Promise<Tutorial | undefined> {
    const validate = Validator.compile(TutorialSchema);
    const valid = validate(tutorial);
    if (!valid && validate.errors) {
        const schema = log.bad("Tutorial doesn't match the schema.");
        for (const error of validate.errors) {
            if (error.message)
                schema.bad(`${error.instancePath}: ${error.message}`);
        }
    }

    // A tutorial must say it is the locale it lives in. This is the field the translator reads to
    // decide what language to translate *into* — so when hi-IN's tutorial declared `en`/`US`,
    // every run asked for English-to-English and dutifully handed the English back. The strings
    // came out marked `$~`, which reads as "translated, awaiting review", so nothing anywhere
    // reported that a whole locale's tutorial had never been translated at all.
    const declared = `${tutorial.language}-${tutorial.regions[0] ?? ''}`;
    const expected = toLocaleString(locale);
    if (tutorial.language !== locale.language)
        log.bad(
            `This tutorial says it is written in "${declared}", but it is ${expected}'s. The translator reads this to pick the target language, so it would translate ${expected} into ${declared}. Fix "language" and "regions".`,
        );

    // Verify and (when repairing) fix the tutorial.
    tutorial = await checkTutorial(
        log,
        locale,
        tutorial as Tutorial,
        mode,
        repair,
    );

    // Translate if requested.
    if (translate)
        tutorial = await translateTutorial(
            log,
            locale,
            tutorial,
            override,
            targets,
            mode,
            translator,
        );

    // What's still unwritten once everything that was going to run has run.
    reportUnwritten(log, tutorial);

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
        .filter(
            (node: Node): node is ConceptLink => node instanceof ConceptLink,
        );
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

/**
 * Whether a tutorial string is waiting on the translator.
 *
 * `$!` counts as well as `$?`, matching what locale docs do (verifyLocale's
 * `isQueued`) and what this file's own link check already assumes when deciding
 * whether a broken link warns or fails. They disagreed before: marking tutorial
 * lines `$!` produced a clean run across every locale that translated none of
 * them and reported that nowhere. `$!` is also the marker an author meets
 * first, since it's the one the locale-doc workflow documents (#1264).
 *
 * `$~` is machine-translated and already written, so it's only retranslated
 * when a run explicitly overrides.
 */
export function queuedForTranslation(text: string, override: boolean): boolean {
    return (
        isUnwritten(text) ||
        isRevised(text) ||
        (override && isMachineTranslated(text))
    );
}

/**
 * Whether a cleanly dropped `\…\` pair should fail the run rather than warn.
 *
 * It is real damage — the reader is told to "just use `\+\`" and the `+` isn't
 * there — but ~170 dialog strings across 26 locales are in that state today,
 * and each needs a re-translation to repair, so failing on them would make
 * every run red with no cheap fix. The breakages that *do* fail (an orphaned
 * delimiter, an unclosed literal) are a set small enough to repair in one
 * sitting. Flip this once the rest have been re-translated.
 */
const DelimiterDriftIsFatal = false;

export type DialogDelimiterProblem = {
    /** Which paragraph of the line: always ≥ 2, since 0 and 1 are the character
     *  and emotion rather than text. */
    index: number;
    kind: 'orphan' | 'unclosed' | 'drift';
    /** The mismatched delimiter's display form, for `orphan` and `drift`. */
    delimiter?: string;
    severity: 'error' | 'warning';
};

const countBackslashes = (text: string) => (text.match(/\\/g) ?? []).length;

/**
 * Compare a dialog line's example delimiters against its en-US source.
 *
 * Locale docs have had this check since machine translation started dropping
 * delimiters (`verifyLocale`'s `mismatchedDelimiter` call), but tutorial dialog
 * never got it, so a translator that prose-ified an example away — rendering
 * "just use `\+\`" with no `+` in it — produced a clean run. That is how ~190
 * dialog lines across 26 locales quietly lost their teaching examples.
 *
 * Three outcomes, because they need different answers:
 *
 * - **orphan**: the source's `\` count is even and the translation's is odd, so
 *   an example is left unclosed and the markup parser swallows the rest of the
 *   line. Requiring the parity *flip* rather than any mismatch is deliberate:
 *   en-US itself ships one unclosed example, and a locale that dropped or fixed
 *   it is an improvement, not a defect to report.
 * - **unclosed**: a `\code\` segment ends inside an open text literal. The `\`
 *   counts still match, so `mismatchedDelimiter` structurally cannot see it.
 * - **drift**: any other count difference — usually a whole `\…\` pair rewritten
 *   into prose.
 */
export function findDialogDelimiterProblems(
    source: Dialog,
    translation: Dialog,
): DialogDelimiterProblem[] {
    // A line whose paragraph count differs is structural drift, which
    // `syncTutorialStructure` already reports and repairs. Comparing those
    // per-index compares unrelated sentences and invents delimiter problems for
    // a missing-paragraph one.
    if (source.length !== translation.length) return [];

    const problems: DialogDelimiterProblem[] = [];
    for (let index = 2; index < translation.length; index++) {
        const sourceText = source[index];
        const translationText = translation[index];
        if (
            typeof sourceText !== 'string' ||
            typeof translationText !== 'string'
        )
            continue;
        const before = withoutAnnotations(sourceText);
        const after = withoutAnnotations(translationText);

        // An error unless the string is still queued for the translator, which
        // is the same line verifyLocale's docs draw: `$~` is written content and
        // must be correct, while `$?`/`$!` are acknowledged debt. Unlike a
        // mangled concept link — which the pipeline reproduces every run, so
        // failing on it fails work nobody can fix — a delimiter break is already
        // prevented at translate time, so every `$~` case is stale damage that
        // re-translating provably repairs.
        const severity = queuedForTranslation(translationText, false)
            ? 'warning'
            : 'error';

        const mismatched = mismatchedDelimiter(before, after);
        if (
            mismatched !== undefined &&
            countBackslashes(before) % 2 === 0 &&
            countBackslashes(after) % 2 === 1
        )
            problems.push({
                index,
                kind: 'orphan',
                delimiter: mismatched,
                severity,
            });
        else if (!unclosedInCode(before) && unclosedInCode(after))
            problems.push({ index, kind: 'unclosed', severity });
        else if (mismatched !== undefined)
            problems.push({
                index,
                kind: 'drift',
                delimiter: mismatched,
                severity: DelimiterDriftIsFatal ? severity : 'warning',
            });
    }
    return problems;
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
        if (
            typeof parsed.code !== 'string' &&
            !(parsed.code.name in Performances)
        )
            log.bad(
                `#${parsed.code.name} doesn't exist in Performances. Is it misspelled or missing?`,
            );
        // A template reference resolves to its program; otherwise use the literal code. Resolved
        // with the card's theme in it, since the themed program is the one that actually runs —
        // checking the unthemed one would leave the composition unverified.
        else
            code = performanceSource(
                parsed.code,
                parsed.theme === undefined
                    ? undefined
                    : themeSource(Themes[parsed.theme]),
            );
        if (code) {
            const result = analyzeCode(code, locale);
            if (result.error)
                log.bad(
                    `Unable to create project and check for conflicts tutorial code: ${code}.\n${result.error}`,
                );
            else if (result.conflicts.length > 0)
                log.bad(
                    `Found conflicts ${result.conflicts.join(',')} in program: ${code.substring(0, 100)}...`,
                );
        }
    }

    // Check every dialog's concept links, repairing mangled ones from the default
    // tutorial's links at the same position when possible (translation sometimes
    // glues text onto a link's property or translates it entirely).
    const defaultTutorial = getDefaultTutorial(mode);
    // Which en-US line each of this tutorial's lines corresponds to. Positional indexing was wrong
    // whenever a locale was a scene or a line short of en-US — and one has been since "Patterns"
    // landed. Comparing act 6 scene 6 against a different lesson's dialog doesn't just fail to
    // repair: the fallback below rewrites a link from the English at that index whenever the link
    // counts happen to match, so a correct translation gets replaced with a stranger's concept.
    const counterparts = alignTutorialLines(defaultTutorial, revised);
    // Bring every dialog example's named inputs back in line with the names this locale
    // declares. A stored example spells names that live in the locale file, not here, so
    // re-translating one of those names strands every example that used it (#1323).
    const exampleNames = retargetTutorialExamples(
        revised,
        defaultTutorial,
        locale,
        repair,
    );
    revised.acts.forEach((act, actIndex) =>
        act.scenes.forEach((scene, sceneIndex) =>
            scene.lines.forEach((line, lineIndex) => {
                // Keep dialog lines (arrays); performances are objects, pauses are null.
                if (!Array.isArray(line)) return;
                const repairs: [string, string][] = [];
                const lineLinks = extractConceptLinks(line);
                const defaultLine = counterparts.get(line);

                // Did translation drop, orphan, or leave open one of this
                // line's `\…\` examples? Compared against the aligned en-US
                // line rather than the same index in the default tutorial:
                // verify runs don't apply the structure sync, so a drifted
                // locale would otherwise be measured against a different lesson.
                if (Array.isArray(defaultLine))
                    for (const problem of findDialogDelimiterProblems(
                        defaultLine,
                        line,
                    )) {
                        const scope = `act ${actIndex + 1} scene ${sceneIndex + 1}`;
                        const where = `${scope}, line ${lineIndex}[${problem.index}] of ${toLocaleString(locale)}`;
                        const what =
                            problem.kind === 'unclosed'
                                ? 'An example left a text literal open'
                                : `${problem.kind === 'orphan' ? 'An orphaned' : 'A mismatched'} ${problem.delimiter} delimiter (differs from en-US)`;
                        // Name the repair in the message: the scope selector is
                        // what makes re-translating this one scene cheap.
                        const message = `${what} in ${where}: "${withoutAnnotations(String(line[problem.index])).substring(0, 50)}...". Repair with "npm run locales-translate ${toLocaleString(locale)} +tutorial:${actIndex + 1}/${sceneIndex + 1}".`;
                        if (problem.severity === 'warning')
                            log.warning(message);
                        else log.bad(message);

                        // Queue the broken string so the translate pass that
                        // follows this check repairs it in the same run. Only
                        // the failing kinds, and only machine-translated text:
                        // marking drift would silently spend a translation
                        // budget nobody asked for, and a hand-written string is
                        // someone's own text to fix.
                        if (
                            repair &&
                            problem.severity === 'error' &&
                            isMachineTranslated(String(line[problem.index]))
                        ) {
                            line[problem.index] =
                                Revised +
                                String(line[problem.index]).slice(
                                    MachineTranslated.length,
                                );
                            log.good(
                                `Queued a delimiter-broken line for re-translation in ${where}`,
                            );
                        }
                    }

                const defaultLinks = Array.isArray(defaultLine)
                    ? extractConceptLinks(defaultLine)
                    : [];
                const defaultNames = defaultLinks.map((l) => l.getName());
                lineLinks.forEach((link, linkIndex) => {
                    // `isValid` alone isn't enough: it accepts anything that
                    // parses as a character reference, because a creator's
                    // characters aren't known at check time. A translated
                    // concept name (`@Блоцк`, `@Grupy`) parses as exactly that —
                    // a username with no character after it — so it slipped
                    // through here while rendering as the unknown-character
                    // glyph. `isBroken` is the check that catches those (#1245),
                    // and it's the same one locale docs and how-tos use.
                    if (link.isValid(locale) && !link.isBroken(locale)) return;
                    const parsed = ConceptLink.parse(link.getName());
                    const repaired =
                        repairConceptName(
                            link.getName(),
                            defaultNames,
                            parsed instanceof ConceptName
                                ? getValidProperties(locale, parsed.name)
                                : [],
                        ) ??
                        // `repairConceptName` only mends a mangled *property*. A
                        // wholly translated name (`@Grupy` for `@Group`) has no
                        // property to work from, so fall back to position: when
                        // the line kept the same number of links as its English
                        // source, the one at this index is the concept the
                        // sentence is about. Guarded on the candidate resolving
                        // here, so a broken English link can't be copied in.
                        (defaultLinks.length === lineLinks.length &&
                        defaultLinks[linkIndex] !== undefined &&
                        defaultLinks[linkIndex].isValid(locale) &&
                        !defaultLinks[linkIndex].isBroken(locale)
                            ? defaultLinks[linkIndex].getName()
                            : undefined);
                    if (repaired !== undefined)
                        repairs.push([link.getName(), repaired]);
                    else {
                        // Hand-authored dialog must never carry a broken link, so
                        // that's a hard error. Machine-translated or queued dialog
                        // is provisional: the translator rewrites concept names
                        // (`@Program` → `@Програм`) because nothing constrains it to
                        // leave them alone, and re-running it reproduces the same
                        // damage. That's a pipeline defect rather than a mistake
                        // anyone made in this file — surface it every run, but don't
                        // fail on work only a fixed translator can repair. Same
                        // policy buildHowTos applies to flattened examples.
                        const provisional = line
                            .slice(2)
                            .some(
                                (text) =>
                                    typeof text === 'string' &&
                                    (isRevised(text) ||
                                        isUnwritten(text) ||
                                        isMachineTranslated(text)),
                            );
                        const message = `Unknown tutorial concept: ${link.getName()}, found in ${line}`;
                        if (provisional) log.warning(message);
                        else log.bad(message);
                    }
                });
                if (repairs.length > 0) {
                    // In verify mode, report the mangled links as errors instead
                    // of rewriting the file, so verify stays read-only and fails
                    // until someone runs the fix.
                    if (!repair) {
                        for (const [from, to] of repairs)
                            log.bad(
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
                        log.good(`Repaired tutorial concept @${from} → @${to}`);
                }
            }),
        ),
    );

    if (exampleNames.renamed > 0)
        log[repair ? 'good' : 'warning'](
            repair
                ? `Renamed ${exampleNames.renamed} input(s) in this tutorial's examples to the name this locale declares.`
                : `${exampleNames.renamed} input(s) in this tutorial's examples don't use the name this locale declares. Run "npm run locales-fix" to retarget them.`,
        );
    if (exampleNames.refused > 0)
        log.warning(
            `Left ${exampleNames.refused} tutorial example(s) alone: retargeting them would have introduced a conflict.`,
        );
    if (exampleNames.divergent > 0)
        log.warning(
            `${exampleNames.divergent} tutorial example(s) no longer have the same shape as their en-US source, so their names can't be retargeted.`,
        );

    const pairs = getTranslatableTutorialPairs(revised);

    const automated = pairs.filter(({ value }) =>
        typeof value === 'string'
            ? isMachineTranslated(value)
            : value.some((s) => isMachineTranslated(s)),
    );

    if (automated.length > 0)
        log.warning(
            `${automated.length} machine translated ("${MachineTranslated}") strings to review.`,
        );

    return revised;
}

/**
 * Report strings that would still fall back to English, and fail the run.
 *
 * Counted *after* any translation, not before — the same order `verifyLocale`
 * has always used. Reporting first meant a translate run announced every string
 * it was about to fill as an error and then filled it, so `start.ts` set a
 * non-zero exit for work that had entirely succeeded. The batch board read that
 * exit code and summarized 21 finished locales as "0 ok, 21 failed", which is
 * exactly backwards on the one command whose whole job is to fix this.
 */
function reportUnwritten(log: Log, tutorial: Tutorial): void {
    const unwritten = getTranslatableTutorialPairs(tutorial).filter(
        ({ value }) =>
            typeof value === 'string'
                ? isUnwritten(value)
                : value.some((s) => isUnwritten(s)),
    );

    if (unwritten.length > 0)
        log.bad(
            `${unwritten.length} unwritten ("${Unwritten}") string(s) would fall back to English. Run "npm run locales-translate" to fill them.`,
        );
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

/**
 * Given a source tutorial and a current target tutorial, translate untranslated tutorial text.
 *
 * The English to translate comes from en-US, falling back to whatever the target holds. That
 * matters because a locale never has to carry a copy of the English: an unwritten string falls
 * back to the source at runtime, so a bare `$?` is the correct and minimal way to say "nobody has
 * written this yet". Reading the text from the target alone made that representation
 * untranslatable — `withoutAnnotations('$?')` is the empty string, so the translator was handed
 * nothing, returned nothing, and the string stayed `$?` on every future run.
 */
async function translateTutorial(
    log: Log,
    /** The tutorial's locale text, passed to the backend as the target so the
     *  tutorial shares the locale run's system prompt (one cache entry, not
     *  two) and the locale's own `guidance` conventions apply here too. */
    localeText: LocaleText,
    tutorial: Tutorial,
    override: boolean,
    targets: TutorialTarget[] = [],
    mode: TutorialMode = DEFAULT_TUTORIAL_MODE,
    translator: Translator = getTranslator(),
): Promise<Tutorial> {
    // Get the key/value pairs to translate, narrowed to the requested act/scene
    // scope (if any).
    let pairs: LocalePath[] = getTranslatableTutorialPairs(tutorial).filter(
        (path) => pathInTutorialTargets(path, targets),
    );

    const unwritten = pairs.filter(({ value }) =>
        typeof value === 'string'
            ? queuedForTranslation(value, override)
            : value.some((s) => queuedForTranslation(s, override)),
    );

    if (unwritten.length === 0) return tutorial;

    // Copy the target tutorial so we can revise it.
    const revised = JSON.parse(JSON.stringify(tutorial)) as Tutorial;

    // Extract the strings to translate, preferring en-US's text over the target's. Strip ALL
    // annotation markers (not just $?) from whichever we use, because the target already carries
    // $~ on machine-translated strings — so without this an override run would re-mark an
    // already-marked string and accumulate markers ($~$~$~…).
    const source = getDefaultTutorial(mode);
    const sourceStrings = unwritten
        .map((path) => {
            const english = path.resolve(source);
            const match =
                typeof english === 'string' &&
                withoutAnnotations(english) !== ''
                    ? english
                    : path.resolve(tutorial);
            return match === undefined || Array.isArray(match)
                ? undefined
                : withoutAnnotations(match);
        })
        .filter((s) => s !== undefined)
        .flat();

    // See if the region of the target language is supported and append it if so.
    const targetLocale = await translator.getTargetLocale(
        tutorial.language,
        tutorial.regions,
    );
    const sourceLocale = 'en-US';

    const translating = log.pending(
        `Translating ${unwritten.length} unwritten strings ("${Unwritten}")`,
    );

    const translations = await translator.translate(
        translating,
        sourceStrings,
        sourceLocale,
        targetLocale,
        localeText,
    );

    if (translations === undefined) {
        translating.bad(TranslationFailedAdvice);
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
