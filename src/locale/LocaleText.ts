import type { FlagDescriptions } from '../db/projects/Moderation';
import type Markup from '../nodes/Markup';
import type Sym from '../nodes/Sym';
import parseDoc from '../parser/parseDoc';
import { DOCS_SYMBOL } from '../parser/Symbols';
import { toTokens } from '../parser/toTokens';
import type BasisTexts from './BasisTexts';
import type { GalleryTexts } from './GalleryTexts';
import type InputTexts from './InputTexts';
import type LanguageCode from './LanguageCode';
import { Languages } from './LanguageCode';
import type Locale from './Locale';
import type NodeTexts from './NodeTexts';
import type OutputTexts from './OutputTexts';
import { Regions, type RegionCode } from './Regions';
import { DraftLocales } from './SupportedLocales';
import type TermTexts from './TermTexts';
import type UITexts from './UITexts';
import type { ButtonText, DialogText } from './UITexts';
import { withoutAnnotations } from './withoutAnnotations';

/** Placeholders in the locale template language */
export const Unwritten = '$?';
export const Revised = '$!';
export const MachineTranslated = '$~';

/**
 * Represents a complete translation for Wordplay,
 * including every user interface label, every description, etc.
 * All of these fields must be included in order for a translation to be complete.
 **/
export type LocaleText = {
    /** A path to the generated JSON schema that mirrors this type, for validation and auto-complete */
    $schema: string;
    /** An ISO 639-1 language code */
    language: LanguageCode;
    /** An ISO 3166-2 region code: https://en.wikipedia.org/wiki/ISO_3166-2 */
    regions: RegionCode[];
    /** The name of the platform */
    wordplay: string;
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
        button: { submit: ButtonText; skip: ButtonText };
    };
};

export { type LocaleText as default };

export type Template = string;

export type NameAndDoc = {
    /** One or more names for this definition. Be careful not to introduce duplicates. */
    names: NameText;
    /** Documentation for this definition, to appear in the documentation browser. */
    doc: DocText;
};

export type FunctionText<Inputs extends readonly NameAndDoc[]> = NameAndDoc & {
    /** Bind definitions for the inputs this function takes */
    inputs: Inputs;
};

/** A single name or a list of names, all valid Wordplay names */
export type NameText = string | string[];

/** Wordplay markup, a single paragraph or a list of paragraphs. */
export type DocText = string | string[];

export function toLocale(locale: LocaleText) {
    return `${locale.language}${locale.regions.map((r) => `-${r}`).join('')}`;
}

export function toDocString(doc: DocText) {
    return withoutAnnotations(Array.isArray(doc) ? doc.join('\n\n') : doc);
}

export function parseLocaleDoc(doc: string) {
    return parseDoc(toTokens(DOCS_SYMBOL + doc + DOCS_SYMBOL));
}

export function docToMarkup(doc: DocText): Markup {
    return parseLocaleDoc(toDocString(doc)).markup;
}

export function getFirstText(name: string | string[]) {
    return typeof name === 'string' ? name : name[0];
}

export function isUnwritten(text: string) {
    return text.startsWith(Unwritten);
}

export function isRevised(text: string) {
    return text.startsWith(Revised);
}

export function isAutomated(text: string) {
    return text.startsWith(MachineTranslated);
}

/** Get the language code of a given a BCP-47 string, if it's a valid one. */
export function getLocaleLanguage(locale: string): LanguageCode | undefined {
    const [code] = locale.split('-');
    return code in Languages ? (code as LanguageCode) : undefined;
}

export function getLocaleLanguageName(
    locale: string | Locale,
): string | undefined {
    if (typeof locale === 'string') {
        const language = getLocaleLanguage(locale);
        return language ? Languages[language]?.name : undefined;
    } else {
        return Languages[locale.language]?.name;
    }
}

export function getLocaleRegions(locale: string): RegionCode[] {
    const regions = locale.split('-');
    regions.shift();
    return regions as RegionCode[];
}

export function getLocaleRegionNames(locale: string): string[] {
    const regions = getLocaleRegions(locale);
    return regions.map((r) => Regions[r]?.en).filter((r) => r !== undefined);
}

export function isLocaleDraft(locale: string): boolean {
    return DraftLocales.includes(locale);
}
