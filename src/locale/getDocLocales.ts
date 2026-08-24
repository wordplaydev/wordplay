import { parseLocaleDoc } from '@locale/LocaleText';
import Docs from '@nodes/Docs';
import Doc from '@nodes/Doc';
import type Locales from '@locale/Locales';
import type { TemplateInput } from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import { toDocString, type DocText } from '@locale/LocaleText';
import { localeToLanguage } from '@locale/localeToLanguage';
import selectTranslation from '@locale/selectTranslation';
import { DOCS_SYMBOL } from '@parser/Symbols';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

export function getDocLocales(
    locales: Locales,
    select: (locale: LocaleText) => DocText,
): Docs {
    return new Docs(
        locales
            .getLocales()
            .map((locale) =>
                parseLocaleDoc(
                    toDocString(selectTranslation(locale, select)),
                ).withLanguage(localeToLanguage(locale)),
            ) as [Doc, ...Doc[]],
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
            const markup = locales.concretize(
                toDocString(selectTranslation(locale, select)),
                inputs(locale),
            );
            return new Doc(
                new Token(DOCS_SYMBOL, Sym.Doc),
                markup,
                new Token(DOCS_SYMBOL, Sym.Doc),
                localeToLanguage(locale),
            );
        }) as [Doc, ...Doc[]],
    );
}
