import type Locale from '@locale/Locale';
import { localesAreEqual } from '@locale/Locale';
import type { LanguageTagged } from '@nodes/LanguageTagged';
import type Name from '@nodes/Name';

/** A translatable unit's chosen source: which option carries the words to
 *  translate, and the locale those words are written in. */
export type TranslationSource<Kind> = { option: Kind; from: Locale };

/**
 * The locale a tagged option is written in, with one adjustment: a tag naming
 * no region adopts the declared locale of the same language(s), so `/en` and a
 * declared `en-US` land in one group rather than two — the same words, bought
 * twice, under two names. A tag that names a region keeps it, and a tag whose
 * languages don't resolve (`/aaa`) has no locale at all.
 */
function localeOfTag(
    tagged: LanguageTagged,
    declared: Locale[],
): Locale | undefined {
    const locale = tagged.language?.getTagLocale();
    if (locale === undefined || locale.regions.length > 0) return locale;
    const languages = locale.multilingual ?? [locale.language];
    return (
        declared.find((candidate) => {
            const candidates = candidate.multilingual ?? [candidate.language];
            return (
                candidates.length === languages.length &&
                candidates.every((code, index) => code === languages[index])
            );
        }) ?? locale
    );
}

/**
 * The tail both ladders share: nothing is written in the caller's language, so
 * source each remaining option from its own tag rather than mislabeling the
 * first one as the caller's (#653). A language the project declares wins, in
 * the project's own priority order; otherwise the first option stands, still
 * labeled with whatever its tag says.
 */
function chooseTagged<Kind extends LanguageTagged>(
    options: Kind[],
    chosen: Locale,
    declared: Locale[],
): TranslationSource<Kind> | undefined {
    for (const locale of declared) {
        const option = options.find((candidate) => {
            const tag = localeOfTag(candidate, declared);
            return tag !== undefined && localesAreEqual(tag, locale);
        });
        if (option !== undefined) return { option, from: locale };
    }

    const first = options[0];
    return first === undefined
        ? undefined
        : { option: first, from: localeOfTag(first, declared) ?? chosen };
}

/**
 * Which option of a `Docs`, `TextLiteral`, or `FormattedLiteral` to translate,
 * and what language it is written in. `preferred` is the option already in the
 * caller's chosen language, if there is one.
 *
 * The ladder reproduces today's rule first — the chosen language, then an
 * untagged option, which is the creator's own writing — so anything that
 * translates today translates identically. Only where today's code fell
 * through to a blind `getOptions()[0]` does a tag now decide the source.
 */
export function chooseTextSource<Kind extends LanguageTagged>(
    options: Kind[],
    preferred: Kind | undefined,
    chosen: Locale,
    declared: Locale[],
    /** A tag means content that must ship verbatim rather than a translation
     *  (#1310), so only an untagged option is translatable and its source is
     *  always the caller's — one group, always. */
    preserveTagged: boolean,
): TranslationSource<Kind> | undefined {
    const untagged = options.find(
        (option) => option.getLanguage() === undefined,
    );

    if (preserveTagged)
        return untagged === undefined
            ? undefined
            : { option: untagged, from: chosen };

    if (preferred !== undefined) return { option: preferred, from: chosen };
    if (untagged !== undefined) return { option: untagged, from: chosen };

    return chooseTagged(options, chosen, declared);
}

/**
 * Which name of a `Names` to translate, and what language it is written in.
 * Same ladder as {@link chooseTextSource}, except that its first step stays a
 * single `find` over "tagged with the chosen language OR untagged": that
 * interleaves the two by source order, so splitting them into two steps would
 * change which name `cat, gato/en` picks.
 */
export function chooseNameSource(
    names: Name[],
    chosen: Locale,
    declared: Locale[],
    preserveTagged: boolean,
): TranslationSource<Name> | undefined {
    if (preserveTagged) {
        const untagged = names.find((name) => !name.hasLanguage());
        return untagged === undefined
            ? undefined
            : { option: untagged, from: chosen };
    }

    const preferred = names.find(
        (name) => name.isLanguage(chosen.language) || !name.hasLanguage(),
    );
    if (preferred !== undefined) return { option: preferred, from: chosen };

    return chooseTagged(names, chosen, declared);
}
