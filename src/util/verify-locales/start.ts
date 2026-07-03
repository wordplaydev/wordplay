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
import Log from '@util/verify-locales/Log';
import {
    getTutorialJSON,
    getTutorialPath,
} from '@util/verify-locales/TutorialSchema';
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
import { TutorialModes, type TutorialMode } from '../../tutorial/TutorialMode';
import fs from 'fs';
import path from 'path';
import generateEmojisForLocale from '@util/verify-locales/generateEmojis';
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
const FailOnInvalid = process.argv[2] === 'ci';
const FixRequested = process.argv[2] === 'fix';

/** Tutorial modes in the full translation pipeline (per-locale file creation + machine
 * translation + required by CI). All modes are translated so no tutorial falls back to English
 * in production; a mode here that lacks a per-locale file fails verification, and translate/override
 * creates and fills it. (A mode could be removed here to keep it en-US-only while its English is
 * refined.) */
const TranslatedTutorialModes: TutorialMode[] = [...TutorialModes];

// Make a logger so we can pretty print feedback. It bails on bad or exit with a failure exit code if we're in continuous integration mode.
const log = new Log(FailOnInvalid);

// Now that we've defined all of the functionality, let's process requests.
if (
    process.argv.length < 3 ||
    !['fix', 'ci', 'verify', 'translate', 'override'].includes(process.argv[2])
) {
    log.exit(
        0,
        'Please provide either "verify" (check structure), "ci" (fail on invalid structure), "fix" (repair structure), "translate" (translate untranslated strings), "override" command (replace existing machine translations)',
        false,
    );
}

