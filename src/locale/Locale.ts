import type LanguageCode from './LanguageCode';
import { Languages } from './LanguageCode';
import type Sym from '../nodes/Sym';
import type BasisTexts from './BasisTexts';
import type NodeTexts from './NodeTexts';
import type OutputTexts from './OutputTexts';
import type UITexts from './UITexts';
import type InputTexts from './InputTexts';
import type TermTexts from './TermTexts';
import { parseLocaleDoc } from '../parser/Parser';
import type Markup from '../nodes/Markup';
import { Regions, type RegionCode } from './Regions';
import type Type from '../nodes/Type';
import { getDocLocales } from './getDocLocales';
import { getNameLocales } from './getNameLocales';
import Bind from '../nodes/Bind';
import type TypeVariables from '../nodes/TypeVariables';
import type Expression from '../nodes/Expression';
import FunctionDefinition from '../nodes/FunctionDefinition';

/** A list of locales officially supported by Wordplay. */
export const SupportedLocales = ['en-US', 'es-MX'] as const;

/** One of the supported locales above */
export type SupportedLocale = (typeof SupportedLocales)[number];

/**
 * Represents a complete translation for Wordplay,
 * including every user interface label, every description, etc.
 * All of these fields must be included in order for a translation to be complete.
 **/
export type Locale = {
    /** A path to the generated JSON schema that mirrors this type, for validation and auto-complete */
    $schema: string;
    /** An ISO 639-1 language code */
    language: keyof typeof Languages;
    /** An ISO 3166-2 region code: https://en.wikipedia.org/wiki/ISO_3166-2 */
    region: RegionCode;
    /** The name of the platform */
    wordplay: string;
    /** The default Program for a new project */
    newProject: string;
    term: TermTexts;
    token: Record<keyof typeof Sym, string>;
    node: NodeTexts;
    basis: BasisTexts;
    input: InputTexts;
    output: OutputTexts;
    ui: UITexts;
};

export default Locale;

export type Template = string;

export type NameAndDoc = {
    names: NameText;
    doc: DocText;
};

export type FunctionText<Inputs extends NameAndDoc[]> = {
    names: NameText;
    doc: DocText;
    inputs: Inputs;
};

export type NameText = string | string[];

export type DocText = string | string[];

export function toDocString(doc: DocText) {
    return Array.isArray(doc) ? doc.join('\n\n') : doc;
}

export function docToMarkup(doc: DocText): Markup {
    return parseLocaleDoc(toDocString(doc)).markup;
}

export function getFirstName(name: NameText) {
    return typeof name === 'string' ? name : name[0];
}

export function nameWithoutMentions(name: string) {
    return name.replaceAll('$?', '').replaceAll('$!', '').trim();
}

export function toLocaleString(locale: Locale) {
    return `${locale.language}-${locale.region}`;
}

/** Get the language code of a given a BCP-47 string, if it's a valid one. */
export function getLocaleLanguage(locale: string): LanguageCode | undefined {
    const [code] = locale.split('-');
    return code in Languages ? (code as LanguageCode) : undefined;
}

export function getLocaleLanguageName(locale: string): string | undefined {
    const language = getLocaleLanguage(locale);
    return language ? Languages[language].name : undefined;
}

export function getLocaleRegion(locale: string): string | undefined {
    const [, region] = locale.split('-');
    return region;
}

export function getLocaleRegionName(locale: string): string | undefined {
    const region = getLocaleRegion(locale);
    return region ? Regions[region as RegionCode].en : undefined;
}

/** Find the best supported locales from the requested raw language codes */
export function getBestSupportedLocales(locales: string[]) {
    // Map each locale into the best match.
    const matches = locales
        .map((preferredLocale) => {
            // Is there an exact match?
            const exact = SupportedLocales.find(
                (locale) => preferredLocale === locale
            );
            if (exact) return exact;
            // Does a language match, even if locale doesn't match?
            const languageExact = SupportedLocales.find(
                (locale) =>
                    getLocaleLanguage(preferredLocale) ===
                    getLocaleLanguage(locale)
            );
            if (languageExact) return languageExact;
            // No match
            return undefined;
        })
        .filter((locale): locale is SupportedLocale => locale !== undefined);

    return matches.length > 0
        ? Array.from(new Set(matches))
        : [SupportedLocales[0]];
}

export function createBind(
    locales: Locale[],
    nameAndDoc: (locale: Locale) => NameAndDoc,
    type?: Type,
    value?: Expression
) {
    return Bind.make(
        getDocLocales(locales, (l) => nameAndDoc(l).doc),
        getNameLocales(locales, (l) => nameAndDoc(l).names),
        type,
        value
    );
}

export function createInputs(
    locales: Locale[],
    fun: (locale: Locale) => NameAndDoc[],
    types: (Type | [Type, Expression])[]
) {
    return types.map((type, index) =>
        createBind(
            locales,
            (l) => fun(l)[index],
            Array.isArray(type) ? type[0] : type,
            Array.isArray(type) ? type[1] : undefined
        )
    );
}

export function createFunction(
    locales: Locale[],
    nameAndDoc: (locale: Locale) => NameAndDoc,
    typeVars: TypeVariables | undefined,
    inputs: Bind[],
    output: Type,
    expression: Expression
) {
    return FunctionDefinition.make(
        getDocLocales(locales, (l) => nameAndDoc(l).doc),
        getNameLocales(locales, (l) => nameAndDoc(l).names),
        typeVars,
        inputs,
        expression,
        output
    );
}
