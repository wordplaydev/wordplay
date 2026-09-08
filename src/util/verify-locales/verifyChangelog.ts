import { MachineTranslated } from '@locale/Annotations';
import type LanguageCode from '@locale/LanguageCode';
import type LocaleText from '@locale/LocaleText';
import { isMachineTranslated } from '@locale/LocaleText';
import type { RegionCode } from '@locale/Regions';
import {
    allBundleIds,
    bundleTexts,
    releaseTexts,
    type UpdatesBundle,
    type UpdateTranslations,
} from '@locale/UpdatesBundle';
import { toMarkup } from '@parser/toMarkup';
import { restoreExampleSyntax } from '@util/verify-locales/restoreExampleSyntax';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { withoutColorSelector } from '@unicode/emoji';
import getTranslator from '@util/verify-locales/getTranslator';
import type Log from '@util/verify-locales/Log';
import type Translator from '@util/verify-locales/Translator';
import writeFormatted from '@util/verify-locales/writeFormatted';
import fs from 'fs';
import path from 'path';

/** The format the writer emits. A locale bundle at an older format is rebuilt
 *  from scratch, which is the only way to invalidate translations wholesale. */
const BundleFormat = 1;

/**
 * How many texts one translation request-and-write cycle covers.
 *
 * A full backfill is ~950 texts per locale and the translator does its own
 * chunking inside a single `translate` call, so without slicing the whole
 * locale would reach disk exactly once — and a run killed at 80% would lose
 * every cent of it. Slicing is free because `translateMemoized` remembers
 * across calls, and durable because a written translation carries `$~`, which
 * `changelogNeedsTranslation` skips on the next run.
 */
const CheckpointTexts = 60;

/** Where the structural bundle `npm run updates` writes lands. */
const StructuralPath = path.join('static', 'updates.json');

/** Where a locale's translations live, beside its other generated bundles. */
export function updatesFilePath(locale: string): string {
    return path.join('static', 'locales', locale, `${locale}-updates.json`);
}

/** The structural bundle, or undefined when it hasn't been built. */
export function readStructuralBundle(): UpdatesBundle | undefined {
    if (!fs.existsSync(StructuralPath)) return undefined;
    try {
        return JSON.parse(
            fs.readFileSync(StructuralPath, 'utf-8'),
        ) as UpdatesBundle;
    } catch (_) {
        return undefined;
    }
}

/** A locale's translations, or an empty map when it has none or the file is at
 *  an older format. */
export function readTranslations(locale: string): Record<string, string> {
    const filePath = updatesFilePath(locale);
    if (!fs.existsSync(filePath)) return {};
    try {
        const bundle = JSON.parse(
            fs.readFileSync(filePath, 'utf-8'),
        ) as UpdateTranslations;
        if (bundle.format !== BundleFormat) return {};
        return bundle.entries ?? {};
    } catch (_) {
        return {};
    }
}

/**
 * Whether one changelog text still has to be translated for its locale.
 *
 * Deliberately simpler than `howToNeedsTranslation`, which needs a
 * byte-equality trigger because a locale's how-to file can be a copy of the
 * English one and carries no `$~` to say so. A translation here is stored in a
 * map keyed by the *English* text's id, so "a translation exists" is exactly
 * "somebody bought one" — there is no way to accidentally file the English
 * under a key that claims to be a translation.
 *
 * That leaves two redo paths, both explicit: `override`, which redoes machine
 * translations, and naming a release with `+changelog:<version>`, which has
 * already answered the question "which of these do I redo?".
 */
export function changelogNeedsTranslation(
    target: string | undefined,
    override: boolean,
    /** Whether `+changelog:<version>` named the release this text belongs to. */
    named = false,
): boolean {
    if (target === undefined) return true;
    if (override && named) return true;
    return override && isMachineTranslated(target);
}

/**
 * Whether a piece of markup parses as markup across its whole length.
 *
 * The rule `checkHowToBody` enforces, for the same reason: an unclosed `\`, a
 * lone backtick, or a stray `¶` ends the document early, and everything after
 * it is silently dropped rather than reported. A model that loses a delimiter
 * mid-sentence produces exactly this, so a translation that fails here is
 * refused instead of stored.
 *
 * Unlike `checkHowToBody` this compares *lengths* rather than requiring an
 * exact round trip, because a changelog entry is a markup fragment rather than
 * a whole document: an entry that quotes a `¶` inside an example re-serializes
 * with one delimiter more than it started with, which is a printing artifact
 * and not a truncation. Only a short re-serialization means text was lost.
 */
export function coveredLength(markup: string): {
    covered: number;
    total: number;
} {
    const body = withoutColorSelector(markup);
    const [parsed, spaces] = toMarkup(body);
    return { covered: parsed.toWordplay(spaces).length, total: body.length };
}

function coversItsMarkup(markup: string): boolean {
    const { covered, total } = coveredLength(markup);
    return covered >= total;
}