// If there are problems in the default locale, we can't verify or translate anything.
if (!LocaleValidator(DefaultLocale)) {
    log.bad(
        0,
        'Default locale is invalid. It needs to be repaired before we can proceed.',
    );
    if (LocaleValidator.errors)
        for (const error of LocaleValidator.errors) {
            if (error.message)
                log.bad(1, 'x ' + `${error.instancePath}: ${error.message}`);
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
        ? log.exit(0, selectionResult, false)
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
    log.exit(
        0,
        'Please provide a valid locale language code to translate',
        false,
    );

log.say(
    0,
    TranslationRequested
        ? 'Verifying and translating ' + (FocalLocale ?? 'all locales')
        : 'Checking all locale files for problems...',
);

// The translation backend must be chosen explicitly (no silent default), so a
// long run can't quietly use the wrong one. Validate and report it up front.
if (TranslationRequested) {
    try {
        log.say(0, `Using the "${getTranslator().id}" translation backend.`);
    } catch (error) {
        log.exit(
            0,
            error instanceof Error ? error.message : String(error),
            false,
        );
    }
}

// Go through all of the locale directors and check the locale and tutorial files, repairing and optionally translating them.
const localeFolders = Array.from(
    fs.readdirSync(path.join('static', 'locales'), { withFileTypes: true }),
);

// Verify, repair, and translate a locale */
async function handleLocale(
    localeText: LocaleText,
    revisedStrings: RevisedString[],
    localeIsNew: boolean,
    globals: Map<string, { locale: string; path: LocalePath }[]>,
    translatedPaths: Set<string>,
) {
    const locale = toLocaleString(localeText);

    // Validate, repair, and translate the locale file.
    const [revisedLocale, localeChanged] = await verifyLocale(
        log,
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
    );

    // If the locale was revised, write the results (Prettier-formatted).
    if (localeChanged || localeIsNew) {
        log.good(1, 'Saving repairs to ' + locale);
        await writeFormatted(
            getLocalePath(locale),
            JSON.stringify(revisedLocale, null, 4),
        );
    }

    // Verify (and, for translate-enabled modes, optionally translate) each tutorial mode's file.
    for (const mode of TutorialModes) {
        // Modes not in the translation pipeline are still verified, but never created or translated
        // for non-en-US locales (see TranslatedTutorialModes).
        const modeTranslates = TranslatedTutorialModes.includes(mode);

        // See if there's a tutorial for this mode.
        let currentTutorial = getTutorialJSON(log, locale, mode);

        // Remember whether we created one so we can write it below.
        let tutorialIsNew = false;

        // Validate, repair, and optionally translate the tutorial file.
        if (currentTutorial === undefined) {
            // A mode not yet in the translation pipeline is intentionally en-US-only for now, so
            // don't warn about or create per-locale files for it.
            if (modeTranslates) {
                // No translation requested? Just warn.
                if (!TranslationRequested)
                    log.bad(
                        1,
                        `This locale doesn't have a ${mode} tutorial file.`,
                    );
                // If a translation was requested and it was a valid langauge and region,
                // copy the default tutorial, mark all of its text unwritten, and then translate it.
                else if (FocalLanguage && FocalRegion) {
                    log.say(
                        1,
                        `Creating a new ${mode} tutorial for this locale based on en-US...`,
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

        // If there is a tutorial file, verify it, and optionally translate it.
        if (currentTutorial) {
            const revisedTutorial = await verifyTutorial(
                log,
                revisedLocale,
                currentTutorial,
                // Verification always runs; only translate-enabled modes that are
                // in scope are machine-translated.
                TranslationRequested &&
                    modeTranslates &&
                    selection.isIncluded(category),
                OverrideMachineTranslations,
                targets,
            );

            // If the tutorial was revised, write the results (Prettier-formatted).
            if (
                tutorialIsNew ||
                (revisedTutorial &&
                    JSON.stringify(currentTutorial) !==
                        JSON.stringify(revisedTutorial))
            ) {
                log.good(1, `Writing revised ${locale} ${mode} tutorial`);
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
        log,
        locale,
        localeText.language,
        localeText.regions,
        TranslationRequested && selection.isIncluded('howto'),
        OverrideMachineTranslations,
        selection.howtoIds(),
    );

    // Regenerate the per-locale how-to bundle the runtime loads (write-if-changed).
    await buildHowToBundle(log, locale);

    // Generate this locale's emoji translations as part of a translate/override
    // run, so a new/updated locale gets its `{locale}-emojis.json` without a
    // separate `npm run locales-emojis`. Best-effort: it does network I/O (CLDR),
    // so a failure is logged and the run continues rather than aborting.
    if (TranslationRequested && selection.isIncluded('emoji'))
        await generateEmojis(log, locale);

    // Verify this locale's date/time formatting data (generated from a pinned
    // CLDR JSON release; see generateDateTimes.ts). Runs in every mode so CI
    // catches missing, malformed, stale, or core-desynced data; fix runs and
    // translate/override runs (when `datetimes` is in scope) repair problems by
    // regenerating, which is deterministic and so always safe.
    await verifyDateTimes(
        log,
        locale,
        FixRequested ||
            (TranslationRequested && selection.isIncluded('datetimes')),
    );
}

/** Generate this locale's emoji translations in-process. Best-effort — it does
 *  network I/O (CLDR), so a failure is logged and the run continues rather than
 *  aborting a translation run. */
async function generateEmojis(log: Log, locale: string): Promise<void> {
    log.say(2, `Generating emoji translations for ${locale}…`);
    try {
        const { used, matched, total } = await generateEmojisForLocale(locale);
        log.good(
            3,
            `Emojis: ${matched}/${total} from CLDR ${used.join('+') || 'en (fallback)'}.`,
        );
    } catch (error) {
        log.warning(
            2,
            `Emoji generation for ${locale} failed (${error}); keeping any existing emojis. Re-run "npm run locales-emojis" later.`,
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
                log.bad(
                    1,
                    `Couldn't find locale ${locale}. Can't validate it, or it's tutorial.`,
                );
                process.exit(0);
            }
        } else {
            textByLocale[locale] = localeText;
        }
    }
}

const allLocaleText = Object.values(textByLocale);

log.good(
    1,
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

        // Only en-US `$!` Revised markers propagate across all locales (a source revision should
        // re-translate every sibling). A `$!` on a *translated* locale string is locale-specific —
        // it re-translates just that string (via shouldStringBeMachineTranslated), not the path
        // everywhere — so it isn't collected here.
        if (toLocaleString(localeText) === toLocaleString(DefaultLocale)) {
            const value = path.resolve(localeText);
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
                    locale: toLocaleString(localeText),
                    text: revised,
                });
        }
    }
}

// Paths whose translation actually landed for at least one sibling this run.
// After the loop we strip the `$!` Revised marker from the en-US source at
// these paths so a future run doesn't redundantly re-translate them.
const translatedPaths = new Set<string>();

// Go through each locale, or the specific one of interest, and verify, repair, and optionally translate it.
for (const localeText of allLocaleText) {
    log.say(1, `Checking ${toLocaleString(localeText)}`);
    await handleLocale(
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
if (TranslationRequested && translatedPaths.size > 0) {
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
            0,
            `Cleared "$!" Revised markers from ${stripped} en-US strings whose translations propagated to sibling locales.`,
        );
    }
}

// Surface locale keys that no static accessor in `src/` references. These are
// only candidates — see ALWAYS_USED_PREFIXES in findUnusedKeys.ts for sections
// excluded because they're read via runtime-computed keys. Warning, not bad:
// false positives here would delete real translations if treated as errors.
if (FocalLocale === null) {
    const unused = findUnusedKeys(DefaultLocale, 'src');
    if (unused.length > 0) {
        log.warning(
            0,
            `${unused.length} locale keys appear unused (no static accessor found): ${unused
                .map((p) => p.toString())
                .join(', ')}`,
        );
    } else log.good(0, 'No unused locale keys detected.');
}

// Every user-visible string field must declare a format tag ([plain]/[formatted]/
// [name]/[emotion]) in its locale type, or it's invisible to the localization
// editor and translators. This is a type-level (schema) property, so check once.
if (FocalLocale === null) {
    const untagged = findUntaggedStrings(DefaultLocale);
    if (untagged.length > 0) {
        log.bad(
            0,
            `${untagged.length} user-visible string field(s) are missing a format tag ([plain]/[formatted]/[name]/[emotion]) and are invisible to translators. Add a tag to each in its locale type declaration:\n  ${untagged.join('\n  ')}`,
        );
    } else log.good(0, 'All user-visible string fields have a format tag.');
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
            0,
            `${keywordIssues.length} keyword(s) to review (must be a single, hyphen-free, non-reserved token): ${keywordIssues.join('; ')}`,
        );
    else log.good(0, 'All keywords are single, hyphen-free tokens.');
}

// If the user asked for a specific locale, and a folder doesn't exist for it yet, create one.
if (
    FocalLocale &&
    FocalRegion &&
    !localeFolders.find((f) => f.name === FocalLocale)
) {
    log.say(0, 'Creating a new locale folder for ' + FocalLocale);
    fs.mkdirSync(path.join('static', 'locales', FocalLocale));

    log.good(2, 'No locale found, creating one based on English.');
    let localeText = createUnwrittenLocale();
    localeText.language = FocalLanguage as LanguageCode;
    localeText.regions = [FocalRegion] as RegionCode[];
    localeText['$schema'] = '../../schemas/LocaleText.json';

    handleLocale(localeText, revisedStrings, true, globals, translatedPaths);
}
