/**
 * Verify and optionally translate the built-in gallery examples for one locale
 * (#1310). A locale's translations are complete rewrite-mode `.wp` files at
 * `static/examples/<locale>/<Name>.wp` — each a valid, runnable localized
 * program — written by `translateProjectContent` under `preserveTagged`, so
 * explicitly language-tagged content (a French word in a French-teaching
 * example) ships verbatim in every locale and only untagged text translates.
 *
 * Because `preserveTagged` rewrite only renames and re-texts, a per-locale
 * file stays node-isomorphic (outside markup contents) to its en-US master.
 * That single invariant powers the deterministic retarget pass below, the
 * divergence-based re-translation trigger, and load-time compositing.
 *
 * Two deliberate simplifications:
 * - Source header names (`=== start/en`) are kept verbatim from the master: a
 *   `↓ borrow` names a source, and nothing retargets borrow tokens, so a
 *   renamed source strands them (CodeGap, WhatWord, Literacy all borrow). The
 *   runtime doesn't read the tags either — `getExample` declares the file's
 *   locale explicitly.
 * - A `.wp` file can't carry a `$?`/`$!`/`$~` write status (it would be
 *   program text), so re-translation triggers are how-to-style: file missing,
 *   byte-equal to English, structurally divergent from the master, or named
 *   explicitly with `+example:<Name>` under override.
 */

import Project from '@db/projects/Project';
import { parseAsMultilingualName } from '@db/projects/getLocalizedProjectName';
import translateProjectContent, {
    type RawTranslator,
} from '@db/projects/translateProjectContent';
import DefaultLocale from '@locale/DefaultLocale';
import type LanguageCode from '@locale/LanguageCode';
import { stringToLocale, type Locale } from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import type { RegionCode } from '@locale/Regions';
import Source from '@nodes/Source';
import getTranslator from '@util/verify-locales/getTranslator';
import type Log from '@util/verify-locales/Log';
import {
    hasUnclosedText,
    mismatchedDelimiter,
} from '@util/verify-locales/protect';
import { localeExamplesMayHaveChanged } from '@util/verify-locales/exampleFreshness';
import { retargetSerializedExample } from '@util/verify-locales/retargetExampleNames';
import type Translator from '@util/verify-locales/Translator';
import writeFormatted from '@util/verify-locales/writeFormatted';
import fs from 'fs';
import path from 'path';
import { parseSerializedProject } from '../../examples/examples';
import { serializeExample } from '../../examples/serializeExample';

/** Where the en-US master examples live; a locale's translations live in a
 *  subdirectory named by its locale code. */
export const ExamplesRoot = path.join('static', 'examples');

export function localizedExamplesPath(locale: string): string {
    return path.join(ExamplesRoot, locale);
}

/**
 * Whether the locale has opted into localized gallery examples: its directory
 * exists. Opt-in keeps a bare `locales-translate <locale>` from silently
 * buying 75 example translations for every draft locale; an explicit
 * `+example` flag on a translate run is what opts a locale in (and creates
 * the directory).
 */
export function localeHasLocalizedExamples(locale: string): boolean {
    return fs.existsSync(localizedExamplesPath(locale));
}

/**
 * Whether an example still has to be translated for its locale. The same
 * reasoning as `howToNeedsTranslation`: a `.wp` carries no write status, so
 * byte equality with English is the "copied, not translated" test, an
 * explicit `+example:<Name>` under override is the redo trigger, and — new
 * here — a file whose shape no longer matches its master (the master was
 * edited) can only be fixed by re-translating.
 */
export function exampleNeedsTranslation(
    english: string,
    target: string,
    isNewFile: boolean,
    override: boolean,
    /** Whether this example was named explicitly with `+example:<Name>`. */
    named: boolean,
    /** Whether the deterministic retarget pass found the file structurally
     *  divergent from its master. */
    divergent: boolean,
): boolean {
    if (isNewFile) return true;
    if (target === english) return true;
    if (divergent) return true;
    return override && named;
}

