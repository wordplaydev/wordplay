import { SupportedLocales } from '#locale/SupportedLocales.ts';
import type { EntryGenerator } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () =>
    SupportedLocales.map((locale) => ({ locale }));
