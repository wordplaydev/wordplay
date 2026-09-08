import type Locale from '@locale/Locale';
import { localesAreEqual } from '@locale/Locale';

/**
 * Which language each of a source's two views should show when a split is made.
 *
 * A split whose two views show the same language teaches nothing — the whole
 * point is to see one program said two ways — so the pair is chosen to differ
 * rather than left on the "all languages" placeholder for the reader to set
 * twice. Choosing them is also what turns on localized API names, since a view
 * with no language chosen renders the source verbatim.
 */
export default function chooseSplitLocales(
    /** The languages this program actually uses, in the order the chooser offers them. */
    used: Locale[],
    /** The language the source's own view is already showing, if any. */
    current: Locale | null,
    /** The reader's own languages, most preferred first. */
    readers: Locale[],
): { primary: Locale | null; view: Locale | null } {
    // A choice already made is a choice: never move a view the reader set.
    const primary =
        current ??
        // Otherwise show the reader their own language where the program has
        // it, so the one they keep reading is the one they know. Matched by
        // language, not by whole locale: a program's locales come from language
        // tags and so usually carry no region, while a reader's always does, so
        // comparing them whole never matches and the reader silently gets
        // whichever language the program happens to tag first.
        used.find((locale) =>
            readers.some((reader) => reader.language === locale.language),
        ) ??
        used[0] ??
        null;

    // With one language in play there is nothing to contrast, so the second
    // view stays on the placeholder rather than echoing the first.
    const view =
        primary === null
            ? null
            : (used.find((locale) => !localesAreEqual(locale, primary)) ??
              null);

    return { primary, view };
}