export async function verifyExamples(
    log: Log,
    locale: string,
    language: LanguageCode,
    regions: RegionCode[],
    translateContent: boolean,
    override: boolean,
    /** Optional example names (filename without `.wp`) to narrow the run to
     *  (e.g. `+example:Adventure`). Empty or undefined = all. */
    exampleIds?: string[],
    /** The run's shared translation backend; see verifyHowTo. */
    translator?: Translator,
    /** The locale's (post-repair) text: the translation target's basis names,
     *  and what the retarget pass derives declared names from. */
    localeText?: LocaleText,
    /** Whether to rewrite files the deterministic retarget pass repaired.
     *  Verify reports them instead, so it stays read-only. */
    fix = false,
    /** Whether `+example` was named explicitly, opting a locale in for its
     *  first translation. */
    explicitOptIn = false,
): Promise<void> {
    // en-US is the source.
    if (locale === 'en-US') return;

    let masterFiles: string[];
    try {
        masterFiles = fs
            .readdirSync(ExamplesRoot, { withFileTypes: true })
            .filter((file) => file.isFile() && file.name.endsWith('.wp'))
            .map((file) => file.name);
    } catch (error) {
        log.bad(`Failed to read the examples directory: ${error}`);
        return;
    }

    // Narrow to the requested examples, if any (+example:<Name>).
    const named = exampleIds !== undefined && exampleIds.length > 0;
    if (named)
        masterFiles = masterFiles.filter((file) =>
            exampleIds.includes(file.replace('.wp', '')),
        );
    if (masterFiles.length === 0) return;

    const targetDir = localizedExamplesPath(locale);
    const optedIn = localeHasLocalizedExamples(locale);
    // The opt-in gate: a locale without a directory is not participating, and
    // only an explicit `+example` on a translate run changes that.
    if (!optedIn && !(translateContent && explicitOptIn)) return;

    // A localized file with no master is an orphan — its master was renamed or
    // removed — and nothing will ever load it.
    try {
        const orphans = fs.existsSync(targetDir)
            ? fs
                  .readdirSync(targetDir, { withFileTypes: true })
                  .filter((file) => file.isFile() && file.name.endsWith('.wp'))
                  .map((file) => file.name)
                  .filter(
                      (file) => !fs.existsSync(path.join(ExamplesRoot, file)),
                  )
            : [];
        for (const orphan of orphans) {
            if (fix || translateContent) {
                fs.unlinkSync(path.join(targetDir, orphan));
                log.good(`Deleted orphaned ${orphan}: it has no master.`);
            } else
                log.warning(
                    `${orphan} has no master in static/examples. Run "npm run locales-fix" to delete it.`,
                );
        }
    } catch (error) {
        log.bad(`Failed to check for orphaned examples: ${error}`);
    }

    // Re-deriving 75 examples against their master is the most expensive thing
    // this verifier does, and nothing a change leaves untouched can have gone
    // stale. A read-only run therefore skips a locale whose examples, own names,
    // and en-US's names are all unchanged since the branch point — the question
    // `driftSince` already asks of translations. Repairing runs never skip: fix
    // and translate may have work queued from before the base.
    const readOnly = !fix && !translateContent;
    const skippable =
        readOnly && !named && !localeExamplesMayHaveChanged(locale);

    // Bring every localized example's names back in line with what the locale
    // declares, and learn which files have structurally diverged from their
    // master. Runs in every mode: the repair is deterministic, so it needs no
    // translation run — the same reasoning as retargetHowToExamples.
    const divergent =
        localeText !== undefined && !skippable
            ? retargetLocalizedExamples(
                  log,
                  masterFiles,
                  targetDir,
                  localeText,
                  fix || translateContent,
              )
            : new Set<string>();

    if (skippable)
        log.good(
            `Examples are unchanged since the branch point; skipped re-deriving them.`,
        );

    if (!translateContent) {
        // Verification is read-only: report missing files and divergence. A
        // warning, not an error: translating 75 files costs real money, so an
        // opted-in locale is legitimately partial mid-rollout, and a missing
        // file falls back to the en-US master at load.
        const missing = masterFiles.filter(
            (file) => !fs.existsSync(path.join(targetDir, file)),
        );
        if (missing.length > 0)
            log.warning(
                `Missing ${missing.length} localized example(s). Run "npm run locales-translate ${locale} +example" to translate them.`,
            );
        return;
    }

    // Translation mode.
    try {
        if (!fs.existsSync(targetDir))
            fs.mkdirSync(targetDir, { recursive: true });
    } catch (error) {
        log.bad(`Failed to create ${targetDir}: ${error}`);
        return;
    }

    const backend = translator ?? getTranslator();
    let backendTargetLocale: string;
    try {
        backendTargetLocale = await backend.getTargetLocale(language, regions);
    } catch (error) {
        log.bad(`Failed to get the target locale: ${error}`);
        return;
    }

    const sourceLocale = stringToLocale('en-US');
    const targetLocale = stringToLocale(locale);
    if (sourceLocale === undefined || targetLocale === undefined) {
        log.bad(`Couldn't parse "${locale}" as a locale.`);
        return;
    }

    let translated = 0;
    for (const filename of masterFiles) {
        try {
            if (
                await translateExampleFile(
                    log,
                    filename,
                    targetDir,
                    sourceLocale,
                    targetLocale,
                    backendTargetLocale,
                    override,
                    named,
                    backend,
                    localeText,
                    divergent.has(filename),
                )
            )
                translated++;
        } catch (error) {
            log.bad(`Failed to process ${filename}: ${error}`);
        }
    }

    if (translated > 0)
        log.good(`Translated ${translated}/${masterFiles.length} example(s)`);
    else log.good(`No examples needed translation`);
}

