import { isRecord } from './shared/guards.js';

/**
 * How an override key from `LocalizationDexie` becomes a write into a locale
 * JSON file. Extracted from `submitLocalization` so it can be tested: the whole
 * bundle is applied or rejected together, so a mistake here fails a
 * contributor's entire submission.
 *
 * The client has its own copy of `parseOverrideKey` — `functions/` compiles
 * with `rootDir: "src"`, so the two packages can't share a module. The cases in
 * `localeEditPaths.test.ts` are mirrored in the client's test so a drift shows
 * up as a failing assertion rather than a rejected bundle in production.
 */

/** Defensive caps on a list-valued edit, so a malformed submission can't turn
 *  a glossary term into a dictionary. */
export const ListLimits = {
    /** Forms one term may declare. */
    maxItems: 50,
    /** Characters in one form. */
    maxItemLength: 100,
};

/** The write-status annotations, which a locale-owned list never carries. */
const Annotations = ['$?', '$!', '$~'];

/**
 * The paths whose whole value a contributor may replace with a list.
 *
 * Only a glossary term's `forms` — the plurals, conjugations, and synonyms a
 * `@reference` may use, which each locale writes for itself and whose count is
 * its own business. Everything else is either a translation of an en-US string
 * or a positional tuple whose length must match en-US, and an unrestricted list
 * write would let any signed-in caller shrink one.
 */
const ListEditPath = /^glossary\.[A-Za-z][A-Za-z0-9]*\.forms$/;

export function isListEditPath(path: string): boolean {
    return ListEditPath.test(path);
}

/** Parse an override key into (basePath, optional tuple index). Mirrors the
 *  client-side parseOverrideKey: a trailing all-digit segment is treated as
 *  an array index. */
export function parseOverrideKey(key: string): {
    path: string;
    index: number | undefined;
} {
    const lastDot = key.lastIndexOf('.');
    const tail = lastDot === -1 ? '' : key.slice(lastDot + 1);
    if (lastDot !== -1 && /^\d+$/.test(tail)) {
        return { path: key.slice(0, lastDot), index: parseInt(tail, 10) };
    }
    return { path: key, index: undefined };
}

/** Walk a record along dotted segments and return the leaf value, or undefined
 *  if any step fails. */
export function resolveAtPath(
    root: Record<string, unknown>,
    path: string,
): unknown {
    let node: unknown = root;
    for (const seg of path.split('.').filter((s) => s.length > 0)) {
        if (!isRecord(node)) return undefined;
        node = node[seg];
    }
    return node;
}

/** Coerce a resolved en-US value into a single display string for the PR table.
 *  Locale leaves can be plain strings, tuple-element strings (selected by `index`),
 *  or paragraph arrays (`FormattedText[]`) edited as a single combined value — the
 *  last case has no index, so we join paragraphs with blank lines. Anything else
 *  (object, mismatched index, missing path) collapses to empty. */
export function englishDisplay(
    value: unknown,
    index: number | undefined,
): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
        if (index !== undefined) {
            const item = value[index];
            return typeof item === 'string' ? item : '';
        }
        if (value.every((v) => typeof v === 'string'))
            return value.join('\n\n');
    }
    return '';
}

/** A list-valued edit as a maintainer reads it in the PR table: a word list on
 *  one line, rather than the JSON the wire carries. */
export function listDisplay(value: unknown): string {
    return Array.isArray(value)
        ? value.filter((v) => typeof v === 'string').join(', ')
        : '';
}

/** Reject a list a locale should never contain. Throws rather than repairing,
 *  since every one of these means the client sent something it never should. */
function checkList(path: string, value: string[]): void {
    if (!isListEditPath(path))
        throw new Error(`${path} is not a path whose whole list may be set`);
    if (value.length > ListLimits.maxItems)
        throw new Error(`Too many entries for ${path}`);
    const seen = new Set<string>();
    for (const item of value) {
        if (typeof item !== 'string')
            throw new Error(`Entry of ${path} is not a string`);
        if (item.length > ListLimits.maxItemLength)
            throw new Error(`Entry of ${path} is too long`);
        if (Annotations.some((annotation) => item.includes(annotation)))
            throw new Error(
                `Entry "${item}" of ${path} carries a write status; a list a locale writes for itself is never translated`,
            );
        const word = item.trim();
        if (word.length === 0) throw new Error(`Entry of ${path} is empty`);
        // Folded the way `foldGlossaryForm` does, so two spellings that resolve
        // to one reference can't both be stored.
        const folded = word.normalize('NFC').toLowerCase();
        if (seen.has(folded))
            throw new Error(`Entry "${word}" of ${path} is a duplicate`);
        seen.add(folded);
    }
}

