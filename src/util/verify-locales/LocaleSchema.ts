import type LocaleText from '@locale/LocaleText';
import { isLocaleText } from '@locale/isLocaleText';
import { must } from '@util/nullable';
import fs from 'fs';
import path from 'path';
import { getObjectFromJSONFile } from '@util/verify-locales/getObjectFromJSONFile';
import Log from '@util/verify-locales/Log';
import Validator from '@util/verify-locales/Validator';

// Read in and compile the two schema so we can check files.
const LocaleSchema = JSON.parse(
    fs.readFileSync('static/schemas/LocaleText.json', 'utf8'),
);
export default LocaleSchema;

// Create a validator function. Typed, so that a value it accepts is a LocaleText.
export const LocaleValidator = Validator.compile<LocaleText>(LocaleSchema);

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

/**
 * The locale file as a LocaleText, or undefined when it is missing or is not
 * shaped like one at the top level. Only the top level is checked here, since
 * the verifier repairs what the schema finds missing below it; a file that
 * isn't a locale at all is what this refuses.
 */
export function readLocaleText(
    log: Log,
    locale: string,
): LocaleText | undefined {
    const json = getLocaleJSON(log, locale);
    return isLocaleText(json) ? json : undefined;
}

/** We use this for repair. Make sure it's valid before we do any repairs. */
export const DefaultLocale: LocaleText = must(
    readLocaleText(new Log(false), 'en-US'),
    'the en-US locale file',
);
