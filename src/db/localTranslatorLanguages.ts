import type Locale from '@locale/Locale';
import { getCLDRCandidates } from '@locale/LanguageCode';

/**
 * The BCP 47 tags to offer the browser for a Wordplay locale, most specific
 * first.
 *
 * Deliberately not a copy of the browser's supported-language list. That list
 * grows, and a copy of it here could only ever be wrong in one direction —
 * refusing a pair the browser can actually do — with nothing to notice.
 * `availability()` is the only authority; this just builds the questions.
 *
 * The candidates come from `getCLDRCandidates`, which already knows the one
 * mapping that isn't mechanical: Chinese in TW, HK, and MO is written in
 * Traditional script, which the API names `zh-Hant` and which no combination of
 * language and region reaches — best-fit matching would answer `zh`, which is
 * Simplified. Reusing it means a new script variant is added once, beside the
 * language metadata, rather than here as well. CLDR spells its codes with `_`
 * and BCP 47 with `-`.
 *
 * `localeToString` is not a language tag and must never be handed over: it
 * joins *every* region (`ta-IN-LK-SG`) and joins a multilingual locale's
 * languages with `_` (`es_en-MX`), and a malformed tag makes the API throw
 * rather than answer. A multilingual locale offers its primary language, which
 * is what `Locale.language` already is.
 */
export function localTranslationTags(locale: Locale): string[] {
    const region = locale.regions.length > 0 ? locale.regions[0] : undefined;
    return [
        ...new Set(
            getCLDRCandidates(locale.language, region)
                .map((code) => code.replaceAll('_', '-'))
                // The few languages whose CLDR base differs from their own code
                // (Tagalog's is `fil`) are still worth asking about by code.
                .concat(locale.language),
        ),
    ];
}

/**
 * Answers `availability()` has already given, keyed source>target.
 *
 * The promise is cached rather than the answer, so concurrent probes of one
 * pair coalesce into a single call instead of racing. Availability consults the
 * on-device model registry, and a chat asks the same question for every batch
 * of every message, so uncached this turns one translation into dozens of
 * identical probes.
 *
 * Everything but `downloading` is a property of this browser and this profile
 * and cannot change while the page is open. `downloading` resolves on its own,
 * so it is forgotten as soon as it settles and asked again next time.
 */
const answers = new Map<string, Promise<TranslatorAvailability>>();

function availability(
    api: TranslatorFactory,
    source: string,
    target: string,
): Promise<TranslatorAvailability> {
    const key = `${source}>${target}`;
    const asked = answers.get(key);
    if (asked !== undefined) return asked;
    const asking: Promise<TranslatorAvailability> = api
        .availability({ sourceLanguage: source, targetLanguage: target })
        // A tag the browser rejects outright is just a pair it cannot do.
        .catch((): TranslatorAvailability => 'unavailable')
        .then((state: TranslatorAvailability) => {
            if (state === 'downloading') answers.delete(key);
            return state;
        });
    answers.set(key, asking);
    return asking;
}

/** Forget every answer. For tests, which each need to start from nothing. */
export function forgetLocalTranslationAvailability() {
    answers.clear();
}

/**
 * The most specific pair of tags this browser can already translate, or — when
 * `allowDownload` — the most specific one it could after fetching a model.
 *
 * At most three source candidates by three target ones, each asked once ever. A
 * pair whose tags are equal is skipped rather than returned: en-US and en-GB
 * both narrow to `en`, and "translate English into English" is a request the
 * network backend can honor and this one cannot.
 */
export async function findLocalTranslationPair(
    api: TranslatorFactory,
    from: Locale,
    to: Locale,
    allowDownload: boolean,
): Promise<{ source: string; target: string } | undefined> {
    let downloadable: { source: string; target: string } | undefined;
    for (const target of localTranslationTags(to))
        for (const source of localTranslationTags(from)) {
            if (source === target) continue;
            const state = await availability(api, source, target);
            if (state === 'available') return { source, target };
            if (
                downloadable === undefined &&
                (state === 'downloadable' || state === 'downloading')
            )
                downloadable = { source, target };
        }
    return allowDownload ? downloadable : undefined;
}
