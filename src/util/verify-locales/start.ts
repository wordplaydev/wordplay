// Load .env.local (secrets) + .env (config) before anything reads process.env.
// Side-effect import kept first so it runs ahead of the others. See loadEnv.ts.
import '@util/verify-locales/loadEnv';
import type LanguageCode from '@locale/LanguageCode';
import type LocaleText from '@locale/LocaleText';
import {
    getLocaleLanguage,
    getLocaleRegions,
    isRevised,
    toLocaleString,
} from '@locale/LocaleText';
import type { RegionCode } from '@locale/Regions';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { KeywordIds } from '@parser/Keywords';
import ReservedSymbols from '@parser/ReservedSymbols';
import type LocalePath from '@util/verify-locales/LocalePath';
import {
    DefaultLocale,
    getLocaleJSON,
    getLocalePath,
    LocaleValidator,
} from '@util/verify-locales/LocaleSchema';
import {
    driftSince,
    getCheckablePathKinds,
    getDriftBase,
    getTutorialSources,
    markStale,
    readJSON,
    type Stale,
} from '@util/verify-locales/drift';
import Log from '@util/verify-locales/Log';
import {
    getDefaultTutorial,
    getTutorialJSON,
    getTutorialPath,
} from '@util/verify-locales/TutorialSchema';
import {
    describeReport,
    isEmptyReport,
    syncTutorialStructure,
} from '@util/verify-locales/syncTutorialStructure';
import { buildHowToBundle } from '@util/verify-locales/buildHowTos';
import { verifyHowTo } from '@util/verify-locales/verifyHowTo';
import {
    createUnwrittenLocale,
    getCheckableLocalePairs,
    verifyLocale,
} from '@util/verify-locales/verifyLocale';
import {
    createUnwrittenTutorial,
    verifyTutorial,
} from '@util/verify-locales/verifyTutorial';
import { findUnusedKeys } from '@util/verify-locales/findUnusedKeys';
import findUntaggedStrings from '@util/verify-locales/findUntaggedStrings';
import getTranslator from '@util/verify-locales/getTranslator';
import type Translator from '@util/verify-locales/Translator';
import {
    describeUsage,
    UsageLineMarker,
} from '@util/verify-locales/Translator';
import { TutorialModes, type TutorialMode } from '../../tutorial/TutorialMode';
import fs from 'fs';
import path from 'path';
import generateEmojisForLocale from '@util/verify-locales/generateEmojis';
import generateChoosePrompts from '@util/verify-locales/generateChoosePrompts';
import generateNameIndex from '@util/verify-locales/generateNameIndex';
import generateManifests from '@util/verify-locales/generateManifests';
import verifyDateTimes from '@util/verify-locales/verifyDateTimes';
import writeFormatted from '@util/verify-locales/writeFormatted';
import {
    localePrefixMatches,
    parseCategorySelection,
    type Selection,
} from '@util/verify-locales/contentCategories';

// We're we asked to translate? Let's see if there was a specific locale we're focusing on.
const TranslationRequested =
    process.argv[2] === 'translate' || process.argv[2] === 'override';
const OverrideMachineTranslations = process.argv[2] === 'override';
const FixRequested = process.argv[2] === 'fix';

/** Tutorial modes in the full translation pipeline (per-locale file creation + machine
 * translation + required by CI). All modes are translated so no tutorial falls back to English
 * in production; a mode here that lacks a per-locale file fails verification, and translate/override
 * creates and fills it. (A mode could be removed here to keep it en-US-only while its English is
 * refined.) */
const TranslatedTutorialModes: TutorialMode[] = [...TutorialModes];

// Make a logger so we can pretty print feedback. `verify` reports every error
// and then exits non-zero at the end of the run (see below) rather than failing
// fast on the first one, so a single run surfaces all problems.
const log = new Log(false);

