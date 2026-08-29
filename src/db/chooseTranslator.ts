import type Locale from '@locale/Locale';
import type { RawTranslator } from '@db/translateMarkup';

/** Which backend answered. `device` is the browser's own model — free, private,
 *  offline; `cloud` is the `getLLMTranslations` callable, which costs a
 *  creator's daily budget. */
export type TranslationBackend = 'device' | 'cloud';

/**
 * Try the browser's translator first, fall back to the network one, and tell
 * the caller which answered so a page can say where the words came from.
 *
 * Takes two translators rather than building them, so the part with the
 * decision in it can be tested without initializing Firebase, which the network
 * backend pulls in through the translation budget store.
 *
 * One call is one (from, to) pair, because `translateMarkupTexts` groups its
 * inputs by source locale before calling — so `onBackend` fires once per group,
 * and a page claiming "translated on your device" has to see every group say
 * so, not just the first.
 */
export default function chooseTranslator(
    device: RawTranslator,
    cloud: RawTranslator,
    onBackend?: (backend: TranslationBackend, from: Locale, to: Locale) => void,
): RawTranslator {
    return async (texts, from, to, context) => {
        const local = await device(texts, from, to, context);
        if (local === null) {
            onBackend?.('cloud', from, to);
            return cloud(texts, from, to, context);
        }
        onBackend?.('device', from, to);

        // Anything the device wouldn't take is worth one more ask — but only
        // those strings. Spending a creator's daily budget on the whole batch
        // because three sentences failed is the wrong trade in both directions.
        const missing = texts.filter((_, index) => local[index] === undefined);
        if (missing.length === 0) return local;
        const rest = await cloud(missing, from, to, context);
        if (rest === null) return local;
        onBackend?.('cloud', from, to);
        let at = 0;
        return local.map((value) => (value === undefined ? rest[at++] : value));
    };
}
