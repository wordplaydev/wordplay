import fs from 'fs';
import path from 'path';
import type Log from '@util/verify-locales/Log';
import { getObjectFromJSONFile } from '@util/verify-locales/getObjectFromJSONFile';
import writeFormatted from '@util/verify-locales/writeFormatted';

/**
 * Where a locale's text lives on disk, and how it becomes one `LocaleText`.
 *
 * A locale document is authored as several section files rather than one
 * ~700KB-1.1MB JSON, because one file is what makes a long-lived branch
 * unmergeable: a typical locale commit changes a median of 23 lines, and every
 * one of them lands in the same file every other contributor is also editing.
 *
 * The split is deliberately confined to *this module*. Everything downstream —
 * all seventeen checks in `verifyLocale`, every `pair.top()` and
 * `segments[0] === '…'` depth guard, `LocaleValidator`, `classifyLocalePath`,
 * `resolveDescription`, `DECLARED_INPUTS` — keeps taking a whole assembled
 * `LocaleText`, because the deep assumption in the tooling is not *one file*
 * but *one root*: `LocalePath` is a dotted path from the `LocaleText` root with
 * no document field, consumed positionally by dozens of modules. Splitting the
 * path model instead of the I/O seam would have meant touching all of them.
 */

/** The section files a locale is authored in. */
export const LocaleSections = [
    'locale.json',
    'ui.json',
    'ui-page.json',
    'node.json',
    'basis.json',
    'input.json',
    'output.json',
    'token-keyword.json',
] as const;

export type LocaleSection = (typeof LocaleSections)[number];

/** Top-level keys that get a file of their own. Everything not named here, and
 *  not under `ui`, belongs to `locale.json` — the small keys (`language`,
 *  `glossary`, `moderation`, …) that are read together anyway. */
const SectionByTopLevelKey: Record<string, LocaleSection> = {
    node: 'node.json',
    basis: 'basis.json',
    input: 'input.json',
    output: 'output.json',
    // Two small sibling vocabularies, kept together rather than given a
    // 600-byte file each.
    token: 'token-keyword.json',
    keyword: 'token-keyword.json',
};

/**
 * Which section file a locale path belongs in.
 *
 * `ui` is the one key split at its second level: it is 38% of a locale on its
 * own, and `ui.page` is nearly half of that, so leaving them together would
 * leave the biggest file nearly as big as the monolith it replaced.
 */