/**
 * Retarget each existing localized example's names against what the locale now
 * declares, using the en-US master as the oracle. Returns the files found
 * structurally divergent — the master changed shape, so only a re-translation
 * repairs them.
 */
function retargetLocalizedExamples(
    log: Log,
    masterFiles: string[],
    targetDir: string,
    locale: LocaleText,
    apply: boolean,
): Set<string> {
    const divergent = new Set<string>();
    let renamed = 0;
    let refused = 0;
    for (const filename of masterFiles) {
        const targetPath = path.join(targetDir, filename);
        if (!fs.existsSync(targetPath)) continue;
        let master;
        let localized;
        try {
            const id = filename.replace('.wp', '');
            master = parseSerializedProject(
                fs.readFileSync(path.join(ExamplesRoot, filename), 'utf8'),
                id,
            );
            localized = parseSerializedProject(
                fs.readFileSync(targetPath, 'utf8'),
                id,
            );
        } catch {
            continue;
        }
        const result = retargetSerializedExample(
            master.sources,
            localized.sources,
            locale,
            locale.language,
        );
        if (result.kind === 'divergent') divergent.add(filename);
        else if (result.kind === 'refused') refused++;
        else if (result.kind === 'retargeted') {
            renamed += result.renamed;
            if (apply)
                fs.writeFileSync(
                    targetPath,
                    serializeExample(
                        localized.preview?.text,
                        localized.name,
                        result.sources,
                    ),
                );
        }
    }

    if (renamed > 0)
        log[apply ? 'good' : 'warning'](
            apply
                ? `Renamed ${renamed} name(s) in localized examples to what this locale declares.`
                : `${renamed} name(s) in localized examples don't match what this locale declares. Run "npm run locales-fix" to retarget them.`,
        );
    if (refused > 0)
        log.warning(
            `Left ${refused} localized example(s) alone: retargeting them would have introduced a conflict.`,
        );
    if (divergent.size > 0)
        log.warning(
            `${divergent.size} localized example(s) no longer match their master's shape; they will be re-translated on the next translate run.`,
        );
    return divergent;
}

/**
 * Translate one master example into the locale, writing
 * `static/examples/<locale>/<Name>.wp`. On any failure nothing is written: a
 * missing file falls back to the en-US master at load time, which beats
 * shipping a half-translated or broken program.
 */
