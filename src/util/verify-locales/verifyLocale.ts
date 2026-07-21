import { MachineTranslated, Revised, Unwritten } from '@locale/Annotations';
import { concretizeOrUndefined } from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import type LocaleText from '@locale/LocaleText';
import {
    isMachineTranslated,
    isRevised,
    isUnwritten,
    parseLocaleDoc,
    toDocString,
    toLocaleString,
} from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import ConceptLink from '@nodes/ConceptLink';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import { toTokens } from '@parser/toTokens';
import analyzeCode from '@util/verify-locales/analyzeCode';
import checkGlobalNames from '@util/verify-locales/checkGlobalNames';
import checkNames from '@util/verify-locales/checkNames';
import checkStringArrays from '@util/verify-locales/checkStringArrays';
import classifyLocalePath, {
    classifyPair,
    isNameTextPath,
} from '@util/verify-locales/classifyLocalePath';
import getDocExamples from '@util/verify-locales/docExamples';
import LocalePath, {
    getKeyTemplatePairs,
} from '@util/verify-locales/LocalePath';
import { LocaleValidator } from '@util/verify-locales/LocaleSchema';
import type Log from '@util/verify-locales/Log';
import {
    mismatchedDelimiter,
    splitDocParagraphs,
} from '@util/verify-locales/protect';
import type { RevisedString } from '@util/verify-locales/start';
import {
    checkTemplateInputs,
    getDeclaredInputs,
} from '@util/verify-locales/templateInputs';
import getTranslator from '@util/verify-locales/getTranslator';
import type Translator from '@util/verify-locales/Translator';
import toValidName from '@util/verify-locales/toValidName';

/** Create a copy of the default tutorial with all dialog marked unwritten */
export function createUnwrittenLocale(): LocaleText {
    // Deep copy default tutorial
    let locale = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;

    // Find the translatable pairs
    const pairs = getCheckableLocalePairs(locale);

    // Mark all strings as unwritten. A markup array is one document with a
    // single write-status, on the first element only.
    for (const pair of pairs)
        pair.repair(
            locale,
            Array.isArray(pair.value)
                ? classifyPair(pair) === 'markup'
                    ? pair.value.map((s, index) =>
                          index === 0 ? Unwritten + s : s,
                      )
                    : pair.value.map((s) => Unwritten + s)
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
                pair.key === 'regions' ||
                // Guidance is original per-locale content written in the
                // locale's own language, not a translation of the English, so
                // it's never machine translated and never counted unwritten.
                pair.key === 'guidance')
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
    /** Optional predicate to narrow which paths get translated (e.g. a
     *  `+locale:<prefix>` scope). Verification still runs over everything;
     *  only the translation pass is filtered. Undefined = translate all. */
    localeFilter?: (path: LocalePath) => boolean,
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

    // Check the array-kind contracts (positional lengths, markup paragraph
    // breaks) and name validity before the doc-parse checks and translation
    // below, so fix-mode repairs land first.
    revisedText = checkStringArrays(log, DefaultLocale, revisedText, fix);
    revisedText = checkNames(log, DefaultLocale, revisedText, fix);

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
        localeFilter,
    );

    return [revisedText, JSON.stringify(revisedText) !== JSON.stringify(text)];
}

