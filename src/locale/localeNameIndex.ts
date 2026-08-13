import type { SupportedLocale } from '@locale/SupportedLocales';

/**
 * Which locales spell a given word, for every word a project's code can be written with.
 *
 * A project declares the languages it's written in, and only those languages' names bind
 * (see `Project.getLocaleCodes`). So when a name doesn't resolve, the useful question is
 * "does some language this project *doesn't* declare call something that?" — and answering
 * it must not mean fetching all thirty locale bundles just to look. This index is built
 * from every locale's basis by `npm run locales-fix` and fetched once, on demand.
 *
 * Stored by locale rather than by word, with the words space-separated: names and keyword
 * words are single identifier tokens, so a space is an unambiguous separator, and this keeps
 * the committed artifact a few dozen lines instead of ten thousand. The by-word maps callers
 * need are inverted once at load.
 *
 * Advisory data only: it drives suggestions, never analysis. An unreachable or stale file
 * costs a suggestion, nothing more.
 */
export type LocaleNameIndex = {
    /**
     * Locale code → the space-separated names that locale's basis definitions, members, and
     * inputs bind, minus the ones en-US binds at the same definition.
     *
     * That subtraction is why a lookup here answers "which language would make this name
     * resolve" rather than "which languages spell this word": en-US is always appended as the
     * locale fallback, so a name it binds at the same definition binds in every project
     * anyway. A homograph — `sin` is `Number.sine` in en-US and `List.sans` in es-MX — is
     * kept, because there the language really is what's missing. Only the en-US row is
     * complete, being the row the others are defined against.
     */
    names: Record<string, string>;
    /**
     * Locale code → the space-separated localized keyword words. See LANGUAGE.md, "Localized
     * keywords". Complete for every locale, including en-US: the keyword index is built from
     * a project's declared locales with no fallback appended, so unlike names, English keyword
     * words are *not* available unless English is declared.
     */
    keywords: Record<string, string>;
};

/** Where the generated artifact is served from. Written by `npm run locales-fix`. */
export const LocaleNameIndexPath = '/locales/names.json';

type Inverted = {
    names: Map<string, SupportedLocale[]>;
    keywords: Map<string, SupportedLocale[]>;
};

let inverted: Inverted | undefined = undefined;
let loading: Promise<boolean> | undefined = undefined;

/** Word → locales, from the artifact's locale → words. */
function invert(index: LocaleNameIndex): Inverted {
    const build = (table: Record<string, string>) => {
        const map = new Map<string, SupportedLocale[]>();
        for (const [locale, words] of Object.entries(table))
            for (const word of words.split(' ')) {
                if (word.length === 0) continue;
                const locales = map.get(word);
                if (locales === undefined) map.set(word, [locale]);
                else locales.push(locale);
            }
        return map;
    };
    return { names: build(index.names), keywords: build(index.keywords) };
}

/**
 * Fetch the index once and cache it, resolving to whether it's available. Subsequent calls
 * return the same promise rather than retrying, so a failed fetch stays failed for the
 * session — this only costs suggestions.
 */
export function loadLocaleNameIndex(): Promise<boolean> {
    if (inverted !== undefined) return Promise.resolve(true);
    if (loading === undefined)
        loading = fetch(LocaleNameIndexPath)
            .then((response) => (response.ok ? response.json() : undefined))
            .then((json: unknown) => {
                if (!isNameIndex(json)) return false;
                inverted = invert(json);
                return true;
            })
            .catch(() => false);
    return loading;
}

/** Whether the index is loaded, for callers that can only look things up synchronously. */
export function isLocaleNameIndexLoaded(): boolean {
    return inverted !== undefined;
}

/** Replace the cached index. For tests and the loader; not for app code. */
export function setLocaleNameIndex(index: LocaleNameIndex | undefined) {
    inverted = index === undefined ? undefined : invert(index);
    loading = index === undefined ? undefined : Promise.resolve(true);
}

/**
 * The locales that bind `word` as a name, or undefined if the index isn't loaded yet —
 * distinct from an empty array, which means no locale names anything that.
 */
export function findLocalesNaming(word: string): SupportedLocale[] | undefined {
    return inverted && (inverted.names.get(word) ?? []);
}

/** The locales in which `word` is a localized keyword. Undefined if the index isn't loaded. */
export function findLocalesWithKeyword(
    word: string,
): SupportedLocale[] | undefined {
    return inverted && (inverted.keywords.get(word) ?? []);
}

function isNameIndex(json: unknown): json is LocaleNameIndex {
    return (
        json !== null &&
        typeof json === 'object' &&
        'names' in json &&
        json.names !== null &&
        typeof json.names === 'object' &&
        'keywords' in json &&
        json.keywords !== null &&
        typeof json.keywords === 'object'
    );
}
