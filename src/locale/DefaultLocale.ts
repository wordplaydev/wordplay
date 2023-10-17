import en from '../locale/en-US.json';
import type Locale from './Locale';
import Locales from './Locales';

const DefaultLocale = en as unknown as Locale;

export const DefaultLocales = new Locales([DefaultLocale], DefaultLocale);

export default DefaultLocale;
