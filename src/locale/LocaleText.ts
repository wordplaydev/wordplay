import type Markup from '@nodes/Markup';
import { Sym } from '@nodes/Sym';
import parseDoc from '@parser/parseDoc';
import { DOCS_SYMBOL } from '@parser/Symbols';
import { toTokens } from '@parser/toTokens';
import { MachineTranslated, Revised, Unwritten } from '@locale/Annotations';
import type BasisTexts from '@locale/BasisTexts';
import type { GalleryTexts } from '@locale/GalleryTexts';
import type InputTexts from '@locale/InputTexts';
import type LanguageCode from '@locale/LanguageCode';
import { Languages } from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import type { ModerationTexts } from '@locale/ModerationTexts';
import type NodeTexts from '@locale/NodeTexts';
import type OutputTexts from '@locale/OutputTexts';
import { Regions, type RegionCode } from '@locale/Regions';
import { DraftLocales } from '@locale/SupportedLocales';
import type TermTexts from '@locale/TermTexts';
import type UITexts from '@locale/UITexts';
import { withoutAnnotations } from '@locale/withoutAnnotations';

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
    /** [plain] The name of the platform */
    wordplay: string;
    /** Common vocabulary that can be used in documentation and descriptions. */
    term: TermTexts;
    /** [plain] Descriptions of all token categories. See Sym.ts for the symbol or symbol category that each represents. */
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
    moderation: ModerationTexts;
    /** Pre-mount fallback strings shown in app.html before the app loads. */
    system: {
        /** [plain] Shown in <noscript> when JavaScript is disabled or unsupported. */
        noscript: string;
        /** [plain] Heading shown when the browser lacks required features. */
        unsupportedHeading: string;
        /** [plain] Body shown when the browser lacks required features. */
        unsupportedBody: string;
    };
};

export { type LocaleText as default };

/** Represents a string that is in Wordplay markup formatted syntax. */
export type FormattedText = string;

export type NameAndDoc = {
    /** [name] One or more names for this definition. Be careful not to introduce duplicates. */
    names: NameText;
    /** [formatted] Documentation for this definition, to appear in the documentation browser. */
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

export function toLocaleString(locale: Locale) {
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

export function isMachineTranslated(text: string) {
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

export function getLanguageLocalDescription(locale: Locale) {
    const localeString = toLocaleString(locale);
    const language = getLocaleLanguageName(locale);
    const regions = getLocaleRegionNames(locale);
    return `${language ?? '–'}${regions.length > 0 ? ` [${regions.join('|')}]` : ''} (${localeString})`;
}

export function getLocaleRegions(locale: string | Locale): RegionCode[] {
    if (typeof locale === 'string') {
        const parts = locale.split('-');
        parts.shift();
        return parts.filter((part) => part in Regions) as RegionCode[];
    } else return locale.regions;
}

export function getLocaleRegionNames(locale: string | Locale): string[] {
    const regions = getLocaleRegions(locale);
    return regions.map((r) => Regions[r]?.en).filter((r) => r !== undefined);
}

export function isLocaleDraft(locale: string): boolean {
    return DraftLocales.includes(locale);
}
