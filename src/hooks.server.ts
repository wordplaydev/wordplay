import type { Handle } from '@sveltejs/kit';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
    SupportedLocales,
    type SupportedLocale,
} from '@locale/SupportedLocales';
import { withoutAnnotations } from '@locale/withoutAnnotations';

type SystemStrings = {
    noscript: string;
    unsupportedHeading: string;
    unsupportedBody: string;
};

const systemByLocale = new Map<string, SystemStrings>();

function getLocaleFilePath(locale: string): string {
    return locale === 'en-US'
        ? path.join('src', 'locale', 'en-US.json')
        : path.join('static', 'locales', locale, `${locale}.json`);
}

function loadSystem(locale: string): SystemStrings {
    const cached = systemByLocale.get(locale);
    if (cached) return cached;

    const filePath = getLocaleFilePath(locale);
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as { system?: Partial<SystemStrings> };
    const system: SystemStrings = {
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
        (!system.noscript ||
            !system.unsupportedHeading ||
            !system.unsupportedBody)
    ) {
        const fallback = loadSystem('en-US');
        if (!system.noscript) system.noscript = fallback.noscript;
        if (!system.unsupportedHeading)
            system.unsupportedHeading = fallback.unsupportedHeading;
        if (!system.unsupportedBody)
            system.unsupportedBody = fallback.unsupportedBody;
    }

    systemByLocale.set(locale, system);
    return system;
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
    const system = loadSystem(locale);
    const noscript = escapeHtml(system.noscript);
    const unsupportedHeading = escapeHtml(system.unsupportedHeading);
    const unsupportedBody = escapeHtml(system.unsupportedBody);

    return resolve(event, {
        transformPageChunk: ({ html }) =>
            html
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
