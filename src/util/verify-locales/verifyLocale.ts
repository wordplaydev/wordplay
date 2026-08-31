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
import checkDocContent from '@util/verify-locales/checkDocContent';
import checkGlobalNames from '@util/verify-locales/checkGlobalNames';
import checkGlossaryForms from '@util/verify-locales/checkGlossaryForms';
import checkExampleNames from '@util/verify-locales/checkExampleNames';
import checkPointedNames from '@util/verify-locales/checkPointedNames';
import checkTypedInputNames from '@util/verify-locales/checkTypedInputNames';
import checkDegenerateNames from '@util/verify-locales/checkDegenerateNames';
import checkNames from '@util/verify-locales/checkNames';
import checkOperatorKeywords from '@util/verify-locales/checkOperatorKeywords';
import checkRedundantNames from '@util/verify-locales/checkRedundantNames';
import checkAnnotations from '@util/verify-locales/checkAnnotations';
import checkStringArrays from '@util/verify-locales/checkStringArrays';
import checkTerms from '@util/verify-locales/checkTerms';
import checkExampleDocs from '@util/verify-locales/checkExampleDocs';
import checkUntranslated from '@util/verify-locales/checkUntranslated';
import classifyLocalePath, {
    classifyPair,
    isEmotionPath,
    isGlossaryFormsPath,
    isNameTextPath,
} from '@util/verify-locales/classifyLocalePath';
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
import checkDetachedBranches from '@util/verify-locales/checkDetachedBranches';
import checkSingleArmBranches from '@util/verify-locales/checkSingleArmBranches';
import {
    checkPluralBranches,
    checkTemplateInputs,
    getDeclaredInputs,
    resolveTerms,
    withoutCountMarker,
} from '@util/verify-locales/templateInputs';
import { getPluralCategories, getPluralCount } from '@locale/plurals';
import getTranslator from '@util/verify-locales/getTranslator';
import { TranslationFailedAdvice } from '@util/verify-locales/getTranslator';
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
        // An emotion identifier is from a closed set, not prose. Keyed off the
        // `[emotion]` tag, never the key name: `ui.localize.emotion` is a
        // `[plain]` ARIA label that happens to share it.
        if (isEmotionPath([...pair.path, pair.key])) return false;

        // Top level declaration? Skip it.
        if (
            pair.top() &&
            (pair.key === '$schema' ||
                pair.key === 'language' ||
                pair.key === 'regions' ||
                // Guidance is original per-locale content written in the
                // locale's own language, not a translation of the English, so
                // it's never machine translated and never counted unwritten.
                pair.key === 'guidance' ||
                // Terms are a per-locale word list with locale-chosen keys, not
                // a translation of en-US, so — like guidance — they're never
                // machine translated or counted unwritten. checkTerms validates
                // them separately.
                pair.key === 'terms')
        )
            return false;

        // A glossary term's forms are that locale's own written forms of the
        // word, not a translation of en-US's — so, like `terms` and `guidance`,
        // never machine translated and never counted unwritten.
        if (isGlossaryFormsPath([...pair.path, pair.key])) return false;

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
    /** The run's shared translation backend, so its caches (localized examples,
     *  locale texts) and usage accounting span the whole locale run rather than
     *  one call. Undefined = the env-selected backend, constructed on demand. */
    translator?: Translator,
    /** Called with a complete, valid locale partway through translation so the
     *  caller can persist progress; see `CHECKPOINT_PATHS`. */
    checkpoint?: (partial: LocaleText) => Promise<void>,
): Promise<[LocaleText, boolean]> {
    let revisedText: LocaleText = text;
    const valid = LocaleValidator(text);
    if (!valid && LocaleValidator.errors) {
        const schema = log.bad("Locale doesn't match the schema.");
        for (const error of LocaleValidator.errors) {
            if (error.message)
                schema.bad(`${error.instancePath}: ${error.message}`);
        }

        if (fix) revisedText = repairLocale(log, DefaultLocale, revisedText);
    }

    // Check the array-kind contracts (positional lengths, markup paragraph
    // breaks) and name validity before the doc-parse checks and translation
    // below, so fix-mode repairs land first.
    revisedText = checkStringArrays(log, DefaultLocale, revisedText, fix);
    revisedText = checkAnnotations(log, revisedText, fix);
    revisedText = checkNames(log, DefaultLocale, revisedText, fix);
    // After checkNames, which only asks whether a name is a single token — a garbled one has
    // no spaces, so it passes there. Before checkRedundantNames, so a garbled copy of an
    // en-US symbol is gone before the array is judged for what it still repeats.
    if (locale !== 'en-US')
        revisedText = checkDegenerateNames(
            log,
            DefaultLocale,
            revisedText,
            fix,
        );
    // After checkNames, so a name repaired to its en-US value is recognized as the duplicate
    // it now is rather than surviving until the next run.
    if (locale !== 'en-US')
        revisedText = checkRedundantNames(log, DefaultLocale, revisedText, fix);

    // Prose that is still the English and says so nowhere. Never en-US, whose every
    // string is identical to itself. Before the translation pass below, so the `$?`
    // this marks is honored by the same run.
    if (locale !== 'en-US')
        revisedText = checkUntranslated(log, DefaultLocale, revisedText, fix);

    // The same question of an example's own documentation, which is localized
    // by translateProjectContent rather than by the markup splitter and so is
    // invisible to every whole-string comparison.
    if (locale !== 'en-US') checkExampleDocs(log, DefaultLocale, revisedText);

    // After checkRedundantNames, so an alias this check adds isn't judged (and
    // possibly removed) as an en-US duplicate in the same run.
    revisedText = checkOperatorKeywords(log, DefaultLocale, revisedText, fix);

    // Validate the per-locale word list: key shape, no collision with template
    // input names, and no term-in-term references.
    checkTerms(log, revisedText);

    // Validate the per-locale glossary forms: no collisions with words, ids, or
    // concept names, and nothing unreferenceable.
    revisedText = checkGlossaryForms(log, revisedText, fix);

    // Vowel points first: they change names, and everything below reads names. Hebrew is
    // written without them and nobody types them into code, so a pointed name is an
    // identifier no creator can enter.
    if (locale !== 'en-US')
        revisedText = checkPointedNames(log, revisedText, fix);

    // Then the type/input agreement, which reads the names the strip just settled.
    if (locale !== 'en-US')
        revisedText = checkTypedInputNames(
            log,
            DefaultLocale,
            revisedText,
            fix,
        );

    // After the name checks above, so an example is retargeted to the name this run settled
    // on rather than one about to be repaired, and before the doc checks below, so the
    // conflict check analyzes the retargeted example rather than the stale one. Applied on a
    // translate run too, not just `fix`: translating is when names change, so it is exactly
    // the run whose examples would otherwise be left naming the old word.
    if (locale !== 'en-US')
        revisedText = checkExampleNames(
            log,
            DefaultLocale,
            revisedText,
            fix || translate,
        );

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
        translator,
        checkpoint,
    );

    // Again, because `checkLocale` is where this run's own name translations land: a name
    // Phase 2a rewrote strands every already-translated example that spelled the old word,
    // and leaving that to the next run is what made the divergence look permanent. Costs one
    // pass over the examples, and only on a run that could have changed a name.
    if (translate && locale !== 'en-US')
        revisedText = checkExampleNames(log, DefaultLocale, revisedText, true);

    return [revisedText, JSON.stringify(revisedText) !== JSON.stringify(text)];
}