export function sectionFileFor(
    localePath: readonly (string | number)[] | string,
): LocaleSection {
    const segments =
        typeof localePath === 'string'
            ? localePath.split('.').filter((segment) => segment.length > 0)
            : localePath.map((segment) => `${segment}`);

    const [first, second] = segments;
    if (first === 'ui') return second === 'page' ? 'ui-page.json' : 'ui.json';
    return (
        (first === undefined ? undefined : SectionByTopLevelKey[first]) ??
        'locale.json'
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Split an assembled locale into its section files.
 *
 * Insertion order is the source's own, never sorted: locales do not agree on
 * the order of their top-level keys (en-US ends `…gallery, system, keyword`,
 * es-MX ends `…keyword, photosensitivity, musicsafety`), and re-sorting would
 * turn the first write after the split into a whole-file diff for every locale.
 */
export function splitLocale(text: object): Map<LocaleSection, object> {
    const sections = new Map<LocaleSection, object>();

    const put = (section: LocaleSection, key: string, value: unknown): void => {
        const existing = sections.get(section);
        const target = isRecord(existing) ? existing : {};
        Reflect.set(target, key, value);
        sections.set(section, target);
    };

    for (const key of Object.keys(text)) {
        const value: unknown = Reflect.get(text, key);
        // `$schema` is per-file: each section points at its own definition, so
        // the source document's one is dropped rather than copied into eight.
        if (key === '$schema') continue;
        if (key === 'ui' && isRecord(value)) {
            for (const uiKey of Object.keys(value)) {
                const uiValue: unknown = Reflect.get(value, uiKey);
                const section: LocaleSection =
                    uiKey === 'page' ? 'ui-page.json' : 'ui.json';
                const existing = sections.get(section);
                const container = isRecord(existing) ? existing : {};
                const ui = Reflect.get(container, 'ui');
                const uiTarget = isRecord(ui) ? ui : {};
                Reflect.set(uiTarget, uiKey, uiValue);
                Reflect.set(container, 'ui', uiTarget);
                sections.set(section, container);
            }
        } else put(sectionFileFor([key]), key, value);
    }

    return sections;
}

/**
 * Put a locale back together from its sections.
 *
 * A locale may legitimately lack a top-level key — several ship without
 * `guidance`, `keyword`, `musicsafety` or `photosensitivity` — so an absent
 * section is an absent key, never an invented empty one.
 */
export function assembleLocale(
    sections: ReadonlyMap<LocaleSection, object>,
): object {
    const assembled: Record<string, unknown> = {};

    for (const section of LocaleSections) {
        const contents = sections.get(section);
        if (contents === undefined) continue;
        for (const key of Object.keys(contents)) {
            const value: unknown = Reflect.get(contents, key);
            if (key === '$schema') continue;
            if (key === 'ui' && isRecord(value)) {
                const existing = assembled['ui'];
                const ui = isRecord(existing) ? existing : {};
                for (const uiKey of Object.keys(value))
                    Reflect.set(ui, uiKey, Reflect.get(value, uiKey));
                assembled['ui'] = ui;
            } else assembled[key] = value;
        }
    }

    return assembled;
}

/** Where a locale's files live. en-US sits in `src/` because it is imported. */
export function getLocaleDirectory(locale: string): string {
    return locale === 'en-US'
        ? path.join('src', 'locale', 'en-US')
        : path.join('static', 'locales', locale);
}

export function getSectionPath(locale: string, section: LocaleSection): string {
    return path.join(getLocaleDirectory(locale), 'sections', section);
}

/** The single-document path, which sections replace. Kept so the transition can
 *  be read and written from either shape. */
export function getMonolithPath(locale: string): string {
    return locale === 'en-US'
        ? path.join('src', 'locale', 'en-US.json')
        : path.join('static', 'locales', locale, `${locale}.json`);
}

/** Whether this locale has been split yet. */
export function hasSections(locale: string): boolean {
    return fs.existsSync(getSectionPath(locale, 'locale.json'));
}

/**
 * Read a locale as one `LocaleText`, from sections where they exist and from
 * the single document where they do not.
 *
 * The fallback is what lets the branch-migration tool run *before* the split:
 * it has to read a contributor's pre-split branch and write the post-split
 * shape, so both have to be readable by the same code at the same time.
 */
export function readLocale(log: Log, locale: string): object | undefined {
    if (!hasSections(locale))
        return getObjectFromJSONFile(log, getMonolithPath(locale));

    const sections = new Map<LocaleSection, object>();
    for (const section of LocaleSections) {
        const contents = getObjectFromJSONFile(
            log,
            getSectionPath(locale, section),
        );
        if (contents !== undefined) sections.set(section, contents);
    }
    return assembleLocale(sections);
}

/**
 * Write a locale: its section files, and the assembled document built from
 * them.
 *
 * The assembled file is a build artifact, not a source — but it is regenerated
 * here rather than only at build time so that every reader stays correct
 * without changing. That is what keeps this change small: the dozen places that
 * *read* a locale by path go on reading one file, and only the dozen that
 * *write* one had to move.
 *
 * `writeFormatted` skips a write whose formatted content already matches, so a
 * change that touched one section rewrites one file — which is the point, and
 * also why a translation checkpoint gets cheaper: it no longer re-serializes a
 * megabyte through Prettier to save one string.
 */
export async function writeLocale(
    log: Log,
    locale: string,
    text: object,
    write = true,
): Promise<boolean> {
    const sections = splitLocale(text);
    if (write)
        fs.mkdirSync(path.join(getLocaleDirectory(locale), 'sections'), {
            recursive: true,
        });

    let changed = false;
    for (const section of LocaleSections) {
        const contents = sections.get(section);
        // A locale may legitimately have nothing in a section — several ship
        // without `keyword` or `musicsafety` — and an empty file would read as
        // a claim that the key exists and is blank.
        if (contents === undefined) {
            const stale = getSectionPath(locale, section);
            if (write && fs.existsSync(stale)) {
                fs.unlinkSync(stale);
                changed = true;
            }
            continue;
        }
        const wrote = await writeFormatted(
            getSectionPath(locale, section),
            JSON.stringify(withSchema(locale, section, contents), null, 4),
            write,
            log,
        );
        changed = changed || wrote;
    }

    // Assembled from the sections just written, never from `text` directly.
    // Both are the same content, but not in the same key order — `text` carries
    // the order it was read in, and the sections impose their own. Two paths
    // emitting different bytes would flip the file's content hash back and
    // forth depending on which ran last, and under `versioned()` that means
    // every reader re-downloads their locale for a change that isn't one.
    const assembled = await writeAssembled(
        log,
        locale,
        assembleLocale(sections),
        write,
    );
    return changed || assembled;
}

/** Each section points at the schema for its own slice, so an editor validates
 *  what is in front of it. Depth differs: en-US sits under `src/`. */
function withSchema(
    locale: string,
    section: LocaleSection,
    contents: object,
): object {
    const up = locale === 'en-US' ? '../../../..' : '../../..';
    const name = section.replace(/\.json$/, '');
    return {
        $schema: `${up}/static/schemas/sections/${name}.json`,
        ...contents,
    };
}

/**
 * Write the assembled document the app and the tooling still read.
 *
 * Gitignored: it is derived from the sections, and committing it would put the
 * whole-file diff back into every locale change, which is the thing the split
 * exists to remove.
 */
export async function writeAssembled(
    log: Log,
    locale: string,
    text: object,
    write = true,
): Promise<boolean> {
    const rest: Record<string, unknown> = {};
    for (const key of Object.keys(text))
        if (key !== '$schema') rest[key] = Reflect.get(text, key);
    const schema =
        locale === 'en-US'
            ? '../../static/schemas/LocaleText.json'
            : '../../schemas/LocaleText.json';
    return writeFormatted(
        getMonolithPath(locale),
        JSON.stringify({ $schema: schema, ...rest }, null, 4),
        write,
        log,
    );
}
