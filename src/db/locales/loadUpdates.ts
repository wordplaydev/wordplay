import type { SupportedLocale } from '@locale/SupportedLocales';
import versioned from '@db/locales/versioned';

/**
 * One locale's changelog translations, keyed by the entry ids in
 * `static/updates.json`.
 *
 * Its own module rather than a method on `LocalesDatabase` because only the
 * updates page ever wants this, and that class is on every page's import graph
 * — the landing page's budget is measured to the kilobyte (importGraph.test.ts).
 *
 * Empty for en-US, which *is* the source, and empty when a locale has no bundle
 * yet: the page falls back to English per entry, so a partly translated archive
 * renders correctly rather than not at all.
 */
const loading: Partial<
    Record<SupportedLocale, Promise<Record<string, string>>>
> = {};

export default function loadUpdates(
    locale: SupportedLocale,
): Promise<Record<string, string>> {
    if (locale === 'en-US') return Promise.resolve({});
    const existing = loading[locale];
    if (existing !== undefined) return existing;
    const promise = fetch(
        versioned(`/locales/${locale}/${locale}-updates.json`),
    )
        .then(async (response) => {
            if (!response.ok) return {};
            const bundle = (await response.json()) as {
                entries?: Record<string, string>;
            };
            return bundle.entries ?? {};
        })
        .catch(() => ({}) as Record<string, string>);
    loading[locale] = promise;
    return promise;
}