// Now that we've defined all of the functionality, let's process requests.
if (
    process.argv.length < 3 ||
    !['fix', 'verify', 'translate', 'override'].includes(process.argv[2])
) {
    log.exit(
        'Please provide either "verify" (check structure, fail on invalid), "fix" (repair structure), "translate" (translate untranslated strings), "override" command (replace existing machine translations)',
    );
}

// If there are problems in the default locale, we can't verify or translate anything.
if (!LocaleValidator(DefaultLocale)) {
    const invalid = log.bad(
        'Default locale is invalid. It needs to be repaired before we can proceed.',
    );
    if (LocaleValidator.errors)
        for (const error of LocaleValidator.errors) {
            if (error.message)
                invalid.bad(`${error.instancePath}: ${error.message}`);
        }
    process.exit(1);
}

// Parse content-category targeting flags (+/-) from the args. Invalid syntax
// exits with a usage message. Only meaningful for translate/override; verify/ci
// pass no flags so the selection is "all" (a no-op).
const selectionResult = parseCategorySelection(process.argv.slice(3));
// log.exit returns `never`, so the error branch types as never → the whole
// expression is Selection (no reliance on flow-narrowing into the closure).
const selection: Selection =
    typeof selectionResult === 'string'
        ? log.exit(selectionResult)
        : selectionResult;

// The focal locale is the first positional that isn't a +/- category flag
// (so `translate -quick zh-CN` and `translate zh-CN -quick` both work).
const FocalLocale =
    process.argv.slice(3).find((arg) => !selection.flags.includes(arg)) ?? null;

// A path predicate for the `+locale:<prefix>` scope (empty = all locale strings).
const localePrefixes = selection.localePrefixes();
const localeFilter = (path: LocalePath): boolean =>
    localePrefixes.length === 0 ||
    localePrefixes.some((prefix) =>
        localePrefixMatches(path.toString(), prefix),
    );

const FocalLanguage = FocalLocale ? getLocaleLanguage(FocalLocale) : null;
const FocalRegion = FocalLocale
    ? (getLocaleRegions(FocalLocale)[0] as RegionCode)
    : null;

if (FocalLanguage === undefined)
    log.exit('Please provide a valid locale language code to translate');

log.say(
    TranslationRequested
        ? 'Verifying and translating ' + (FocalLocale ?? 'all locales')
        : 'Checking all locale files for problems',
);

// The translation backend must be chosen explicitly (no silent default), so a
// long run can't quietly use the wrong one. Validate and report it up front.
// One instance serves the whole run — the locale file, both tutorials, and
// every how-to — so its caches (localized examples, loaded locale texts) and
// its usage accounting span everything rather than one call.
let translator: Translator | undefined;
if (TranslationRequested) {
    try {
        translator = getTranslator();
        log.say(`Using the "${translator.id}" translation backend.`);
    } catch (error) {
        log.exit(error instanceof Error ? error.message : String(error));
    }
}

// Go through all of the locale directors and check the locale and tutorial files, repairing and optionally translating them.
const localeFolders = Array.from(
    fs.readdirSync(path.join('static', 'locales'), { withFileTypes: true }),
);

