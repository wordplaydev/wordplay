import en from '../locale/en-US.json';
import type LocaleText from './LocaleText';
import Locales from './Locales';

const DefaultLocale = en as unknown as LocaleText;

export const DefaultLocales = new Locales([DefaultLocale], DefaultLocale);

export default DefaultLocale;