/**
 * Walk a record along dotted segments (and an optional tuple index) and
 * assign `value`. Throws if the path doesn't exist; we'd rather fail loudly
 * than silently drop a contributor's edit. Array assignments require the
 * index to be in-bounds.
 *
 * A list value replaces the whole leaf, which is what lets a locale adopt a
 * glossary term's `forms` for the first time — the key is absent until then,
 * and an empty list removes it again, leaving the file as the locale verifier's
 * own repair would.
 */
export function setAtPath(
    root: Record<string, unknown>,
    path: string,
    index: number | undefined,
    value: string | string[],
): void {
    const segments = path.split('.').filter((s) => s.length > 0);
    if (segments.length === 0) throw new Error(`Empty path: ${path}`);
    let node: unknown = root;
    for (const [i, segment] of segments.slice(0, -1).entries()) {
        if (!isRecord(node))
            throw new Error(
                `Cannot descend into ${segments.slice(0, i).join('.')}`,
            );
        node = node[segment];
    }
    if (!isRecord(node)) throw new Error(`Parent of ${path} is not an object`);
    // The path has at least one segment, checked above.
    const leafKey = segments[segments.length - 1];
    if (leafKey === undefined) throw new Error(`Empty path: ${path}`);
    const parent = node;

    if (Array.isArray(value)) {
        if (index !== undefined)
            throw new Error(`${path} cannot take both a list and an index`);
        checkList(path, value);
        if (value.length === 0) delete parent[leafKey];
        else parent[leafKey] = value.map((item) => item.trim());
        return;
    }

    if (index === undefined) {
        parent[leafKey] = value;
        return;
    }

    const target = parent[leafKey];
    if (!Array.isArray(target))
        throw new Error(`${path} is not an array; can't set index ${index}`);
    if (index < 0 || index >= target.length)
        throw new Error(`Index ${index} out of bounds for ${path}`);
    target[index] = value;
}

/**
 * Which section file a locale path lives in.
 *
 * A locale's text is authored as eight files under `sections/`, and
 * `<code>.json` is a build artifact that is not in the repository at all — so a
 * submission that wrote to it would open a pull request against a file that
 * does not exist. This is a second copy of the rule in
 * `src/util/verify-locales/localeFiles.ts`, for the same reason
 * `parseOverrideKey` is duplicated: `functions/` compiles with its own
 * `rootDir` and cannot import from `src/`. `localeEditPaths.test.ts` mirrors
 * the client's cases so a drift fails a test rather than a contributor's
 * submission.
 */
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

const SectionByTopLevelKey: Record<string, LocaleSection> = {
    node: 'node.json',
    basis: 'basis.json',
    input: 'input.json',
    output: 'output.json',
    token: 'token-keyword.json',
    keyword: 'token-keyword.json',
};

export function sectionFileFor(path: string): LocaleSection {
    const segments = path.split('.').filter((segment) => segment.length > 0);
    const [first, second] = segments;
    if (first === 'ui') return second === 'page' ? 'ui-page.json' : 'ui.json';
    return (
        (first === undefined ? undefined : SectionByTopLevelKey[first]) ??
        'locale.json'
    );
}

/** Where a section file lives. en-US is the exception, as it always was. */
export function localeSectionPath(
    locale: string,
    section: LocaleSection,
): string {
    return locale === 'en-US'
        ? `src/locale/en-US/sections/${section}`
        : `static/locales/${locale}/sections/${section}`;
}

/** The part of an assembled locale belonging to one section, ready to write
 *  back. Mirrors `splitLocale`: `ui` is the one key split at its second level. */
export function sliceForSection(
    assembled: Record<string, unknown>,
    section: LocaleSection,
): Record<string, unknown> {
    const slice: Record<string, unknown> = {};
    for (const key of Object.keys(assembled)) {
        if (key === '$schema') continue;
        const value = assembled[key];
        if (key === 'ui' && isRecord(value)) {
            const ui: Record<string, unknown> = {};
            for (const uiKey of Object.keys(value))
                if ((uiKey === 'page' ? 'ui-page.json' : 'ui.json') === section)
                    ui[uiKey] = value[uiKey];
            if (Object.keys(ui).length > 0) slice['ui'] = ui;
        } else if (sectionFileFor(key) === section) slice[key] = value;
    }
    return slice;
}

/**
 * Merge section files into one locale document.
 *
 * The inverse of `sliceForSection`, and the half that is easy to get wrong:
 * `ui` arrives in two files and has to be merged rather than replaced, or an
 * edit to `ui.dialog` would silently drop every `ui.page` string it was
 * submitted alongside.
 */
export function mergeSections(
    sections: { json: Record<string, unknown> }[],
): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const { json } of sections)
        for (const key of Object.keys(json)) {
            if (key === '$schema') continue;
            const value = json[key];
            const existing = merged[key];
            if (key === 'ui' && isRecord(value) && isRecord(existing))
                Object.assign(existing, value);
            else merged[key] = value;
        }
    return merged;
}
