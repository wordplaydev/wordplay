import type { Handle } from '@sveltejs/kit';
import { isRecord } from '@util/guards';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getManifestPath, isSupportedLocale } from '@locale/SupportedLocales';
import { withoutAnnotations } from '@locale/withoutAnnotations';

type FallbackStrings = {
    wordplay: string;
    imageDescription: string;
    noscript: string;
    unsupportedHeading: string;
    unsupportedBody: string;
};

const fallbackByLocale = new Map<string, FallbackStrings>();

function getLocaleFilePath(locale: string): string {
    return locale === 'en-US'
        ? path.join('src', 'locale', 'en-US.json')
        : path.join('static', 'locales', locale, `${locale}.json`);
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
                .replaceAll('%wordplay.system.manifest%', manifest),
    });
};