// Verify, repair, and translate a locale */
async function handleLocale(
    /** This locale's scope; each unit of work below opens its own under it. */
    localeLog: Log,
    localeText: LocaleText,
    revisedStrings: RevisedString[],
    localeIsNew: boolean,
    globals: Map<string, { locale: string; path: LocalePath }[]>,
    translatedPaths: Set<string>,
): Promise<LocaleText> {
    const locale = toLocaleString(localeText);

    // Validate, repair, and translate the locale file.
    const localeFileLog = localeLog.scope('Locale file');
    const [revisedLocale, localeChanged] = await verifyLocale(
        localeFileLog,
        locale,
        localeText as LocaleText,
        FixRequested,
        // Verification always runs; translate only if `locale` is in scope.
        TranslationRequested && selection.isIncluded('locale'),
        OverrideMachineTranslations,
        revisedStrings,
        globals,
        translatedPaths,
        localeFilter,
        translator,
        // Persist progress partway through translation. A new locale is over an
        // hour of paid work that used to reach disk only at the end, so a killed
        // run lost all of it; a checkpointed string carries `$~` and is skipped
        // on the next run, so what landed stays bought.
        async (partial) => {
            if (
                await writeFormatted(
                    getLocalePath(locale),
                    JSON.stringify(partial, null, 4),
                )
            )
                localeFileLog.good('Saved progress');
        },
    );

    // If the locale was revised, write the results (Prettier-formatted).
    if (localeChanged || localeIsNew) {
        localeFileLog.good('Saved repairs');
        await writeFormatted(
            getLocalePath(locale),
            JSON.stringify(revisedLocale, null, 4),
        );
    }

    // Verify (and, for translate-enabled modes, optionally translate) each tutorial mode's file.
    for (const mode of TutorialModes) {
        const modeLog = localeLog.scope(`${mode} tutorial`);

        // Modes not in the translation pipeline are still verified, but never created or translated
        // for non-en-US locales (see TranslatedTutorialModes).
        const modeTranslates = TranslatedTutorialModes.includes(mode);

        // See if there's a tutorial for this mode.
        let currentTutorial = getTutorialJSON(modeLog, locale, mode);

        // Remember whether we created one so we can write it below.
        let tutorialIsNew = false;
        // Set when something before verifyTutorial already changed the file (the structure sync).
        let tutorialChanged = false;

        // Validate, repair, and optionally translate the tutorial file.
        if (currentTutorial === undefined) {
            // A mode not yet in the translation pipeline is intentionally en-US-only for now, so
            // don't warn about or create per-locale files for it.
            if (modeTranslates) {
                // No translation requested? Just warn.
                if (!TranslationRequested)
                    modeLog.bad(`This locale doesn't have a tutorial file.`);
                // If a translation was requested and it was a valid langauge and region,
                // copy the default tutorial, mark all of its text unwritten, and then translate it.
                else if (FocalLanguage && FocalRegion) {
                    modeLog.pending(
                        'Creating a new tutorial for this locale based on en-US',
                    );
                    currentTutorial = createUnwrittenTutorial(mode);
                    currentTutorial.regions = [FocalRegion];
                    currentTutorial.language = FocalLanguage;
                    tutorialIsNew = true;
                }
            }
        }

        // The quick tutorial is its own category; every other mode is `tutorial`.
        const category = mode === 'quick' ? 'quick' : 'tutorial';
        const targets =
            mode === 'quick'
                ? selection.quickTargets()
                : selection.tutorialTargets();

        // Align this locale's tutorial to en-US's structure before verifying it. Everything that
        // reads a tutorial across locales indexes it positionally, and nothing else checks that two
        // locales agree on what is at a given index — which is how en-US's "Patterns" scene went
        // 28 locales unnoticed. Report-only under verify, applied under fix/translate, matching the
        // `repair` convention verifyTutorial already follows.
        if (currentTutorial && locale !== SourceLocale && !tutorialIsNew) {
            const { tutorial: synced, report } = syncTutorialStructure(
                getDefaultTutorial(mode),
                currentTutorial,
                // Propagating `$!` is a repair, not a translation: it records that en-US's meaning
                // moved so a later translate run knows to redo that string. Doing it only on
                // translate runs would mean an author who revises a line and runs `locales-fix`
                // leaves no trace of it anywhere, which is the gap that made `$!` a no-op for
                // tutorials in the first place.
                { propagateRevised: FixRequested || TranslationRequested },
            );
            if (!isEmptyReport(report)) {
                for (const line of describeReport(report))
                    modeLog.warning(line);
                if (FixRequested || TranslationRequested) {
                    currentTutorial = synced;
                    // The write below fires on `currentTutorial` differing from what verifyTutorial
                    // returns, which can't see a change made before it ran.
                    tutorialChanged = true;
                }
            }
        }

        // If there is a tutorial file, verify it, and optionally translate it.
        if (currentTutorial) {
            const revisedTutorial = await verifyTutorial(
                modeLog,
                revisedLocale,
                currentTutorial,
                // Verification always runs; only translate-enabled modes that are in scope are
                // machine-translated — and never the source locale, whose tutorial is the
                // hand-written original. Without that last guard, a `$!` mark on an en-US line
                // (which `queuedForTranslation` honors) would send the English to the translator
                // and overwrite it with `$~`-marked output. Mirrors verifyLocale's own guard.
                TranslationRequested &&
                    modeTranslates &&
                    locale !== SourceLocale &&
                    selection.isIncluded(category),
                OverrideMachineTranslations,
                // Only mutate the tutorial file in fix/translate runs; verify reports.
                FixRequested || TranslationRequested,
                targets,
                mode,
                translator,
                async (partial) => {
                    if (
                        await writeFormatted(
                            getTutorialPath(locale, mode),
                            JSON.stringify(partial, null, 4),
                        )
                    )
                        modeLog.good('Saved progress');
                },
            );

            // If the tutorial was revised, write the results (Prettier-formatted).
            if (
                tutorialIsNew ||
                tutorialChanged ||
                (revisedTutorial &&
                    JSON.stringify(currentTutorial) !==
                        JSON.stringify(revisedTutorial))
            ) {
                modeLog.good('Wrote revised tutorial');
                await writeFormatted(
                    getTutorialPath(locale, mode),
                    JSON.stringify(revisedTutorial, null, 4),
                );
            }
        }
    }

    // Verify and optionally translate how-to content (translate only if `howto`
    // is in scope, narrowed to any +howto:<id> targets).
    await verifyHowTo(
        localeLog.scope('How-tos'),
        locale,
        localeText.language,
        localeText.regions,
        TranslationRequested && selection.isIncluded('howto'),
        OverrideMachineTranslations,
        selection.howtoIds(),
        translator,
        // The revised locale, not the one loaded at startup: how-tos retarget
        // example references against names this run may have just translated.
        revisedLocale,
        FixRequested || TranslationRequested,
    );

    // Regenerate the per-locale how-to bundle the runtime loads. Only fix/translate
    // runs write it; verify reports a stale bundle instead of rewriting it.
    await buildHowToBundle(
        localeLog.scope('How-to bundle'),
        locale,
        FixRequested || TranslationRequested,
        localeText,
    );

    // Generate this locale's emoji translations as part of a translate/override
    // run, so a new/updated locale gets its `{locale}-emojis.json` without a
    // separate `npm run locales-emojis`. Best-effort: it does network I/O (CLDR),
    // so a failure is logged and the run continues rather than aborting.
    if (TranslationRequested && selection.isIncluded('emoji'))
        await generateEmojis(localeLog.scope('Emoji'), locale);

    // Verify this locale's date/time formatting data (generated from a pinned
    // CLDR JSON release; see generateDateTimes.ts). Runs in every mode so CI
    // catches missing, malformed, stale, or core-desynced data; fix runs and
    // translate/override runs (when `datetimes` is in scope) repair problems by
    // regenerating, which is deterministic and so always safe.
    await verifyDateTimes(
        localeLog.scope('Date/time'),
        locale,
        FixRequested ||
            (TranslationRequested && selection.isIncluded('datetimes')),
    );

    // Hand the revision back so the caller can keep its in-memory locale set
    // current: the artifact generators after the locale loop (names.json, choose
    // prompts, manifests) read that set, and building them from pre-repair text
    // left name-changing repairs out of the artifacts until a second run.
    return revisedLocale;
}

