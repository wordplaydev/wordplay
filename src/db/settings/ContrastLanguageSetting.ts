import Setting from '@db/settings/Setting';
import {
    DEFAULT_CONTRAST_LANGUAGE,
    parseContrastLanguage,
} from '../../tutorial/ContrastLanguage';

/** The programming language a creator wants tutorial examples contrasted against. Device-specific,
 * since it's a per-device preference; defaults to Python. */
export const ContrastLanguageSetting = new Setting<string>(
    'contrastLanguage',
    true,
    DEFAULT_CONTRAST_LANGUAGE,
    (value) => parseContrastLanguage(value),
    (current, value) => current === value,
);
