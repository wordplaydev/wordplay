import fs from 'fs';
import path from 'path';
import Validator from './Validator';
import { getObjectFromJSONFile } from './getObjectFromJSONFile';
import Log from './Log';
import type LocaleText from '@locale/LocaleText';

// Read in and compile the two schema so we can check files.
const LocaleSchema = JSON.parse(
    fs.readFileSync('static/schemas/LocaleText.json', 'utf8'),
);
export default LocaleSchema;

// Create a validator function.
export const LocaleValidator = Validator.compile(LocaleSchema);

/** Get a locale file path from a locale name. */
export function getLocalePath(locale: string) {
    return locale === 'en-US'
        ? path.join('src', 'locale', 'en-US.json')
        : path.join('static', 'locales', locale, `${locale}.json`);
}

/** Get the locale JSON for the given locale. */
export function getLocaleJSON(log: Log, locale: string): unknown | undefined {
    return getObjectFromJSONFile(log, getLocalePath(locale));
}

/** We use this for repair. Make sure it's valid before we do any repairs. */
export const DefaultLocale = getLocaleJSON(new Log(), 'en-US') as LocaleText;