/** Generate this locale's emoji translations in-process. Best-effort — it does
 *  network I/O (CLDR), so a failure is logged and the run continues rather than
 *  aborting a translation run. */
async function generateEmojis(log: Log, locale: string): Promise<void> {
    log.pending('Generating emoji translations');
    try {
        const { used, matched, total } = await generateEmojisForLocale(locale);
        // Success and failure are the two outcomes of the pending line above,
        // so they're siblings of each other, not of it.
        log.good(
            `${matched}/${total} from CLDR ${used.join('+') || 'en (fallback)'}.`,
        );
    } catch (error) {
        log.warning(
            `Generation failed (${error}); keeping any existing emojis. Re-run "npm run locales-emojis" later.`,
        );
    }
}

// Build a database of all locales
const textByLocale: Record<string, LocaleText> = {};
for (const file of localeFolders) {
    if (
        file.isDirectory() &&
        (FocalLocale === null || file.name === FocalLocale)
    ) {
        const locale = file.name;

        // Get the currrent locale file in this directory.
        let localeText = getLocaleJSON(log, locale) as LocaleText;
        if (localeText === undefined) {
            // Not verifying a specific locale? Warn.
            if (FocalLocale === null) {
                // Exit non-zero: this reported an error and then exited 0, so a
                // missing locale passed CI silently.
                log.bad(
                    `Couldn't find locale ${locale}. Can't validate it, or it's tutorial.`,
                );
                process.exit(1);
            }
        } else {
            textByLocale[locale] = localeText;
        }
    }
}

