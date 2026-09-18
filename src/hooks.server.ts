import type { Handle } from '@sveltejs/kit';
import { isRecord } from '@util/guards';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getManifestPath, isSupportedLocale } from '@locale/SupportedLocales';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { LocaleAssetHashes } from '@db/locales/localeAssets.generated';

type FallbackStrings = {
    wordplay: string;
    imageDescription: string;
    noscript: string;
    unsupportedHeading: string;
    unsupportedBody: string;
};

const fallbackByLocale = new Map<string, FallbackStrings>();

/**
 * The one section holding everything this hook injects.
 *
 * Both `glossary.wordplay.word` and the four `system.*` strings live in
 * `sections/locale.json`, which is ~5KB — the assembled `<code>.json` this used
 * to read is 650KB-1.1MB, parsed in full to pull out six strings. It is also a
 * build artifact rather than a source file, so reading the section means a
 * prerender no longer depends on `npm run locales-assemble` having run first.
 */
function getLocaleFilePath(locale: string): string {
    return locale === 'en-US'
        ? path.join('src', 'locale', 'en-US', 'sections', 'locale.json')
        : path.join('static', 'locales', locale, 'sections', 'locale.json');
}

function loadFallback(locale: string): FallbackStrings {
    const cached = fallbackByLocale.get(locale);
    if (cached) return cached;

    const filePath = getLocaleFilePath(locale);
    const raw = readFileSync(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    // Read as data: this runs before the app, against a file on disk, and an
    // absent field falls back to English below rather than failing the render.
    const glossary = isRecord(parsed) ? parsed.glossary : undefined;
    const wordplay = isRecord(glossary) ? glossary.wordplay : undefined;
    const system = isRecord(parsed) ? parsed.system : undefined;
    const text = (value: unknown) =>
        typeof value === 'string' ? value : undefined;
    const strings: FallbackStrings = {
        wordplay: withoutAnnotations(
            (isRecord(wordplay) ? text(wordplay.word) : undefined) ?? '',
        ),
        imageDescription: withoutAnnotations(
            (isRecord(system) ? text(system.imageDescription) : undefined) ??
                '',
        ),
        noscript: withoutAnnotations(
            (isRecord(system) ? text(system.noscript) : undefined) ?? '',
        ),
        unsupportedHeading: withoutAnnotations(
            (isRecord(system) ? text(system.unsupportedHeading) : undefined) ??
                '',
        ),
        unsupportedBody: withoutAnnotations(
            (isRecord(system) ? text(system.unsupportedBody) : undefined) ?? '',
        ),
    };

    // Fall back to en-US for any missing strings (e.g., a draft locale that
    // hasn't had `npm run locales-translate` run yet).
    if (
        locale !== 'en-US' &&
        (!strings.wordplay ||
            !strings.imageDescription ||
            !strings.noscript ||
            !strings.unsupportedHeading ||
            !strings.unsupportedBody)
    ) {
        const fallback = loadFallback('en-US');
        if (!strings.wordplay) strings.wordplay = fallback.wordplay;
        if (!strings.imageDescription)
            strings.imageDescription = fallback.imageDescription;
        if (!strings.noscript) strings.noscript = fallback.noscript;
        if (!strings.unsupportedHeading)
            strings.unsupportedHeading = fallback.unsupportedHeading;
        if (!strings.unsupportedBody)
            strings.unsupportedBody = fallback.unsupportedBody;
    }

    fallbackByLocale.set(locale, strings);
    return strings;
}

function pickLocale(param: string | undefined): string {
    if (!param) return 'en-US';
    const first = param.split('+')[0];
    return first !== undefined && isSupportedLocale(first) ? first : 'en-US';
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

/**
 * The content hashes a first paint could need, for the inline preload script.
 *
 * Nothing tells the browser a locale file exists until the JS bundle has loaded
 * and `LocalesDatabase`'s constructor runs — measured on production at ~330ms
 * after the first JS request, with 65 of 66 JS requests issued ahead of it.
 * `locale-preload.js` fixes that by fetching the file while the document is
 * still parsing and leaving it for `LocalesDatabase`, but it is a static file
 * and cannot read `localeAssets.generated.ts` — and a fetch without the `?v=`
 * hash is a *different URL* from the one `versioned()` will ask for, so it
 * would be handed nothing and fetch the file a second time.
 *
 * Hence this: the hashes travel in the document, which is the only thing that
 * knows both. Each locale's main document and its date/time companion, the two
 * `loadLocale` asks for together — about 470 bytes compressed, and the whole
 * 216-entry table would be self-defeating.
 *
 * This goes in the shell (`200.html`) as much as in any prerendered page,
 * which matters: Firebase rewrites every locale-prefixed route to the shell, so
 * the shell is what a reader at `/es-MX` actually gets.
 */
function localeAssetHashes(): string {
    const hashes: Record<string, { m: string; d?: string }> = {};
    for (const [path, hash] of Object.entries(LocaleAssetHashes)) {
        const match = /^\/locales\/([^/]+)\/\1(-datetimes)?\.json$/.exec(path);
        const code = match?.[1];
        if (code === undefined || code === 'en-US') continue;
        const entry = (hashes[code] ??= { m: '' });
        if (match?.[2] === undefined) entry.m = hash;
        else entry.d = hash;
    }
    // Only codes whose main document we can actually name.
    for (const [code, entry] of Object.entries(hashes))
        if (entry.m === '') delete hashes[code];
    // `<` cannot appear in a hash or a locale code, but the value is being
    // written into a script element, so it is escaped rather than trusted.
    const json = JSON.stringify(hashes).replaceAll('<', '\\u003c');
    return `<script>window.__localeAssets=${json}</script>`;
}

export const handle: Handle = async ({ event, resolve }) => {
    const locale = pickLocale(event.params.locale);
    const strings = loadFallback(locale);
    const wordplay = escapeHtml(strings.wordplay);
    const imageDescription = escapeHtml(strings.imageDescription);
    const noscript = escapeHtml(strings.noscript);
    const unsupportedHeading = escapeHtml(strings.unsupportedHeading);
    const unsupportedBody = escapeHtml(strings.unsupportedBody);
    // pickLocale already reduced this to a supported code, so it names a
    // manifest the locale generator wrote.
    const manifest = escapeHtml(getManifestPath(locale));

    return resolve(event, {
        transformPageChunk: ({ html }) =>
            html
                .replaceAll('%wordplay.wordplay%', wordplay)
                .replaceAll(
                    '%wordplay.system.imageDescription%',
                    imageDescription,
                )
                .replaceAll('%wordplay.system.noscript%', noscript)
                .replaceAll(
                    '%wordplay.system.unsupportedHeading%',
                    unsupportedHeading,
                )
                .replaceAll(
                    '%wordplay.system.unsupportedBody%',
                    unsupportedBody,
                )
                .replaceAll('%wordplay.localeassets%', localeAssetHashes())
                .replaceAll('%wordplay.system.manifest%', manifest),
    });
};