// Whether to (re)machine-translate this string: it's unwritten ($?), explicitly marked Revised ($!)
// to force a per-string re-translation from en-US, or machine-translated ($~) and we're overriding.
// Exported because this is what makes a checkpoint durable: a saved string carries $~, so a re-run
// skips it and pays only for what is still $?.
export function shouldStringBeMachineTranslated(
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
    /** The run's shared translation backend; see verifyLocale. */
    translator?: Translator,
    /** Persist partial progress during translation; see verifyLocale. */
    checkpoint?: (partial: LocaleText) => Promise<void>,
): Promise<LocaleText> {
    // Make a copy of the original to modify.
    let revised = JSON.parse(JSON.stringify(original)) as LocaleText;

    // This locale's word list, and its keys, so a `$term` reference both resolves
    // to its phrase and isn't flagged as an unknown input while checking below.
    const terms = revised.terms ?? {};
    const termKeys = new Set(Object.keys(terms));

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
            // Don't translate emotions; those are identifiers from a closed
            // set. Keyed off the `[emotion]` tag, never the key name — see
            // `isEmotionPath`.
            .filter((path) => !isEmotionPath([...path.path, path.key]))
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
            // Which elements of a non-markup array still need translation. A
            // path is selected when ANY element is queued, but the other
            // elements may hold good translations — re-sending them re-bills
            // and replaces them with fresh machine output for nothing. A path
            // reset by an en-US `$!` re-translates every element, since the
            // source's meaning changed for all of them.
            const revisedPathStrings = new Set(
                revisedStrings.map((rev) => rev.path.toString()),
            );
            const itemNeedsTranslation = (
                path: LocalePath,
                existing: string | undefined,
            ): boolean =>
                existing === undefined ||
                revisedPathStrings.has(path.toString()) ||
                shouldStringBeMachineTranslated(existing, override);
            // Progress, not an error: logging this as bad() counted an error and
            // so exited non-zero, which made every successfully translated locale
            // report as failed in the batch runner's summary. The strings here are
            // unwritten ($?) or revised ($!), not just unwritten.
            revised = await translateLocale(
                log.scope(
                    `Translating ${pairsToTranslate.length} unwritten or revised strings`,
                ),
                DefaultLocale,
                revised,
                pairsToTranslate,
                translatedPaths,
                translator,
                itemNeedsTranslation,
                checkpoint,
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
            // An unwritten ($?) doc is a placeholder, not a translation, so its
            // delimiter count has nothing to match against; treat it like queued
            // debt rather than failing every locale the moment a new doc key
            // with a `\…\` example lands in en-US.
            const isQueued = (s: string) => isRevised(s) || isUnwritten(s);
            const anyQueued = (value: unknown): boolean =>
                typeof value === 'string'
                    ? isQueued(value)
                    : Array.isArray(value)
                      ? value.some(
                            (item) =>
                                typeof item === 'string' && isQueued(item),
                        )
                      : false;
            // The en-US source counts too. A `$!` there re-translates every
            // sibling at this path (see the revisedStrings filter in
            // checkLocale), so the moment an example is added to an en-US doc,
            // every locale's count legitimately differs until that pass runs.
            // Reading only the locale's own status made adding one example a
            // hard failure in all 29, curable only by marking each locale by
            // hand — which then mislabels a machine translation as revised.
            const queued =
                anyQueued(docValue) || anyQueued(path.resolve(DefaultLocale));

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
                    if (queued) log.warning(message);
                    else log.bad(message);
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
                    `Found unknown concept name ${path.toString()}: ${missingConcepts
                        .map((u) => u.toWordplay())
                        .join(', ')}`,
                );

            // Broken references and example conflicts, from the same rules
            // how-tos are held to — see checkDocContent. The check above can't
            // catch a broken reference: `isValid` accepts them as possible
            // character references, and its uppercase filter hid the lowercase
            // ones besides (#1245).
            // A problem here is a hard error — unless the doc is queued for
            // re-translation ($! Revised, computed above): those surface as a
            // warning and are left for the translator to regenerate from en-US.
            // Deliberate per-string opt-out, not a blanket pass on machine
            // translated content.
            const report = (message: string) =>
                queued ? log.warning(message) : log.bad(message);
            for (const problem of checkDocContent(docString, revised)) {
                if (problem.kind === 'references')
                    report(
                        `Found reference(s) that can't resolve at ${path.toString()}: ${problem.links.join(
                            ', ',
                        )}. A concept or glossary reference must be written exactly as in en-US; a character reference needs a username and a name (@user/character).`,
                    );
                else if (problem.kind === 'unanalyzable')
                    report(
                        `Unable to analyze example at ${path.toString()}: "${problem.example.code}".\n${problem.error}`,
                    );
                else
                    report(
                        `Found conflicts (${problem.conflicts.join(
                            ', ',
                        )}) in example "${problem.example.code}" at ${path.toString()}. Fix it, mark it 🪲 if intended, or mark the string "${Revised}" to queue it for re-translation.`,
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
            const inputs: Record<string, string | number> = {};
            for (const name of declaredNames)
                // A count's placeholder is a number, so a `$#name[…]` branch
                // selects a real plural form during this validation pass.
                inputs[withoutCountMarker(name)] = name.startsWith('#')
                    ? 1
                    : 'test';
            // Expand this locale's `$term` word-list references first, as the
            // runtime does. `DefaultLocales` is en-US, whose `terms` can't
            // resolve a term defined only in this locale, which would leave an
            // unresolvable mention and make the whole template read as
            // unparsable (#1284).
            const description = concretizeOrUndefined(
                DefaultLocales,
                resolveTerms(path.value, terms),
                inputs,
            );
            if (description === undefined)
                log.bad(
                    `String at ${path.toString()} has an unparsable template string "${
                        path.value
                    }"`,
                );

            // A branch detached from its mention parses as literal text, and
            // the template then fails outright when that input is undefined.
            // Concretizing above can't catch it — every input is defined here.
            const detached = checkDetachedBranches(path.value);
            if (detached.length > 0)
                log.bad(
                    `Template at ${path.toString()} has ${detached.map((d) => `"${d}"`).join(', ')} — remove the space so the branch attaches to its mention: "${path.value}"`,
                );

            // A presence branch missing its second arm has nothing to select
            // when the input is undefined, which also fails outright. Invisible
            // above for the same reason: every input is defined here.
            const singleArmed = checkSingleArmBranches(path.value);
            if (singleArmed.length > 0)
                log.bad(
                    `Template at ${path.toString()} has ${singleArmed.map((b) => `"${b}"`).join(', ')} — add the missing arm (e.g. "|") so the branch has something to select when the input is undefined: "${path.value}"`,
                );

            // For Template<Names>-typed fields, the generated schema lists
            // the declared input names. Verify that the template references
            // every declared name (and nothing else of the old `$N` syntax).
            const inputCheck = checkTemplateInputs(
                path.toString(),
                path.value,
                termKeys,
            );
            if (inputCheck) {
                if (inputCheck.numeric.length > 0)
                    log.bad(
                        `Template at ${path.toString()} uses old positional refs ${inputCheck.numeric.map((n) => `$${n}`).join(', ')} — use named refs: "${path.value}"`,
                    );
                if (inputCheck.unused.length > 0)
                    log.bad(
                        `Template at ${path.toString()} does not reference declared inputs ${inputCheck.unused.map((n) => `$${n}`).join(', ')}: "${path.value}"`,
                    );
                if (inputCheck.unknown.length > 0)
                    log.bad(
                        `Template at ${path.toString()} references unknown inputs ${inputCheck.unknown.map((n) => `$${n}`).join(', ')} (not declared, not terminology): "${path.value}"`,
                    );
            }

            // A count input must select a plural form, with exactly one arm per
            // form THIS locale distinguishes — six for Arabic, one for Japanese.
            // Checked per locale, not against en-US, since the arity differs.
            const forms = getPluralCount(original.language);
            const pluralCheck = checkPluralBranches(
                path.toString(),
                path.value,
                forms,
            );
            if (pluralCheck) {
                for (const problem of pluralCheck.arity)
                    log.bad(
                        `Template at ${path.toString()} writes ${problem.found} plural form(s) for $#${problem.name}, but ${toLocaleString(original)} has ${problem.expected} (${getPluralCategories(original.language).join(', ')}): "${path.value}"`,
                    );
                if (pluralCheck.missing.length > 0)
                    log.bad(
                        `Template at ${path.toString()} mentions the count(s) ${pluralCheck.missing.map((n) => `$${n}`).join(', ')} without choosing a plural form — write $#${pluralCheck.missing[0]}[…] with ${forms} form(s): "${path.value}"`,
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
            `${automated.length} machine translated ("${MachineTranslated}") strings to review.`,
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
            `${unwritten.length} unwritten ("${Unwritten}") string(s) would fall back to English. Run "npm run locales-translate" to fill them: ${unwritten
                .slice(0, 10)
                .map((p) => p.toString())
                .join(', ')}${unwritten.length > 10 ? ', …' : ''}`,
        );

    return revised;
}

/** Drop the markers a source string carries before it is sent for translation. */
export function stripMarkers(text: string): string {
    return text.replace(Unwritten, '').replace(Revised, '');
}

/**
 * What to write when the translator couldn't produce a translation.
 *
 * A string that already had one keeps it, re-queued with `$!`: it is stale, not
 * missing, and overwriting it with English takes the reader's language away in
 * order to say so. That only became the common case once drift detection began
 * re-translating existing strings (#1144) — before, this path was reached almost
 * only for strings never translated at all, and it silently replaced 20 real
 * translations with English the first time a drift-marked run failed. A string
 * with nothing to keep still becomes `$?` plus the English source, which falls
 * back to English anyway and fails the unwritten gate loudly.
 */
export function keepOrPlacehold(
    existing: string | undefined,
    english: string,
): string {
    const kept =
        existing === undefined ? '' : withoutAnnotations(existing).trim();
    return kept.length === 0
        ? `${Unwritten}${stripMarkers(english)}`
        : `${Revised}${kept}`;
}

/** Add missing keys and remove extra ones from a given locale, relative to a source locale. */
function repairLocale(
    log: Log,
    source: LocaleText,
    target: LocaleText,
): LocaleText {
    const revised = JSON.parse(JSON.stringify(target)) as LocaleText;

    // A drifted locale emits one line per key, so group them — the whole repair
    // reads as one block rather than dozens of loose siblings.
    const structure = log.scope('Structure');

    // Walk through the source and find any keys that are not defined on the target and remove them.
    removeExtraKeys(structure, source, revised);

    // Walk through the target and find any keys that are not defined on the source and add them.
    addMissingKeys(structure, source, revised);

    return revised;
}

/**
 * How many paths one slice of the bulk translation phase covers before the
 * caller's checkpoint runs.
 *
 * That phase is the long pole of a locale run — over an hour for a new one — and
 * it used to write nothing until it finished, so a process killed partway lost
 * every string it had paid for. Sliced this way it saves every few minutes, and
 * a saved string needs no other bookkeeping to be durable: it carries `$~`, which
 * `shouldStringBeMachineTranslated` skips, so a re-run pays only for what is
 * still `$?`. Each save re-serializes the whole locale (~1MB, a few hundred ms
 * through Prettier), which is why this isn't per chunk.
 */
export const CHECKPOINT_PATHS = 200;

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
    /** Which elements of a non-markup array to translate, given each element's
     *  current target value. A path is selected when ANY of its elements is
     *  queued, but its other elements may already hold good translations —
     *  re-sending those re-bills and replaces them for nothing. Undefined =
     *  every element (the caller has no per-element knowledge). Markup arrays
     *  are unaffected: they are one document translated atomically. */
    itemNeedsTranslation?: (
        path: LocalePath,
        existing: string | undefined,
    ) => boolean,
    /** Called with `revised` after each phase and each slice of the bulk phase,
     *  so a caller can write progress to disk; see `CHECKPOINT_PATHS`. */
    checkpoint?: (partial: LocaleText) => Promise<void>,
) {
    const revised = JSON.parse(JSON.stringify(target)) as LocaleText;

    // Which element indices of each non-markup array to send, memoized so the
    // request builder and the write-back below consume the translation stream
    // in lockstep — they must agree exactly on what was sent.
    const itemIndices = new Map<LocalePath, number[]>();
    const indicesFor = (path: LocalePath, match: string[]): number[] => {
        let indices = itemIndices.get(path);
        if (indices === undefined) {
            const existing = path.resolve(revised);
            const existingItems = Array.isArray(existing)
                ? existing
                : undefined;
            indices = match
                .map((_, index) => index)
                .filter(
                    (index) =>
                        itemNeedsTranslation === undefined ||
                        itemNeedsTranslation(path, existingItems?.[index]),
                );
            itemIndices.set(path, indices);
        }
        return indices;
    };

    // Strip Unwritten/Revised prefixes so the translator doesn't see them as
    // part of the input (e.g. "$!duplicate" coming back with the marker embedded).

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
        /** The phase's logger, so the translator's progress nests under it. */
        phaseLog: Log,
        /** Passed through to the backend; `names` marks identifier phases and
         *  `glossary` marks the phase that translates the terms themselves. */
        options?: { names?: boolean; glossary?: boolean },
    ): Promise<boolean> => {
        // A markup ([formatted]) array is one logical document whose items are
        // paragraphs (an editing convenience, see toDocString) → translate
        // atomically as one joined string so the translator can organize
        // paragraphs naturally for the target language. Other arrays (names,
        // tips, …) are distinct items, translated per element — and only the
        // elements that still need it.
        const sourceStrings = paths.flatMap((path) => {
            const match = path.resolve(source);
            if (match === undefined) return [];
            if (Array.isArray(match))
                return classifyPair(path) === 'markup'
                    ? [match.map(stripMarkers).join('\n\n')]
                    : indicesFor(path, match).map((index) =>
                          stripMarkers(match[index]),
                      );
            return [stripMarkers(match)];
        });
        if (sourceStrings.length === 0) return true;

        const translations = await translator.translate(
            phaseLog,
            sourceStrings,
            toLocaleString(source),
            targetLocale,
            targetText,
            options,
        );
        if (translations === undefined) {
            phaseLog.bad(TranslationFailedAdvice);
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
                        const existing = path.resolve(revised);
                        const kept = Array.isArray(existing)
                            ? existing
                            : undefined;
                        path.repair(
                            revised,
                            kept === undefined
                                ? match.map((s, index) =>
                                      index === 0
                                          ? `${Unwritten}${stripMarkers(s)}`
                                          : stripMarkers(s),
                                  )
                                : kept.map((s, index) =>
                                      index === 0
                                          ? keepOrPlacehold(s, match[0] ?? '')
                                          : s,
                                  ),
                        );
                    }
                } else {
                    // Only identifier fields (NameText-typed) get folded into
                    // valid names; display labels tagged [name] keep their spaces.
                    const nameify = isNameTextPath([...path.path, path.key]);
                    const existing = path.resolve(revised);
                    const existingItems = Array.isArray(existing)
                        ? existing
                        : undefined;
                    const translated = new Set(indicesFor(path, match));
                    const value: string[] = [];
                    let wroteAny = false;
                    for (let count = 0; count < match.length; count++) {
                        // An element that wasn't sent keeps its existing
                        // translation verbatim, markers and all.
                        if (!translated.has(count)) {
                            const kept = existingItems?.[count];
                            value.push(
                                kept === undefined
                                    ? keepOrPlacehold(undefined, match[count])
                                    : kept,
                            );
                            continue;
                        }
                        const next = translations.shift();
                        if (next != null) {
                            const t = nameify ? toValidName(next) : next;
                            value.push(`${MachineTranslated}${t.trim()}`);
                            wroteAny = true;
                        } else {
                            value.push(
                                keepOrPlacehold(
                                    existingItems?.[count],
                                    match[count],
                                ),
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
                    const existing = path.resolve(revised);
                    path.repair(
                        revised,
                        keepOrPlacehold(
                            typeof existing === 'string' ? existing : undefined,
                            match,
                        ),
                    );
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

    // Each phase announces what it's about to do and owns everything the
    // translator reports while doing it, so a chunk failure lands under the
    // phase that asked for it rather than beside it.
    const phase = (
        label: string,
        paths: LocalePath[],
        targetText: LocaleText | undefined,
        options?: { names?: boolean; glossary?: boolean },
    ): Promise<boolean> =>
        paths.length === 0
            ? Promise.resolve(true)
            : apply(paths, targetText, log.pending(label), options);

    // Glossary words and construct names ride the backend's stronger model
    // (`names`): they are a sliver of the run's tokens, and a bad one is a
    // cross-locale name collision rather than an awkward sentence.
    if (
        !(await phase(
            `${glossaryWords.length} glossary terms`,
            glossaryWords,
            undefined,
            // `glossary` tells the backend these strings ARE the terms, so it can
            // ask for the sense each definition gives. Without it a bare "markup"
            // went to the financial sense in several locales ("marge", "Aufschlag").
            { names: true, glossary: true },
        ))
    )
        return revised;
    if (glossaryWords.length > 0) await checkpoint?.(revised);

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
    if (
        !(await phase(
            `${namePaths.length} construct names`,
            namePaths,
            revised,
            { names: true },
        ))
    )
        return revised;
    if (namePaths.length > 0) await checkpoint?.(revised);

    // Phase 2b: everything else, now that `revised` carries the localized names, so
    // embedded examples retarget their library references to those names.
    //
    // Sliced so the caller can persist progress as it goes. Slicing is only safe
    // because the slices partition `otherPaths`: `indicesFor` memoizes per path
    // and its first answer wins, so a path appearing in two slices would send one
    // set of array elements and write back another. Everything else `apply` needs
    // — the source strings and the `translations.shift()` write-back — is rebuilt
    // per call, so lockstep holds within a slice.
    const slices: LocalePath[][] = [];
    for (let index = 0; index < otherPaths.length; index += CHECKPOINT_PATHS)
        slices.push(otherPaths.slice(index, index + CHECKPOINT_PATHS));
    for (const [index, slice] of slices.entries()) {
        await phase(
            slices.length > 1
                ? `${slice.length} remaining strings (${index + 1}/${slices.length})`
                : `${slice.length} remaining strings`,
            slice,
            revised,
        );
        await checkpoint?.(revised);
    }

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
        // A locale may have forms for a term that en-US has none for, since each
        // locale decides which of its words need inflected forms.
        if (isGlossaryFormsPath([...segments, key])) continue;
        // Key not in the source? Delete it from the target.
        if (typeof source === 'object' && !(key in source)) {
            log.bad(`Removing extra key ${key}`);
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
        // Each locale writes its own glossary forms, so en-US having them is no
        // reason for a locale to have a placeholder list of them.
        if (isGlossaryFormsPath([...segments, key])) continue;
        // Key not in the the target? Add it.
        if (typeof target === 'object' && !(key in target)) {
            log.bad(`Adding missing key ${key}`);
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