const allLocaleText = Object.values(textByLocale);

log.good(
    `Found ${allLocaleText.length} locales: ${Object.keys(textByLocale).join(', ')}.`,
);

// Compute globals across all locales
const globals = new Map<string, { locale: string; path: LocalePath }[]>();
export type RevisedString = { path: LocalePath; locale: string; text: string };
let revisedStrings: RevisedString[] = [];

for (const localeText of allLocaleText) {
    for (const path of getCheckableLocalePairs(localeText)) {
        if (path.isGlobalName()) {
            const key = path.resolve(localeText);
            const names = (key ? (Array.isArray(key) ? key : [key]) : []).map(
                (name) => withoutAnnotations(name),
            );
            for (const name of names) {
                if (!globals.has(name)) globals.set(name, []);
                globals
                    .get(name)!
                    .push({ locale: toLocaleString(localeText), path });
            }
        }
    }
}

// The en-US source, which carries the `$!` Revised markers. A focal-locale run
// loads only that one locale (this is how batch.ts spawns each child), so
// scanning the loaded locales for the source would find nothing, leaving
// `revisedStrings` empty — and a sibling whose own strings are all `$~` then
// has nothing to translate, so the whole parallel run silently did nothing.
// Load the source directly instead of relying on it being in this run's set.
const SourceLocale = toLocaleString(DefaultLocale);
const sourceLocaleText: LocaleText | undefined =
    textByLocale[SourceLocale] ??
    (getLocaleJSON(log, SourceLocale) as LocaleText | undefined);

// Only en-US `$!` Revised markers propagate across all locales (a source revision should
// re-translate every sibling). A `$!` on a *translated* locale string is locale-specific —
// it re-translates just that string (via shouldStringBeMachineTranslated), not the path
// everywhere — so it isn't collected here.
if (sourceLocaleText !== undefined) {
    for (const path of getCheckableLocalePairs(sourceLocaleText)) {
        const value = path.resolve(sourceLocaleText);
        const revised = (
            value === undefined
                ? []
                : typeof value === 'string'
                  ? [value]
                  : value
        ).find((v) => isRevised(v));
        if (revised)
            revisedStrings.push({
                path,
                locale: SourceLocale,
                text: revised,
            });
    }
}

// Paths whose translation actually landed for at least one sibling this run.
// After the loop we strip the `$!` Revised marker from the en-US source at
// these paths so a future run doesn't redundantly re-translate them.
const translatedPaths = new Set<string>();