async function translateExampleFile(
    log: Log,
    filename: string,
    targetDir: string,
    sourceLocale: Locale,
    targetLocale: Locale,
    backendTargetLocale: string,
    override: boolean,
    named: boolean,
    backend: Translator,
    localeText: LocaleText | undefined,
    divergent: boolean,
): Promise<boolean> {
    const id = filename.replace('.wp', '');
    const englishText = fs.readFileSync(
        path.join(ExamplesRoot, filename),
        'utf8',
    );
    const targetPath = path.join(targetDir, filename);
    const isNewFile = !fs.existsSync(targetPath);
    const targetText = isNewFile ? '' : fs.readFileSync(targetPath, 'utf8');

    if (
        !exampleNeedsTranslation(
            englishText,
            targetText,
            isNewFile,
            override,
            named,
            divergent,
        )
    )
        return false;

    const master = parseSerializedProject(englishText, id);
    const [main, ...supplements] = master.sources.map(
        (source) => new Source(source.names, source.code),
    );
    if (main === undefined) return false;
    const project = Project.make(null, id, main, supplements, DefaultLocale);

    // The backend's own chunking, memoization, and pooled example localization
    // all live inside translate(); this adapter only reshapes its result to
    // the RawTranslator contract (null element = keep source; undefined result
    // = the whole call failed).
    const raw: RawTranslator = async (texts) => {
        const result = await backend.translate(
            log,
            texts,
            'en-US',
            backendTargetLocale,
            localeText,
        );
        return result === undefined
            ? null
            : result.map((text) => text ?? undefined);
    };

    // Filled in by the reporter below; three distinct failures shared one
    // message before, so a refusal said nothing about which had happened.
    let reason = 'translation failed';
    const revised = await translateProjectContent(
        project,
        sourceLocale,
        targetLocale,
        raw,
        localeText,
        /* replace */ true,
        {
            preserveTagged: true,
            validate: true,
            report: (why) => {
                reason = why;
            },
        },
    );
    if (revised === null) {
        log.warning(`Kept ${filename} untranslated: ${reason}.`);
        return false;
    }

    // Pair translated codes with the master's verbatim header names (see the
    // module comment for why headers aren't translated).
    const revisedSources = revised.getSerializedSources();
    if (revisedSources.length !== master.sources.length) {
        log.warning(`Kept ${filename} untranslated: source count changed.`);
        return false;
    }
    const sources = master.sources.map((source, index) => ({
        names: source.names,
        code: revisedSources[index].code,
    }));

    // The same delimiter guards the example localizer makes, per source: a
    // translation that unbalances a delimiter or leaves a literal open breaks
    // everything after it.
    for (let index = 0; index < sources.length; index++) {
        const before = master.sources[index].code;
        const after = sources[index].code;
        if (
            mismatchedDelimiter(before, after) !== undefined ||
            (!hasUnclosedText(before) && hasUnclosedText(after))
        ) {
            log.warning(
                `Kept ${filename} untranslated: a translated source unbalanced a delimiter.`,
            );
            return false;
        }
    }

    const name = await localizedExampleName(
        log,
        master.name,
        targetLocale,
        backendTargetLocale,
        backend,
        localeText,
    );

    await writeFormatted(
        targetPath,
        serializeExample(master.preview?.text, name, sources),
    );
    log.good(`Translated ${filename}`);
    return true;
}

/**
 * The project name for a localized example file, written as a bare string. A
 * master with a multilingual name line (most carry en + zh-CN + zh-TW) already
 * names the project in some locales, so an option in the target locale is
 * reused rather than re-bought; otherwise the English name is translated, and
 * kept on failure — a name is not worth failing the file over.
 */
async function localizedExampleName(
    log: Log,
    rawName: string,
    targetLocale: Locale,
    backendTargetLocale: string,
    backend: Translator,
    localeText: LocaleText | undefined,
): Promise<string> {
    const parsed = parseAsMultilingualName(rawName);
    const existing =
        parsed?.texts.find((text) => text.language?.isLocale(targetLocale)) ??
        parsed?.texts.find(
            (text) => text.getLanguage() === targetLocale.language,
        );
    if (existing !== undefined) {
        const text = existing.getText();
        if (text.length > 0) return text;
    }
    const english =
        parsed === undefined
            ? rawName
            : ((
                  parsed.texts.find((text) => text.getLanguage() === 'en') ??
                  parsed.texts[0]
              )?.getText() ?? rawName);
    const translations = await backend.translate(
        log,
        [english],
        'en-US',
        backendTargetLocale,
        localeText,
    );
    const translated = translations?.[0];
    return typeof translated === 'string' && translated.length > 0
        ? translated
        : english;
}
