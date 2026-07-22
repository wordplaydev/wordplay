import type { Handle } from '@sveltejs/kit';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
    SupportedLocales,
    type SupportedLocale,
} from '@locale/SupportedLocales';
import { withoutAnnotations } from '@locale/withoutAnnotations';

type FallbackStrings = {
    wordplay: string;
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
    const parsed = JSON.parse(raw) as {
        glossary?: { wordplay?: { word?: string } };
        system?: Partial<Omit<FallbackStrings, 'wordplay'>>;
    };
    const strings: FallbackStrings = {
        wordplay: withoutAnnotations(parsed.glossary?.wordplay?.word ?? ''),
        noscript: withoutAnnotations(parsed.system?.noscript ?? ''),
        unsupportedHeading: withoutAnnotations(
            parsed.system?.unsupportedHeading ?? '',
        ),
        unsupportedBody: withoutAnnotations(
            parsed.system?.unsupportedBody ?? '',
        ),
    };

    // Fall back to en-US for any missing strings (e.g., a draft locale that
    // hasn't had `npm run locales-translate` run yet).
    if (
        locale !== 'en-US' &&
        (!strings.wordplay ||
            !strings.noscript ||
            !strings.unsupportedHeading ||
            !strings.unsupportedBody)
    ) {
        const fallback = loadFallback('en-US');
        if (!strings.wordplay) strings.wordplay = fallback.wordplay;
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
    return SupportedLocales.includes(first as SupportedLocale)
        ? first
        : 'en-US';
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
    const noscript = escapeHtml(strings.noscript);
    const unsupportedHeading = escapeHtml(strings.unsupportedHeading);
    const unsupportedBody = escapeHtml(strings.unsupportedBody);

    return resolve(event, {
        transformPageChunk: ({ html }) =>
            html
                .replaceAll('%wordplay.wordplay%', wordplay)
                .replaceAll('%wordplay.system.noscript%', noscript)
                .replaceAll(
                    '%wordplay.system.unsupportedHeading%',
                    unsupportedHeading,
                )
                .replaceAll(
                    '%wordplay.system.unsupportedBody%',
                    unsupportedBody,
                ),
    });
};