// Go through each locale, or the specific one of interest, and verify, repair, and optionally translate it.
// Keep the revised text, so the artifact generators below build from what was just written.
for (let index = 0; index < allLocaleText.length; index++) {
    const localeText = allLocaleText[index];
    allLocaleText[index] = await handleLocale(
        log.scope(`Checking ${toLocaleString(localeText)}`),
        localeText,
        revisedStrings,
        false,
        globals,
        translatedPaths,
    );
}

// If we translated successfully, drop the `$!` markers from the en-US source
// at paths that were actually re-translated. The marker's job is "tell the
// translator to redo this on the next run"; once redone, leaving it behind
// means the next run would needlessly re-translate the same strings (and
// the verifier would warn forever about stale "potentially out of date"
// entries). Paths whose translation failed in every sibling stay marked so
// the user can re-run later.
//
// Only a full run does this. A focal-locale run is how batch.ts spawns each of
// its children, and they run concurrently — several of them rewriting this one
// shared file at once would race. The markers stay put; clear them after the
// batch by running the verifier and confirming every locale is clean.
if (TranslationRequested && FocalLocale === null && translatedPaths.size > 0) {
    const enUSLocale = 'en-US';
    const enUSPath = getLocalePath(enUSLocale);
    const enUSText = getLocaleJSON(log, enUSLocale) as LocaleText;
    let stripped = 0;
    for (const revisedString of revisedStrings) {
        if (revisedString.locale !== enUSLocale) continue;
        if (!translatedPaths.has(revisedString.path.toString())) continue;
        const value = revisedString.path.resolve(enUSText);
        if (typeof value === 'string') {
            if (value.startsWith('$!')) {
                revisedString.path.repair(enUSText, value.slice('$!'.length));
                stripped++;
            }
        } else if (Array.isArray(value)) {
            const updated = value.map((entry) =>
                typeof entry === 'string' && entry.startsWith('$!')
                    ? entry.slice('$!'.length)
                    : entry,
            );
            if (updated.some((entry, i) => entry !== (value as unknown[])[i])) {
                revisedString.path.repair(enUSText, updated);
                stripped++;
            }
        }
    }
    if (stripped > 0) {
        await writeFormatted(enUSPath, JSON.stringify(enUSText, null, 4));
        log.good(
            `Cleared "$!" Revised markers from ${stripped} en-US strings whose translations propagated to sibling locales.`,
        );
    }
} else if (
    TranslationRequested &&
    FocalLocale !== null &&
    revisedStrings.length > 0
) {
    log.say(
        `Translated ${revisedStrings.length} revised en-US string(s) into ${FocalLocale}. Their "$!" markers stay in en-US until every locale is done; clear them once "npm run locales" is clean.`,
    );
}

