import { landingLocations } from '#components/concepts/guidePath.ts';
import { SupportedLocales } from '#locale/SupportedLocales.ts';
import type { EntryGenerator } from './$types';

/**
 * Every section's landing, prerendered in every locale, so a crawler finds an index of
 * the guide and a reader refreshing a landing sees it at once. The matchers keep this
 * route to section and subsection slugs; every other guide path is `[...location]`.
 */
export const prerender = true;

export const entries: EntryGenerator = () =>
    landingLocations().flatMap((location) => [
        location,
        ...SupportedLocales.map((locale) => ({ locale, ...location })),
    ]);
