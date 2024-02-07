import type LanguageCode from './LanguageCode';
import { Languages } from './LanguageCode';
import type Sym from '../nodes/Sym';
import type BasisTexts from './BasisTexts';
import type NodeTexts from './NodeTexts';
import type OutputTexts from './OutputTexts';
import type UITexts from './UITexts';
import type InputTexts from './InputTexts';
import type TermTexts from './TermTexts';
import type Markup from '../nodes/Markup';
import { Regions, type RegionCode } from './Regions';
import type Type from '../nodes/Type';
import { getDocLocales } from './getDocLocales';
import { getNameLocales } from './getNameLocales';
import Bind from '../nodes/Bind';
import type TypeVariables from '../nodes/TypeVariables';
import type Expression from '../nodes/Expression';
import FunctionDefinition from '../nodes/FunctionDefinition';
import parseDoc from '../parser/parseDoc';
import { toTokens } from '../parser/toTokens';
import { DOCS_SYMBOL } from '../parser/Symbols';
import type { FlagDescriptions } from '../models/Moderation';
import type { ButtonText, DialogText } from './UITexts';
import type Locales from './Locales';
import type { GalleryTexts } from './GalleryTexts';

/** A list of locales that are in progress but not supported yet. Only added when developing locally. */
export const EventuallySupportedLocales = [];

/** A list of locales officially supported by Wordplay. */
export const SupportedLocales = Array.from(
    new Set([
        'en-US',
        'es-MX',
        'zh-CN',
        ...(import.meta.hot ? EventuallySupportedLocales : []),
    ]),
);

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
    language: LanguageCode;
    /** An ISO 3166-2 region code: https://en.wikipedia.org/wiki/ISO_3166-2 */
    region: RegionCode;
    /** The name of the platform */
    wordplay: string;
    /** The default Program for a new project */
    newProject: string;
    /** Common vocabulary that can be used in documentation and descriptions. */
    term: TermTexts;
    /** Descriptions of all token categories. See Sym.ts for the symbol or symbol category that each represents. */
    token: Record<keyof typeof Sym, string>;
    /** Names, descriptions, and documentation for all node types, as well as descriptions of start and end of expression evaluations for debugging. */
    node: NodeTexts;
    /** Documentation for basic types. */
    basis: BasisTexts;
    /** Documentation for input types. */
    input: InputTexts;
    /** Documentation for output types. */
    output: OutputTexts;
    /** User interface strings */
    ui: UITexts;
    /** Default gallery text  */
    gallery: GalleryTexts;
    /** Text related to content moderation */
    moderation: {
        /** What to say to warn viewers before showing content with warnings. */
        warning: DialogText;
        /** What to say when content is blocked */
        blocked: DialogText;
        /** What to sa when content has not yet been moderated */
        unmoderated: DialogText;
        /** Moderation view text */
        moderate: DialogText;
        /** Content moderation rules that creators promise to follow. See en-US.json for ground truth language. */
        flags: FlagDescriptions;
        /** Progress message */
        progress: Template;
        /** Buttons on the moderation page */
        button: {
            submit: ButtonText;
            skip: ButtonText;
        };
    };
};

export { type Locale as default };

export type Template = string;

export type NameAndDoc = {
    /** One or more names for this definition. Be careful not to introduce duplicates. */
    names: NameText;
    /** Documentation for this definition, to appear in the documentation browser. */
    doc: DocText;
};

export type FunctionText<Inputs extends NameAndDoc[]> = NameAndDoc & {
    /** Bind definitions for the inputs this function takes */
    inputs: Inputs;
};

/** A single name or a list of names, all valid Wordplay names */
export type NameText = string | string[];

/** Wordplay markup, a single paragraph or a list of paragraphs. */
export type DocText = string | string[];

export function toDocString(doc: DocText) {
    return Array.isArray(doc) ? doc.join('\n\n') : doc;
}

export function parseLocaleDoc(doc: string) {
    return parseDoc(toTokens(DOCS_SYMBOL + doc + DOCS_SYMBOL));
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
                (locale) => preferredLocale === locale,
            );
            if (exact) return exact;
            // Does a language match, even if locale doesn't match?
            const languageExact = SupportedLocales.find(
                (locale) =>
                    getLocaleLanguage(preferredLocale) ===
                    getLocaleLanguage(locale),
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
    locales: Locales,
    nameAndDoc: (locale: Locale) => NameAndDoc,
    type?: Type,
    value?: Expression,
) {
    return Bind.make(
        getDocLocales(locales, (l) => nameAndDoc(l).doc),
        getNameLocales(locales, (l) => nameAndDoc(l).names),
        type,
        value,
    );
}

export function createInputs(
    locales: Locales,
    fun: (locale: Locale) => NameAndDoc[],
    types: (Type | [Type, Expression])[],
) {
    return types.map((type, index) =>
        createBind(
            locales,
            (l) => fun(l)[index],
            Array.isArray(type) ? type[0] : type,
            Array.isArray(type) ? type[1] : undefined,
        ),
    );
}

export function createFunction(
    locales: Locales,
    nameAndDoc: (locale: Locale) => NameAndDoc,
    typeVars: TypeVariables | undefined,
    inputs: Bind[],
    output: Type,
    expression: Expression,
) {
    return FunctionDefinition.make(
        getDocLocales(locales, (l) => nameAndDoc(l).doc),
        getNameLocales(locales, (l) => nameAndDoc(l).names),
        typeVars,
        inputs,
        expression,
        output,
    );
}
