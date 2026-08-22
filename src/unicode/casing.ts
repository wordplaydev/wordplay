/**
 * Case conversion that never depends on the host machine's locale. A creator's
 * program must behave the same everywhere, but `toLocaleLowerCase()` with no
 * argument means "whatever this browser is set to", so a Turkish-locale machine
 * would lowercase `I` to `ı` in a program that says nothing about Turkish.
 * Passing no tag (or one Intl rejects) therefore uses Unicode's root mapping,
 * matching the same choice Glossary.ts makes for the same reason.
 */

/** Cache of tag → the tag Intl accepts, or undefined when it doesn't; casing
 *  runs per grapheme inside the pattern matcher, so validation can't repeat. */
const Valid = new Map<string, string | undefined>();

/**
 * A BCP-47 tag safe to hand to `toLocale*Case`, or undefined to use the root
 * mapping. Intl throws a RangeError on a structurally invalid tag — which
 * includes Wordplay's multilingual tag form (`es_en`) and any stray code a
 * creator writes — so an unusable tag degrades to root rather than crashing.
 */
export function toCasingLocale(tag: string | undefined): string | undefined {
    if (tag === undefined || tag === '') return undefined;
    const cached = Valid.get(tag);
    if (cached !== undefined || Valid.has(tag)) return cached;
    let valid: string | undefined;
    try {
        valid = Intl.getCanonicalLocales(tag)[0];
    } catch {
        valid = undefined;
    }
    Valid.set(tag, valid);
    return valid;
}

/** The given text in uppercase, using the tag's rules when it names a locale. */
export function upperCase(text: string, tag?: string): string {
    const locale = toCasingLocale(tag);
    return locale === undefined
        ? text.toUpperCase()
        : text.toLocaleUpperCase(locale);
}

/** The given text in lowercase, using the tag's rules when it names a locale. */
export function lowerCase(text: string, tag?: string): string {
    const locale = toCasingLocale(tag);
    return locale === undefined
        ? text.toLowerCase()
        : text.toLocaleLowerCase(locale);
}
