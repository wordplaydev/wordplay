import { SupportedLocales } from '@locale/SupportedLocales';

export const prerender = true;

export const entries = () => SupportedLocales.map((locale) => ({ locale }));
