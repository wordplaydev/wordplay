import { parseLocaleDoc } from '#locale/LocaleText.ts';
import Docs from '#nodes/Docs.ts';
import Doc from '#nodes/Doc.ts';
import type { MarkupSource } from '#nodes/Markup.ts';
import type Locales from '#locale/Locales.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import type LocaleText from '#locale/LocaleText.ts';
import { toDocString, type DocText } from '#locale/LocaleText.ts';
import { localeToLanguage } from '#locale/localeToLanguage.ts';
import selectTranslation from '#locale/selectTranslation.ts';
import { DOCS_SYMBOL } from '#parser/Symbols.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';

export function getDocLocales(
    locales: Locales,
    select: (locale: LocaleText) => DocText,
): Docs {
    // The accessor is right here in the signature, so a built-in's docs can report where
    // their text lives and be edited in localization mode wherever they're shown. A doc a
    // creator wrote is parsed from their own source and carries nothing, so it stays inert.
    const source: MarkupSource = { accessor: select, inputs: {} };
    return new Docs(
        locales.getLocales().map((locale) => {
            const doc = parseLocaleDoc(
                toDocString(selectTranslation(locale, select)),
            ).withLanguage(localeToLanguage(locale));
            return doc.withMarkup(doc.markup.withSource(source));
        }),
    );
}

/**
 * The same, for a doc whose text is a template with named inputs. Used where one
 * sentence covers many definitions — the built-in unit conversions are two hundred
 * variations on "$from to $to", and asking translators for two hundred sentences
 * instead of one template plus a word list does not scale.
 *
 * The inputs are a function of the locale because they are themselves localized:
 * the unit's name has to come from the same locale as the sentence around it.
 */
export function getTemplatedDocLocales(
    locales: Locales,
    select: (locale: LocaleText) => DocText,
    inputs: (locale: LocaleText) => Record<string, TemplateInput>,
): Docs {
    return new Docs(
        locales.getLocales().map((locale) => {
            // Concretize rather than substituting textually, so `$name` branches and
            // markup in a translated template are honored. The Markup goes into the Doc
            // as it is, rather than being serialized and reparsed, which would lose its
            // spacing.
            const markup = locales
                .concretize(
                    toDocString(selectTranslation(locale, select)),
                    inputs(locale),
                )
                .withSource({ accessor: select, inputs: inputs(locale) });
            return new Doc(
                new Token(DOCS_SYMBOL, Sym.Doc),
                markup,
                new Token(DOCS_SYMBOL, Sym.Doc),
                localeToLanguage(locale),
            );
        }),
    );
}