// Whether to (re)machine-translate this string: it's unwritten ($?), explicitly marked Revised ($!)
// to force a per-string re-translation from en-US, or machine-translated ($~) and we're overriding.
function shouldStringBeMachineTranslated(
    text: string,
    override: boolean,
): boolean {
    if (isUnwritten(text)) return true;
    if (isRevised(text)) return true;
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
    /** Optional predicate to narrow which paths get translated; see verifyLocale. */
    localeFilter?: (path: LocalePath) => boolean,
): Promise<LocaleText> {
    // Make a copy of the original to modify.
    let revised = JSON.parse(JSON.stringify(original)) as LocaleText;

    // If we're translating, find every unwritten/revised string the user
    // wants Google Translate to fill in, then dispatch a batch request. In
    // verify-only mode we skip this entire walk + filter — it produces a
    // list nothing reads. Saves a second tree traversal of every locale.
    if (translate && warnUnwritten) {
        const pairsToTranslate = getCheckableLocalePairs(revised)
            // Narrow to the requested locale-path scope, if any (+locale:<prefix>).
            .filter((path) => localeFilter === undefined || localeFilter(path))
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

    // Two distinct global shares (output types, input streams, sequences) must not share a name.
    checkGlobalNames(log, revised);

    // Check every pair for errors.
    const pairs = getKeyTemplatePairs(revised);

    // Check each one.
    for (const path of pairs) {
        // If the key suggests that it's documentation, try to parse it as a doc and
        // see if it has any tokens of unknown type or unparsable expressions or types.
        if (path.key === 'doc') {
            const docString = toDocString(path.value);

            // A doc explicitly queued for re-translation ($! Revised) gets warnings,
            // not hard failures, for delimiter/conflict problems — acknowledged debt
            // the next translate pass regenerates. Everything else must be clean.
            const docValue = path.value;
            const queued =
                typeof docValue === 'string'
                    ? isRevised(docValue)
                    : docValue.some((s) => isRevised(s));

            // A code (`\…\`) or formatted (`` `…` ``) delimiter the translation
            // dropped or duplicated (vs the en-US source) breaks tokenization
            // silently — the markup parser skips the malformed example, so it never
            // renders (and only surfaces later when the embedded code is parsed, e.g.
            // building a basis type). Count against the source so examples with a
            // legitimately odd count (external examples, a literal `\`) aren't false
            // positives. This is a hard failure: a dropped/added delimiter is broken
            // output, not stylistic. (`preserveBalancedDelimiters` keeps the
            // translator from shipping one; this catches any introduced by another
            // path, and refuses to let it through.)
            const enValue = path.resolve(DefaultLocale);
            if (enValue !== undefined) {
                const mismatched = mismatchedDelimiter(
                    toDocString(enValue),
                    docString,
                );
                if (mismatched !== undefined) {
                    const message = `Mismatched ${mismatched} delimiter at ${path.toString()} (differs from en-US) in ${docString.substring(0, 50)}...`;
                    if (queued) log.warning(2, message);
                    else log.bad(2, message);
                }
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

            // Analyze each inline code example for conflicts — the markup analogue of a tutorial's
            // `conflicts: true`. We parse the real Example nodes via getDocExamples (so markup
            // constructs like italic `/` and `…`, which parse to unparsables outside a code context,
            // don't produce false positives), and skip examples annotated 🪲 (expected to have
            // conflicts: deliberate type errors, bare-symbol illustrations). Every other example
            // must analyze cleanly, in every locale.
            // A conflict in an example is a hard error — unless the doc is queued for
            // re-translation ($! Revised, computed above): those surface as a warning
            // and are left for the translator to regenerate from en-US. Deliberate
            // per-string opt-out, not a blanket pass on machine-translated content.
            const report = (message: string) =>
                queued ? log.warning(2, message) : log.bad(2, message);
            for (const example of getDocExamples(docString)) {
                if (example.expectsDefect) continue;
                const result = analyzeCode(example.code, revised);
                if (result.error)
                    report(
                        `Unable to analyze example at ${path.toString()}: "${example.code}".\n${result.error}`,
                    );
                else if (result.conflicts.length > 0)
                    report(
                        `Found conflicts (${result.conflicts.join(
                            ', ',
                        )}) in example "${example.code}" at ${path.toString()}. Fix it, mark it 🪲 if intended, or mark the string "${Revised}" to queue it for re-translation.`,
                    );
            }
        }
        // Is one or more names? Single-token validity is checked (and repaired)
        // in checkNames for every NameText-typed field; here, only make sure no
        // other locale uses a global name for a different global.
        else if (path.key === 'names') {
            const names = Array.isArray(path.value) ? path.value : [path.value];
            for (const name of names) {
                const nameWithoutPlaceholder = withoutAnnotations(name);
                if (nameWithoutPlaceholder.length === 0) continue;
                if (path.isGlobalName()) {
                    const existing =
                        globalNames
                            .get(nameWithoutPlaceholder)
                            ?.filter(
                                (p) =>
                                    p.locale !== toLocaleString(original) &&
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

export async function translateLocale(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    unwritten: LocalePath[],
    /** Accumulator for paths whose translation succeeded; see verifyLocale. */
    translatedPaths?: Set<string>,
    /** Injectable backend; defaults to the env-selected one. Tests pass a stub to
     *  observe the translate-call ordering without hitting a real API. */
    translator: Translator = getTranslator(),
) {
    const revised = JSON.parse(JSON.stringify(target)) as LocaleText;

    // Strip Unwritten/Revised prefixes so the translator doesn't see them as
    // part of the input (e.g. "$!duplicate" coming back with the marker embedded).
    const stripMarkers = (s: string) =>
        s.replace(Unwritten, '').replace(Revised, '');

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
        // A markup ([formatted]) array is one logical document whose items are
        // paragraphs (an editing convenience, see toDocString) → translate
        // atomically as one joined string so the translator can organize
        // paragraphs naturally for the target language. Other arrays (names,
        // tips, …) are distinct items, translated per element.
        const sourceStrings = paths.flatMap((path) => {
            const match = path.resolve(source);
            if (match === undefined) return [];
            if (Array.isArray(match))
                return classifyPair(path) === 'markup'
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
                if (classifyPair(path) === 'markup') {
                    // Atomic doc: one translation for the whole block; split back
                    // into paragraphs at blank lines outside `\…\` examples, so the
                    // paragraph count may legitimately differ from en-US but no
                    // element carries an embedded break. On a null result, keep the
                    // source unwritten per original element.
                    const translation = translations.shift();
                    if (translation != null && translation.trim().length > 0) {
                        // The doc has one write-status, on the first element only.
                        const parts = splitDocParagraphs(translation).map(
                            (p, index) =>
                                index === 0 ? `${MachineTranslated}${p}` : p,
                        );
                        if (parts.length > 0) {
                            path.repair(revised, parts);
                            translatedPaths?.add(path.toString());
                        }
                    } else {
                        path.repair(
                            revised,
                            match.map((s, index) =>
                                index === 0
                                    ? `${Unwritten}${stripMarkers(s)}`
                                    : stripMarkers(s),
                            ),
                        );
                    }
                } else {
                    // Only identifier fields (NameText-typed) get folded into
                    // valid names; display labels tagged [name] keep their spaces.
                    const nameify = isNameTextPath([...path.path, path.key]);
                    const value: string[] = [];
                    let wroteAny = false;
                    for (let count = 0; count < match.length; count++) {
                        const next = translations.shift();
                        if (next != null) {
                            const t = nameify ? toValidName(next) : next;
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
                    const t = isNameTextPath([...path.path, path.key])
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

    // Phase 2 is itself split so that construct names (NameText) are translated
    // and written into `revised` BEFORE the docs that embed `\code\` examples.
    // The example localizer retargets library references (e.g. @Phrase) by reading
    // each construct's name from the target locale text it's handed; if names and
    // example-docs were translated together, the localizer would see the pre-
    // translation placeholder names and bake the wrong (soon-nonexistent) names
    // into examples, producing UnknownName conflicts.
    const namePaths = rest.filter((p) => isNameTextPath([...p.path, p.key]));
    const otherPaths = rest.filter((p) => !isNameTextPath([...p.path, p.key]));

    // Phase 2a: construct names first, with the now-translated glossary supplied.
    if (namePaths.length > 0)
        log.say(2, `Translating ${namePaths.length} construct names first…`);
    if (!(await apply(namePaths, revised))) return revised;
    // Phase 2b: everything else, now that `revised` carries the localized names, so
    // embedded examples retarget their library references to those names.
    if (otherPaths.length > 0)
        log.say(2, `Translating ${otherPaths.length} remaining strings…`);
    await apply(otherPaths, revised);

    return revised;
}

export function removeExtraKeys(
    log: Log,
    source: Record<string, unknown>,
    target: Record<string, unknown>,
    /** Path from the locale root to `target`, for classifying arrays. */
    segments: (string | number)[] = [],
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
                    [...segments, key],
                );
            // If they are arrays, go through them and remove any extra keys.
            else if (
                Array.isArray(targetValue) &&
                Array.isArray(sourceValue) &&
                key !== 'regions'
            ) {
                // Markup and name arrays legitimately vary in length per locale
                // (paragraphs and aliases respectively), so never clamp them to
                // the source length; only positional ('plain') arrays must match.
                if (
                    targetValue.every((v) => typeof v === 'string') &&
                    classifyLocalePath([...segments, key]) !== 'plain'
                )
                    continue;
                for (let index = 0; index < targetValue.length; index++) {
                    const sourceValueElement = sourceValue[index];
                    if (sourceValueElement === undefined) {
                        targetValue[index] = undefined;
                    } else
                        removeExtraKeys(
                            log,
                            sourceValueElement,
                            targetValue[index],
                            [...segments, key, index],
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
    /** Path from the locale root to `target`, for classifying arrays. */
    segments: (string | number)[] = [],
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
                        [...segments, key],
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
                        [...segments, key],
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
                                [...segments, key, index],
                            );
                    }
                } else {
                    log.bad(
                        2,
                        `Target has the key ${key}, but it's not an array. Repair manually.`,
                    );
                }
            } else if (
                // Only positional ('plain') arrays are padded to the source
                // length; markup and name arrays legitimately vary per locale.
                key !== 'regions' &&
                Array.isArray(sourceValue) &&
                sourceValue.every((s) => typeof s === 'string') &&
                classifyLocalePath([...segments, key]) === 'plain'
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
