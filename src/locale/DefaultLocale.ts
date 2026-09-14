import en from '@locale/en-US.json';
import type LocaleText from '@locale/LocaleText';
import { isLocaleText } from '@locale/isLocaleText';

/**
 * The locale every project falls back to, and the source the locale tooling
 * repairs against. Checked rather than asserted: `resolveJsonModule` infers a
 * shape from the file's current contents, which is not `LocaleText` — the
 * schema is what says a locale file is one, and `npm run locales` is what
 * checks it in full. The shallow check here catches a file that isn't a locale
 * at all, which nothing downstream could work with anyway.
 */
function readDefaultLocale(): LocaleText {
    const locale: unknown = en;
    if (!isLocaleText(locale))
        throw new Error('The bundled en-US locale is not a locale file.');
    return locale;
}

const DefaultLocale: LocaleText = readDefaultLocale();

export default DefaultLocale;
