import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import {
    SupportedLocales,
    type SupportedLocale,
} from '@locale/SupportedLocales';

export const load = ({ params, url }: { params: Record<string, string>; url: URL }) => {
    // Don't redirect during SSR / prerender — only the browser can read localStorage.
    if (!browser) return {};

    const localeParam = params.locale as string | undefined;

    // The locale segment may contain multiple locales joined by '+' (e.g. "en-US+es-MX").
    const parsed = localeParam ? localeParam.split('+') : [];
    const allValid =
        parsed.length > 0 &&
        parsed.every((l) => SupportedLocales.includes(l as SupportedLocale));

    if (allValid) {
        return { locale: localeParam };
    }

    // Missing locale: don't redirect — keep the URL clean so it stays shareable.
    // The Database falls back to localStorage (or en-US) on its own, so the page
    // still renders in the user's preferred language.
    if (!localeParam) {
        return {};
    }

    // Invalid locale segment: strip it and redirect to a valid one so we don't
    // serve a 404-y URL. Prefer localStorage, then en-US.
    let fallback = 'en-US';
    try {
        const stored: unknown = JSON.parse(localStorage.getItem('locales') ?? '[]');
        if (Array.isArray(stored) && stored.length > 0) {
            const valid = (stored as string[]).filter((l) =>
                SupportedLocales.includes(l as SupportedLocale),
            );
            if (valid.length > 0) fallback = valid.join('+');
        }
    } catch {
        // ignore
    }

    const pathWithoutLocale = url.pathname.slice(('/' + localeParam).length) || '/';
    const target = `/${fallback}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}${url.search}`;
    redirect(307, target);
};
