import {
    parseBuiltinKitSource,
    serializeBuiltinKitSource,
} from '@db/kits/kitSourceFile';
import { kitExports } from '@nodes/publishedShare';
import Project from '@db/projects/Project';
import translateProjectContent, {
    type RawTranslator,
} from '@db/projects/translateProjectContent';
import DefaultLocale from '@locale/DefaultLocale';
import type LanguageCode from '@locale/LanguageCode';
import type { Locale } from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import type { RegionCode } from '@locale/Regions';
import Docs from '@nodes/Docs';
import Names from '@nodes/Names';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import type Log from '@util/verify-locales/Log';
import type Translator from '@util/verify-locales/Translator';
import writeFormatted from '@util/verify-locales/writeFormatted';
import fs from 'fs';
import path from 'path';

/**
 * Translating the kits Wordplay ships with (#8).
 *
 * A per-locale copy is not expressible here as it is for a gallery example: a kit is
 * referenced **by name from other people's programs** and a version stores one `code`
 * string, so every language has to live in the one source — the way `WhatWord.wp` carries
 * `•Game/en,Juego/es,لعبة/ar`.
 *
 * `translateProjectContent`'s **add** mode does exactly that: it appends a tagged name
 * beside the original and a tagged option to each doc, and deliberately does not retarget
 * references, which is what keeps every existing borrow resolving.
 */

const KitsRoot = path.join('src', 'db', 'kits', 'sources');

/** Where a built-in kit version's source lives. */
function kitVersionPath(name: string, version: number): string {
    return path.join(KitsRoot, name, `${version}.wp`);
}

/**
 * Whether this kit version still owes the locale anything.
 *
 * A `.wp` carries no write status, so — as with examples — the file itself has to answer.
 * The question here is simpler than an example's, because there is no master to diff
 * against: the file *is* the master, growing an option per language. It owes the locale
 * something when any export lacks a name in that language, or any doc lacks an option.
 */
export function kitNeedsTranslation(
    source: Source,
    language: LanguageCode,
    /** The language the kit is written in, which untagged prose is already in. */
    sourceLanguage: LanguageCode = 'en',
): boolean {
    // An untagged doc is the kit author's own words. It serves every other language as a
    // fallback, but it *is* the source language's copy — so English is never owed a
    // translation of one, which is what this once claimed for every kit.
    const satisfied = (docs: Docs): boolean =>
        docs.isEmpty() ||
        docs.docs.some((doc) =>
            doc.language === undefined
                ? language === sourceLanguage
                : doc.language.getLanguageCodes().includes(language),
        );

    for (const shared of kitExports(source)) {
        if (
            'names' in shared &&
            !shared.names.names.some((name) =>
                name.getLanguages().includes(language),
            )
        )
            return true;
        if (!satisfied(shared.docs)) return true;
    }
    // The source's own doc is the kit's description, which the registry shows.
    return !satisfied(source.expression.docs);
}

/**
 * Add one locale's names and docs to every built-in kit that still lacks them.
 *
 * Writes after **each kit**, not at the end: this is paid work, and a process killed
 * partway must not lose what it already bought. The same rule the locale pipeline follows.
 */