// Translations left behind by an en-US rewording this branch made (#1144). This is
// the cheap half of drift detection — two blob reads per file against the branch
// point, about a second — so it can run on every verify, including the watch-mode
// one, instead of waiting for CI. The full history census stays in
// `npm run locales-drift`, which is far too slow to run on every save.
if (FocalLocale === null) {
    const base = getDriftBase();
    if (base !== undefined && sourceLocaleText !== undefined) {
        const driftLog = log.scope('Drift from en-US');
        const localeKinds = getCheckablePathKinds(sourceLocaleText);
        // Every tutorial mode, each with its own kinds map: the two tutorials
        // are different documents whose path ids collide, so one merged map
        // would resolve a path against the wrong file.
        const tutorials = getTutorialSources();

        /** The en-US source, the locale's file, and the matching kinds map. */
        const filesFor = (locale: string) => [
            [
                getLocalePath(SourceLocale),
                getLocalePath(locale),
                localeKinds,
            ] as const,
            ...tutorials.map(
                ({ mode, kinds }) =>
                    [
                        getTutorialPath(SourceLocale, mode),
                        getTutorialPath(locale, mode),
                        kinds,
                    ] as const,
            ),
        ];

        const behind: Stale[] = [];
        for (const localeText of allLocaleText) {
            const locale = toLocaleString(localeText);
            if (locale === SourceLocale) continue;
            for (const [source, target, kinds] of filesFor(locale))
                behind.push(
                    ...driftSince(base, source, target, locale, kinds).map(
                        (entry) => ({ ...entry }) as Stale,
                    ),
                );
        }
        const queueable = behind.filter((entry) => entry.kind !== 'name');
        if (queueable.length > 0) {
            if (FixRequested || TranslationRequested) {
                // Mark here so the ordinary repair step queues the work and the
                // translate step that follows fixes it, rather than drift
                // waiting on someone remembering to run a separate command.
                let marked = 0;
                for (const localeText of allLocaleText) {
                    const locale = toLocaleString(localeText);
                    if (locale === SourceLocale) continue;
                    for (const [, file, kinds] of filesFor(locale)) {
                        const entries = queueable.filter(
                            (entry) =>
                                entry.locale === locale && entry.file === file,
                        );
                        if (entries.length === 0) continue;
                        const text = readJSON(file);
                        if (text === undefined) continue;
                        const count = markStale(entries, kinds, text);
                        if (count === 0) continue;
                        await writeFormatted(
                            file,
                            JSON.stringify(text, null, 4),
                        );
                        marked += count;
                    }
                }
                if (marked > 0)
                    driftLog.good(
                        `Marked ${marked} translation(s) "$!" whose en-US source this branch reworded; they will be re-translated.`,
                    );
            } else
                driftLog.warning(
                    `${queueable.length} translation(s) are behind en-US strings this branch reworded. Run "npm run locales-fix" to queue them.`,
                );
        }
    }
}

// Build the word → locale index the languages dialog uses to find languages a project needs
// but doesn't declare (#1246). It reads every locale's basis, so it can only be built on a
// full run; a focal run leaves the committed artifact alone.
if (FocalLocale === null) {
    await generateNameIndex(
        log.scope('Language name index'),
        allLocaleText,
        FixRequested || TranslationRequested,
    );
}

// Lift each locale's "choose a language" phrase into a bundled table, so the first-run
// prompt can greet a visitor in their own language without fetching every locale (#1256).
if (FocalLocale === null) {
    await generateChoosePrompts(
        log.scope('Language prompts'),
        allLocaleText,
        FixRequested || TranslationRequested,
    );
}

// Build one web app manifest per locale, so an installed Wordplay is named and
// described in the language it was installed from (#564).
if (FocalLocale === null) {
    await generateManifests(
        log.scope('App manifests'),
        allLocaleText,
        FixRequested || TranslationRequested,
    );
}

// Surface locale keys that no static accessor in `src/` references. These are
// only candidates — see ALWAYS_USED_PREFIXES in findUnusedKeys.ts for sections
// excluded because they're read via runtime-computed keys. Warning, not bad:
// false positives here would delete real translations if treated as errors.
if (FocalLocale === null) {
    const unused = findUnusedKeys(DefaultLocale, 'src');
    if (unused.length > 0) {
        log.warning(
            `${unused.length} locale keys appear unused (no static accessor found): ${unused
                .map((p) => p.toString())
                .join(', ')}`,
        );
    } else log.good('No unused locale keys detected.');
}

// Every user-visible string field must declare a format tag ([plain]/[formatted]/
// [name]/[emotion]) in its locale type, or it's invisible to the localization
// editor and translators. This is a type-level (schema) property, so check once.
if (FocalLocale === null) {
    const untagged = findUntaggedStrings(DefaultLocale);
    if (untagged.length > 0) {
        log.bad(
            `${untagged.length} user-visible string field(s) are missing a format tag ([plain]/[formatted]/[name]/[emotion]) and are invisible to translators. Add a tag to each in its locale type declaration:\n${untagged.join('\n')}`,
        );
    } else log.good('All user-visible string fields have a format tag.');
}

