/**
 * Text ordering that never depends on the host machine's locale — the same
 * stance casing.ts takes, for the same reason: a creator's program has to sort
 * the same way on every machine.
 *
 * Sorting text by a number computed from its code points (#1322) put every
 * capital letter before every lowercase one, so "adhe" landed after every word
 * starting with a capital A instead of next to "Adea". Unicode collation is
 * what puts letters in the order a reader expects.
 */

import { toIntlLocale } from '@unicode/casing';

/**
 * Root collation, spelled 'en'.
 *
 * The obvious spellings of "no locale in particular" don't work: both
 * `new Intl.Collator()` and `new Intl.Collator('und')` resolve to the *host*
 * locale, which is precisely the machine dependence we're avoiding. CLDR gives
 * English no collation tailorings, so 'en' is the root collation table, and
 * unlike 'und' it resolves to 'en' everywhere.
 */
const RootLanguage = 'en';

/**
 * Root collation asks for CLDR's emoji ordering, which groups emoji the way
 * Unicode means them (❤ next to 🧡, ✈🚀🛸 together) rather than by code point,
 * which only clusters them by accident — and which root collation reshuffles
 * anyway, moving all of U+1F600–1F6FF after U+1F900+. Its entire effect is on
 * emoji: it agrees with plain 'en' on every letter, accent, digit, and
 * punctuation pair.
 *
 * This rides on the root locale ONLY. `co=emoji` is a root collation, so
 * `sv-u-co-emoji` sorts ä with a, silently discarding the very tailoring a
 * creator's `/sv` tag asked for.
 */
const RootLocale = `${RootLanguage}-u-co-emoji`;

/** Collators are the most expensive thing in Intl and a sort needs one for
 *  every comparison, so keep one per locale rather than one per call. */
const Collators = new Map<string, Intl.Collator>();

/** Whether this runtime's ICU actually carries the emoji collation. It reports
 *  a missing collation by quietly resolving to the default one rather than
 *  throwing, so a runtime without it degrades to plain root instead of
 *  ordering emoji differently than every other runtime. */
let rootLocale: string | undefined;

function getRootLocale(): string {
    if (rootLocale === undefined)
        rootLocale =
            new Intl.Collator(RootLocale).resolvedOptions().collation ===
            'emoji'
                ? RootLocale
                : RootLanguage;
    return rootLocale;
}

/** The collator for the given locale, built once and reused. */
export function getCollator(locale: string): Intl.Collator {
    let collator = Collators.get(locale);
    if (collator === undefined) {
        // 'sort' rather than 'search', and the default variant sensitivity, so
        // that 'a' and 'A' stay distinct: a sort needs a strict order, and a
        // comparator that calls them equal would leave them in whatever order
        // they happened to arrive in.
        collator = new Intl.Collator(locale, { usage: 'sort' });
        Collators.set(locale, collator);
    }
    return collator;
}

/**
 * The one locale a set of text tags agrees on, or the language-neutral root
 * when they don't.
 *
 * An untagged (or unusable) tag abstains rather than vetoing, the rule
 * `Language.union` already follows: tagging text is optional, so one untagged
 * word shouldn't reorder a list every other word agreed on. Requiring
 * unanimity rather than taking the first or the most common tag is what makes
 * the answer independent of the order the values arrived in.
 */
export function getCollationLocale(tags: (string | undefined)[]): string {
    let agreed: string | undefined;
    for (const tag of tags) {
        const locale = toIntlLocale(tag);
        if (locale === undefined) continue;
        if (agreed === undefined) agreed = locale;
        else if (agreed !== locale) return getRootLocale();
    }
    return agreed ?? getRootLocale();
}

/** The collator to order text carrying the given language tags. */
export function getCollatorFor(tags: (string | undefined)[]): Intl.Collator {
    return getCollator(getCollationLocale(tags));
}