/** Translate and repair one locale's changelog translations. */
export async function verifyChangelog(
    log: Log,
    locale: string,
    language: LanguageCode,
    regions: RegionCode[],
    translateContent: boolean,
    override: boolean,
    /** Release versions to narrow the pass to (e.g. `+changelog:0.35.0`).
     *  Empty or undefined = every dated release. */
    versions?: string[],
    /** The run's shared backend, so its memo and usage accounting span the
     *  whole locale run rather than starting fresh here. */
    translator?: Translator,
    /** The locale's text, so changelog prose shares the locale run's system
     *  prompt (one cache entry) and the locale's own `guidance` conventions. */
    localeText?: LocaleText,
    /** Verify never writes; fix and translate do. */
    fix = false,
): Promise<void> {
    const bundle = readStructuralBundle();
    if (bundle === undefined) {
        log.bad(
            `No ${StructuralPath} to read. Run "npm run updates" to build it from CHANGELOG.md.`,
        );
        return;
    }

    // en-US is the source, but its markup is generated rather than authored, so
    // it is the one locale whose *English* is worth checking: a CHANGELOG entry
    // with an odd number of `\` produces markup that stops early, and every
    // translation would then be made from the truncated half.
    if (locale === 'en-US') {
        for (const [id, markup] of bundleTexts(bundle)) {
            const { covered, total } = coveredLength(markup);
            if (covered < total)
                log.bad(
                    `A changelog entry (${id}) stops being markup after ${covered} of ${total} characters, so the rest never renders: "${markup.slice(0, 80)}…". Something in CHANGELOG.md opens a container that never closes — a lone backtick (double it), or an odd number of \`\\\`. Quote markup you mean literally inside backticks.`,
                );
        }
        return;
    }

    const wanted = bundleTexts(bundle);
    const named = new Set<string>();
    if (versions !== undefined && versions.length > 0) {
        const versionSet = new Set(versions);
        for (const release of bundle.updates)
            if (versionSet.has(release.version))
                for (const text of releaseTexts(release)) named.add(text.id);
        if (named.size === 0)
            log.warning(
                `No release matched ${versions.map((v) => `"${v}"`).join(', ')}; nothing to translate.`,
            );
    }

    // Anything named is what we act on; otherwise every dated release's text.
    const texts =
        named.size > 0
            ? [...wanted].filter(([id]) => named.has(id))
            : [...wanted];

    // Drop translations whose English no longer exists — an entry that was
    // edited after release gets a new id, and the old one is dead weight.
    const live = allBundleIds(bundle);
    const existing = readTranslations(locale);
    const entries: Record<string, string> = {};
    let orphans = 0;
    for (const [id, value] of Object.entries(existing)) {
        if (live.has(id)) entries[id] = value;
        else orphans++;
    }

    // Mend the code in translations already on disk. Localizing an example is
    // right when it renames a definition and wrong when it rewrites anything
    // else, and the entries most likely to carry code are the ones *about*
    // syntax — so this is where a translation quietly loses its own subject.
    let mended = 0;
    if (fix || translateContent)
        for (const [id, markup] of wanted) {
            const value = entries[id];
            if (value === undefined) continue;
            const repaired = restoreExampleSyntax(
                markup,
                withoutAnnotations(value),
            );
            if (repaired !== withoutAnnotations(value)) {
                entries[id] = `${MachineTranslated}${repaired}`;
                mended++;
            }
        }
    if (mended > 0)
        log.say(`Restored the code in ${mended} changelog translations.`);

    const save = async () =>
        writeFormatted(
            updatesFilePath(locale),
            JSON.stringify({ format: BundleFormat, entries }, null, 4),
            fix || translateContent,
            log,
        );

    const todo = texts.filter(([id]) =>
        changelogNeedsTranslation(entries[id], override, named.has(id)),
    );

    if (!translateContent) {
        if (orphans > 0)
            log.warning(
                `${orphans} changelog translations no longer match any entry. Run "npm run locales-fix" to drop them.`,
            );
        if (todo.length > 0)
            log.say(
                `${todo.length} of ${texts.length} changelog entries are not translated yet. Run "npm run locales-translate +changelog" to fill them.`,
            );
        if (orphans > 0 || mended > 0) await save();
        return;
    }

    if (todo.length === 0) {
        if (orphans > 0 || mended > 0) await save();
        return;
    }

    const backend = translator ?? getTranslator();
    const targetLocale = await backend.getTargetLocale(language, regions);

    log.say(`Translating ${todo.length} changelog entries.`);
    let refused = 0;
    for (let start = 0; start < todo.length; start += CheckpointTexts) {
        const slice = todo.slice(start, start + CheckpointTexts);
        const translations = await backend.translate(
            log,
            slice.map(([, markup]) => markup),
            'en-US',
            targetLocale,
            localeText,
        );
        // A hard backend failure: stop rather than burn the rest of the budget
        // reproducing it. What already landed is written and skipped next run.
        if (translations === undefined) break;

        slice.forEach(([id], index) => {
            const translated = translations[index];
            // Null means the translator refused this one — a lost delimiter, a
            // dropped link. Leave the id absent so the page falls back to
            // English and the next run tries again.
            if (translated === null || translated === undefined) return;
            const trimmed = translated.trim();
            if (trimmed === '') return;
            if (!coversItsMarkup(trimmed)) {
                refused++;
                return;
            }
            const english = wanted.get(id);
            entries[id] = `${MachineTranslated}${
                english === undefined
                    ? trimmed
                    : restoreExampleSyntax(english, trimmed)
            }`;
        });

        await save();
    }

    if (refused > 0)
        log.warning(
            `${refused} changelog translations stopped being markup partway through and were left untranslated.`,
        );
}
