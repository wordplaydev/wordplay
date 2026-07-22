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
import type { PhotosensitivityTexts } from '@locale/PhotosensitivityTexts';
import type { KeywordId } from '@parser/Keywords';
import type OutputTexts from '@locale/OutputTexts';
import { Regions, type RegionCode } from '@locale/Regions';
import { DraftLocales } from '@locale/SupportedLocales';
import type GlossaryTexts from '@locale/GlossaryTexts';
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
    /** [formatted] Guidance for contributors writing this locale, in this locale's language: conventions this locale follows that the glossary doesn't cover, such as form of address, tone, gendered forms, and terminology choices. Unlike every other field, this is original content, not a translation of the English, so it is never machine translated and may be empty. */
    guidance: FormattedText;
    /** A glossary of widely-used terms not already defined by a concept, each with a localized word and a learner-facing definition. Words are referenced symbolically as @term in documentation and descriptions. */
    glossary: GlossaryTexts;
    /** [plain] Descriptions of all token categories. See Sym.ts for the symbol or symbol category that each represents. */
    token: Record<keyof typeof Sym, string>;
    /** [name] The localized word for each built-in keyword, written and read interchangeably with its symbol. Each must be a single token (no spaces or hyphens). See LANGUAGE.md and Keywords.ts. */
    keyword: Record<KeywordId, string>;
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
    /** Warnings about visual properties that may trigger photosensitive seizures */
    photosensitivity: PhotosensitivityTexts;
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

/** [formatted] Represents a string that is in Wordplay markup formatted syntax.
 *  Tagging the alias makes any bare `FormattedText` field default to the
 *  formatted editor; fields with their own (untagged) comment are still flagged. */
export type FormattedText = string;

/**
 * A Wordplay template string parameterized by the ordered list of input names
 * it accepts. The `Names` parameter is positional: `$1` in the template refers
 * to the first name, `$2` to the second, and so on. The brand exists only at
 * the type level — at runtime a `Template` is a plain string — so JSON locale
 * files satisfy this type as-is.
 */
declare const __TemplateInputs: unique symbol;
export type Template<Names extends readonly string[]> = string & {
    readonly [__TemplateInputs]?: Names;
};

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

/** [name] A single name or a list of names, all valid Wordplay names */
export type NameText = string | string[];

/** [formatted] Wordplay markup, a single paragraph or a list of paragraphs. */
export type DocText = string | string[];

export function toLocaleString(locale: Locale) {
    const languages = locale.multilingual ?? [locale.language];
    return `${languages.join('_')}${locale.regions.map((r) => `-${r}`).join('')}`;
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

/** Split a tag-string like `es_en-MX` into its language portion (`es_en`)
 *  and the optional region (`MX`). Used by helpers that need to handle the
 *  multilingual underscore-joined form alongside legacy single-language
 *  strings. */
function splitLocaleString(locale: string): {
    languages: string;
    region: string | undefined;
} {
    const dashIndex = locale.indexOf('-');
    if (dashIndex === -1) return { languages: locale, region: undefined };
    return {
        languages: locale.slice(0, dashIndex),
        region: locale.slice(dashIndex + 1),
    };
}

/** Get the PRIMARY language code of a given BCP-47-ish string, if it's a
 *  valid one. For a multilingual string like `es_en-MX`, returns `es`. */
export function getLocaleLanguage(locale: string): LanguageCode | undefined {
    const { languages } = splitLocaleString(locale);
    const [code] = languages.split('_');
    return code in Languages ? (code as LanguageCode) : undefined;
}

/** All language codes in a locale string or Locale. For `es_en-MX` (string)
 *  or a Locale with `multilingual: ['es', 'en']`, returns `['es', 'en']`.
 *  For a monolingual Locale, returns just `[locale.language]`. */
export function getLocaleLanguages(locale: string | Locale): LanguageCode[] {
    if (typeof locale !== 'string')
        return locale.multilingual ?? [locale.language];
    const { languages } = splitLocaleString(locale);
    return languages
        .split('_')
        .filter((code): code is LanguageCode => code in Languages);
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

/** Localized display of every language in a multilingual tag, joined with
 *  ` + `. Returns the single language's name for monolingual tags so it
 *  is safe to use as a drop-in for `getLocaleLanguageName`. */
export function getMultilingualLanguageLabel(locale: string | Locale): string {
    const codes = getLocaleLanguages(locale);
    if (codes.length === 0) return '';
    const names = codes.map((code) => Languages[code]?.name ?? code);
    return names.length === 1 ? names[0] : names.join(' + ');
}

export function getLanguageLocalDescription(locale: Locale) {
    const localeString = toLocaleString(locale);
    // Multilingual locales show every language joined with ` + `; monolingual
    // ones show just the primary language's name.
    const language =
        locale.multilingual && locale.multilingual.length > 1
            ? getMultilingualLanguageLabel(locale)
            : getLocaleLanguageName(locale);
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