export async function verifyKits(
    log: Log,
    locale: string,
    language: LanguageCode,
    regions: RegionCode[],
    translateContent: boolean,
    /** Kit names to narrow the run to (`+kit:tunes`). Empty = all. */
    kitIds: string[] | undefined,
    translator: Translator | undefined,
    localeText: LocaleText | undefined,
    apply: boolean,
    /** Redo a kit already translated into this locale, rather than skipping it. */
    override = false,
): Promise<void> {
    const targetLocale: Locale = { language, regions };
    const sourceLocale: Locale = { language: 'en', regions: ['US'] };
    const wanted =
        kitIds === undefined || kitIds.length === 0
            ? undefined
            : new Set(kitIds);
    let backendLocale = locale;
    if (translateContent && translator !== undefined) {
        try {
            backendLocale = await translator.getTargetLocale(language, regions);
        } catch (error) {
            log.bad(`Failed to get the target locale: ${error}`);
            return;
        }
    }

    // Read from disk rather than from `builtins.ts`'s manifest: that module imports each
    // source with Vite's `?raw`, which this CLI's tsx runtime cannot resolve.
    // `builtinKits.test.ts` already asserts the two agree.
    for (const name of fs.existsSync(KitsRoot)
        ? fs
              .readdirSync(KitsRoot, { withFileTypes: true })
              .filter((entry) => entry.isDirectory())
              .map((entry) => entry.name)
              .sort()
        : []) {
        if (wanted !== undefined && !wanted.has(name)) continue;
        const builtin = { name };
        for (const version of fs
            .readdirSync(path.join(KitsRoot, name))
            .filter((one) => one.endsWith('.wp'))
            .map((one) => Number(one.replace('.wp', '')))
            .sort((a, b) => a - b)) {
            const file = kitVersionPath(builtin.name, version);
            const { glyph, names, code } = parseBuiltinKitSource(
                fs.readFileSync(file, 'utf8'),
            );
            const source = new Source(names, code);

            // A `.wp` carries no write status, so nothing can tell a translation that
            // has gone stale — its English was edited — from one that is current.
            // Naming the kit explicitly under `override` answers that question the only
            // way anyone can: by saying so. The same trigger a how-to has, for the same
            // reason. Without it there is no way to redo a kit short of deleting its
            // tagged names and docs by hand.
            const redo = override && wanted !== undefined;
            if (!redo && !kitNeedsTranslation(source, language)) continue;

            if (!translateContent || translator === undefined) {
                // Warned, never fatal — the precedent `verifyExamples` sets, for the same
                // reason: adding a locale must not red the build until someone pays.
                log.warning(
                    `${builtin.name} ${version} has no ${locale} names or docs. Run "npm run locales-translate ${locale} +kit:${builtin.name}".`,
                );
                continue;
            }

            const base = Project.make(
                null,
                builtin.name,
                source,
                [],
                DefaultLocale,
            );
            const project = redo ? withoutLanguage(base, language) : base;

            const raw: RawTranslator = async (texts) => {
                const result = await translator.translate(
                    log,
                    texts,
                    'en-US',
                    backendLocale,
                    localeText,
                    // A kit's examples name the kit's own definitions, which a
                    // standalone example project cannot resolve — localizing them
                    // rewrote them into code that would not parse, and `validate`
                    // refused the whole file. Left verbatim, they still *read* in the
                    // viewer's language, because the editor localizes a name at its
                    // use site through the definition it resolves to.
                    { examples: false },
                );
                return result === undefined
                    ? null
                    : result.map((one) => one ?? undefined);
            };

            let reason = 'translation failed';
            const revised = await translateProjectContent(
                project,
                sourceLocale,
                targetLocale,
                raw,
                localeText,
                /* replace */ false,
                {
                    // A kit's data literals — an alphabet, a syllabary — are tagged with
                    // the language they *are*, and must ship verbatim. Its export names
                    // are tagged too, because `MissingShareLanguages` requires it, so
                    // tagged-ness cannot mean "content" for them.
                    preserveTagged: true,
                    translateTaggedNames: true,
                    validate: true,
                    report: (why) => {
                        reason = why;
                    },
                },
            );

            if (revised === null) {
                log.warning(`Kept ${file} untranslated: ${reason}.`);
                continue;
            }

            const translated = revised.getSerializedSources()[0];
            if (translated === undefined) {
                log.warning(`Kept ${file} untranslated: no source came back.`);
                continue;
            }

            if (apply) {
                // The header names stay verbatim, the rule `translateExampleFile` follows:
                // nothing resolves a kit by its source's name.
                writeFormatted(
                    file,
                    serializeBuiltinKitSource(glyph, names, translated.code),
                );
                log.good(`Added ${locale} to ${builtin.name} ${version}.`);
            }
        }
    }
}

/**
 * The same project with every name and doc in this language removed.
 *
 * What makes a redo possible: add mode deliberately skips anything already carrying the
 * target language, so re-translating means taking that language out first and letting the
 * ordinary pass put it back. Everything else — the source language, every other
 * translation, the code — is untouched.
 *
 * Through `withRevisedNodes` rather than a loop of `Source.replace`, because each replace
 * rebuilds the source and orphans every other node gathered beforehand; that function
 * exists to apply a batch of replacements to one source at once.
 */
export function withoutLanguage(
    project: Project,
    language: LanguageCode,
): Project {
    const source = project.getMain();
    const revisions: [Node, Node | undefined][] = [];
    for (const names of source
        .nodes()
        .filter((node): node is Names => node instanceof Names)) {
        const kept = names.names.filter(
            (name) => !name.getLanguages().includes(language),
        );
        // Never emptied: a definition with no names at all is not a definition.
        if (kept.length !== names.names.length && kept.length > 0)
            revisions.push([names, new Names(kept)]);
    }
    for (const docs of source
        .nodes()
        .filter((node): node is Docs => node instanceof Docs)) {
        const kept = docs.docs.filter(
            (doc) =>
                doc.language?.getLanguageCodes().includes(language) !== true,
        );
        if (kept.length !== docs.docs.length && kept.length > 0)
            revisions.push([docs, new Docs(kept)]);
    }
    return revisions.length === 0
        ? project
        : project.withRevisedNodes(revisions);
}
