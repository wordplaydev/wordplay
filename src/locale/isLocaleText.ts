import type LocaleText from '@locale/LocaleText';
import { isRecord } from '@util/guards';

/**
 * Whether JSON has a locale file's top-level shape. Shallow on purpose: the
 * full schema is checked by `npm run locales` before a file ships, and the
 * verifier reads files it then repairs, so a partial file must still be
 * readable there. What this catches is an unrelated or truncated body, which
 * would otherwise surface as an undefined deep inside `l.ui.…`.
 */
export function isLocaleText(data: unknown): data is LocaleText {
    return (
        isRecord(data) &&
        typeof data.language === 'string' &&
        Array.isArray(data.regions) &&
        isRecord(data.token) &&
        isRecord(data.keyword) &&
        isRecord(data.node) &&
        isRecord(data.basis) &&
        isRecord(data.input) &&
        isRecord(data.output) &&
        isRecord(data.ui) &&
        isRecord(data.gallery) &&
        isRecord(data.moderation)
    );
}