// Verify keyword integrity: each localized keyword must be a single token (no spaces or hyphens) and
// not collide with a reserved symbol, so it can be tokenized as one keyword. Warning, not error:
// render-only display tolerates multi-word seeds, and machine-translated seeds are reviewed before a
// locale's keywords ship. Coverage (every keyword present) is already enforced by the schema.
{
    const keywordIssues: string[] = [];
    for (const [locale, localeText] of Object.entries(textByLocale)) {
        const block = localeText.keyword;
        if (block === undefined) continue;
        for (const id of KeywordIds) {
            const raw = block[id];
            if (typeof raw !== 'string') continue;
            const value = withoutAnnotations(raw).trim();
            if (value.length === 0) continue; // Unwritten; coverage enforced by schema.
            if (/[\s-]/.test(value))
                keywordIssues.push(
                    `${locale}.keyword.${id} ("${value}") is not a single token`,
                );
            else if (ReservedSymbols.includes(value))
                keywordIssues.push(
                    `${locale}.keyword.${id} ("${value}") collides with a reserved symbol`,
                );
        }
    }
    if (keywordIssues.length > 0)
        log.warning(
            `${keywordIssues.length} keyword(s) to review (must be a single, hyphen-free, non-reserved token): ${keywordIssues.join('; ')}`,
        );
    else log.good('All keywords are single, hyphen-free tokens.');
}

// If the user asked for a specific locale that has no locale file yet, create one.
//
// The test is the file, not the folder: the folder is created here before any
// translating happens, so a run killed before its first save left an empty folder
// behind — which made this branch skip, while the loop above quietly ignores a
// folder whose JSON won't load when a focal locale is set. The same command that
// started the work became a silent no-op that reported zero locales and exited 0.
if (FocalLocale && FocalRegion && !fs.existsSync(getLocalePath(FocalLocale))) {
    const newLocaleLog = log.scope(
        'Creating a new locale folder for ' + FocalLocale,
    );
    fs.mkdirSync(path.join('static', 'locales', FocalLocale), {
        recursive: true,
    });

    newLocaleLog.good('No locale found, creating one based on English.');
    let localeText = createUnwrittenLocale();
    localeText.language = FocalLanguage as LanguageCode;
    localeText.regions = [FocalRegion] as RegionCode[];
    localeText['$schema'] = '../../schemas/LocaleText.json';

    await handleLocale(
        newLocaleLog,
        localeText,
        revisedStrings,
        true,
        globals,
        translatedPaths,
    );
}

// Report what the run consumed and roughly cost, so a change in the pipeline's
// efficiency is visible from one run to the next. The machine-readable line at
// the end is for batch.ts, which sums it across its per-locale children — it
// bypasses Log on purpose so its format is stable regardless of log styling.
if (translator?.getUsage !== undefined) {
    const usage = translator.getUsage();
    if (usage.length > 0) {
        const usageLog = log.scope('API usage');
        for (const entry of usage) usageLog.say(describeUsage(entry));
        const known = usage.filter((entry) => entry.cost !== undefined);
        if (known.length > 0)
            usageLog.say(
                `Estimated cost: $${known.reduce((sum, entry) => sum + (entry.cost ?? 0), 0).toFixed(2)}`,
            );
        console.log(`${UsageLineMarker}${JSON.stringify(usage)}`);
    }
}

// Exit non-zero if any errors were reported, so `verify` fails the run
// (reporting every error first, rather than bailing on the first one).
// `fix` mutates files and isn't a pass/fail gate, so don't fail it.
// Set the code rather than calling process.exit, which can truncate a pending
// write when stdout is a pipe — as it is for every batch.ts child.
if (!FixRequested && log.errorCount > 0) process.exitCode = 1;
