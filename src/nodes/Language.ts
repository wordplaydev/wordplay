import type Conflict from '@conflicts/Conflict';
import DuplicateLanguage from '@conflicts/DuplicateLanguage';
import MissingLanguage from '@conflicts/MissingLanguage';
import UnknownLanguage from '@conflicts/UnknownLanguage';
import type { InsertContext, ReplaceContext } from '@edit/revision/EditContext';
import type LanguageCode from '@locale/LanguageCode';
import { Languages } from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type { RegionCode } from '@locale/Regions';
import { SupportedLocales } from '@locale/SupportedLocales';
import { Purpose } from '@concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import LanguageToken from '@nodes/LanguageToken';
import NameToken from '@nodes/NameToken';
import type { Grammar, Replacement } from '@nodes/Node';
import Node, { list, node, optional } from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

/** The distinct language and region codes Wordplay ships content for, derived
 *  once from SupportedLocales and reused by tag-extension autocomplete. */
const SupportedLanguageCodes = Array.from(
    new Set(SupportedLocales.map((locale) => locale.split('-')[0])),
);
const SupportedRegionCodes = Array.from(
    new Set(
        SupportedLocales.map((locale) => locale.split('-')[1]).filter(
            (region): region is string => region !== undefined,
        ),
    ),
);

export default class Language extends Node {
    readonly slash: Token;
    /** The primary language code token (the first one in the tag). */
    readonly language: Token | undefined;
    /** Additional languages joined with underscores, interleaved as
     *  [`_` Sym.LanguageJoin, `name` Sym.Name, `_`, `name`, ...]. Empty for
     *  monolingual tags. The parser produces a well-formed interleaving;
     *  helpers below filter to the relevant token type. */
    readonly extras: Token[];
    readonly dash: Token | undefined;
    /** The primary region code token (the first one after the dash). */
    readonly region: Token | undefined;
    /** Additional regions joined with underscores, interleaved as
     *  [`_` Sym.LanguageJoin, `name` Sym.Name, ...], mirroring `extras` for
     *  languages. Empty for single-region (or region-less) tags. */
    readonly regionExtras: Token[];

    constructor(
        slash: Token,
        lang?: Token,
        extras: Token[] = [],
        dash?: Token,
        region?: Token,
        regionExtras: Token[] = [],
    ) {
        super();

        this.slash = slash;
        this.language = lang;
        this.extras = extras;
        this.dash = dash;
        this.region = region;
        this.regionExtras = regionExtras;

        this.computeChildren();
    }

    static make(
        lang: string | undefined,
        region?: string,
        extras?: string[],
        regionExtras?: string[],
    ) {
        const extraTokens: Token[] = [];
        for (const extra of extras ?? []) {
            extraTokens.push(new Token('_', Sym.LanguageJoin));
            extraTokens.push(new NameToken(extra));
        }
        const regionExtraTokens: Token[] = [];
        for (const extra of regionExtras ?? []) {
            regionExtraTokens.push(new Token('_', Sym.LanguageJoin));
            regionExtraTokens.push(new NameToken(extra));
        }
        return new Language(
            new LanguageToken(),
            lang ? new NameToken(lang) : undefined,
            extraTokens,
            region ? new Token('-', Sym.Region) : undefined,
            region ? new NameToken(region) : undefined,
            regionExtraTokens,
        );
    }

    /** Union two languages: if either is undefined, inherit the other; otherwise
     *  union their languages and regions (left-first order, deduplicated). The
     *  single source of truth for how text operations combine locales. */
    static union(
        a: Language | undefined,
        b: Language | undefined,
    ): Language | undefined {
        if (a === undefined) return b;
        if (b === undefined) return a;
        const langs = [
            ...new Set([...a.getLanguageTexts(), ...b.getLanguageTexts()]),
        ];
        const regions = [
            ...new Set([...a.getRegionTexts(), ...b.getRegionTexts()]),
        ];
        return Language.make(
            langs[0],
            regions[0],
            langs.slice(1),
            regions.slice(1),
        );
    }

    /** Bare language codes plus supported locales with regions, used by
     *  autocomplete. When a project context is provided, multilingual tags
     *  already used in the program (e.g. `/es_en`) are prepended so authors
     *  can quickly reuse a combination they've established elsewhere. */
    static getPossibleLanguages(context?: {
        context: { project: { getSources(): readonly { expression: Node }[] } };
    }): Language[] {
        // Suggest only the languages Wordplay has content for (those in
        // SupportedLocales), not all ~500 ISO codes — a menu of every code is
        // both slow to build and unusable. Any code is still typable directly.
        const bare = Array.from(
            new Set(SupportedLocales.map((locale) => locale.split('-')[0])),
        ).map((language) => Language.make(language));
        const localized = SupportedLocales.map((locale) => {
            const [language, region] = locale.split('-');
            return Language.make(language, region);
        });
        const multilingual: Language[] = [];
        if (context) {
            // Walk every source in the project, find Language nodes with more
            // than one language code, and dedupe by serialized tag string so
            // the same combo isn't suggested twice.
            const seen = new Set<string>();
            for (const source of context.context.project.getSources()) {
                for (const node of source.expression
                    .nodes()
                    .filter(
                        (n): n is Language =>
                            n instanceof Language && n.isMultilingual(),
                    )) {
                    const tag = node.getTagString();
                    if (tag === undefined || seen.has(tag)) continue;
                    seen.add(tag);
                    multilingual.push(
                        Language.make(
                            node.getLanguageTexts()[0],
                            node.getRegionTexts()[0],
                            node.getLanguageTexts().slice(1),
                            node.getRegionTexts().slice(1),
                        ),
                    );
                }
            }
        }
        return [...multilingual, ...localized, ...bare];
    }

    static getPossibleReplacements(action: ReplaceContext) {
        return Language.getPossibleLanguages(action);
    }

    static getPossibleInsertions(action: InsertContext) {
        return Language.getPossibleLanguages(action);
    }

    /** A Language is just slash + name + dash + name, so selecting any of its
     *  tokens should still surface locale options as parent-level replacements:
     *  first variants that extend this tag with another language/region, then
     *  the full set of whole-locale replacements. */
    getReplacementsForTokenAnchor(): Language[] {
        return [...this.getPossibleExtensions(), ...Language.getPossibleLanguages()];
    }

    /** Variants of this tag with one more language or region added, drawn from
     *  supported locales (skipping codes already present). Lets autocomplete
     *  grow a tag into a multilingual / multi-region one. Empty for an
     *  empty tag — whole-locale suggestions cover that case. */
    getPossibleExtensions(): Language[] {
        const langs = this.getLanguageTexts();
        if (langs.length === 0) return [];
        const regions = this.getRegionTexts();

        const extensions: Language[] = [];
        // Add another language as an extra.
        for (const language of SupportedLanguageCodes)
            if (!langs.includes(language))
                extensions.push(
                    Language.make(
                        langs[0],
                        regions[0],
                        [...langs.slice(1), language],
                        regions.slice(1),
                    ),
                );
        // Add another region (becomes the primary region if there is none).
        for (const region of SupportedRegionCodes)
            if (!regions.includes(region))
                extensions.push(
                    Language.make(
                        langs[0],
                        regions[0] ?? region,
                        langs.slice(1),
                        regions.length === 0
                            ? []
                            : [...regions.slice(1), region],
                    ),
                );
        return extensions;
    }

    getDescriptor(): NodeDescriptor {
        return 'Language';
    }

    getGrammar(): Grammar {
        return [
            { name: 'slash', kind: node(Sym.Language), label: undefined },
            {
                name: 'language',
                kind: optional(node(Sym.Name)),
                label: undefined,
            },
            {
                name: 'extras',
                kind: list(true, node(Sym.LanguageJoin), node(Sym.Name)),
                label: undefined,
            },
            {
                name: 'dash',
                kind: optional(node(Sym.Region)),
                label: undefined,
            },
            {
                name: 'region',
                kind: optional(node(Sym.Name)),
                label: () => (l) => l.term.region,
            },
            {
                name: 'regionExtras',
                kind: list(true, node(Sym.LanguageJoin), node(Sym.Name)),
                label: undefined,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Language(
            this.replaceChild('slash', this.slash, replace),
            this.replaceChild('language', this.language, replace),
            this.replaceChild<Token[]>('extras', this.extras, replace),
            this.replaceChild('dash', this.dash, replace),
            this.replaceChild('region', this.region, replace),
            this.replaceChild<Token[]>(
                'regionExtras',
                this.regionExtras,
                replace,
            ),
        ) as this;
    }

    getPurpose() {
        return Purpose.Text;
    }

    computeConflicts(): Conflict[] {
        const conflicts: Conflict[] = [];

        const languageTokens = this.getLanguageTokens();

        if (languageTokens.length === 0) {
            if (this.slash !== undefined)
                conflicts.push(new MissingLanguage(this, this.slash));
            return conflicts;
        }

        // Unknown-language conflict per individual language token.
        for (const token of languageTokens) {
            if (!(token.getText() in Languages))
                conflicts.push(new UnknownLanguage(this, token));
        }

        // Duplicate-language conflict: same code appearing twice in the tag.
        const seen = new Map<string, Token>();
        for (const token of languageTokens) {
            const text = token.getText();
            const prior = seen.get(text);
            if (prior !== undefined) {
                conflicts.push(new DuplicateLanguage(this, prior, token));
            } else {
                seen.set(text, token);
            }
        }

        // Duplicate-region conflict: same region appearing twice in the tag.
        const seenRegions = new Map<string, Token>();
        for (const token of this.getRegionTokens()) {
            const text = token.getText();
            const prior = seenRegions.get(text);
            if (prior !== undefined) {
                conflicts.push(new DuplicateLanguage(this, prior, token));
            } else {
                seenRegions.set(text, token);
            }
        }

        return conflicts;
    }

    /** All language-name tokens in source order: primary first, then extras. */
    getLanguageTokens(): Token[] {
        const tokens: Token[] = [];
        if (this.language) tokens.push(this.language);
        for (const token of this.extras) {
            if (token.isSymbol(Sym.Name)) tokens.push(token);
        }
        return tokens;
    }

    /** All language-code texts in source order. */
    getLanguageTexts(): string[] {
        return this.getLanguageTokens().map((t) => t.getText());
    }

    /** All language-code texts that resolve to a recognized LanguageCode. */
    getLanguageCodes(): LanguageCode[] {
        return this.getLanguageTexts().filter(
            (text): text is LanguageCode => text in Languages,
        );
    }

    /** Primary (first) language code text, if any. */
    getLanguageText(): string | undefined {
        return this.language ? this.language.getText() : undefined;
    }

    /** Full tag as a flat string (no leading slash). For a monolingual tag
     *  this is the language code (with optional `-REGION`); for a
     *  multilingual tag it is `lang1_lang2_..._langN[-REGION]`. Returned
     *  value is suitable as a `TextValue.format` payload. Returns undefined
     *  for an empty tag. */
    getTagString(): string | undefined {
        const langs = this.getLanguageTexts();
        if (langs.length === 0) return undefined;
        const regions = this.getRegionTexts();
        return regions.length > 0
            ? `${langs.join('_')}-${regions.join('_')}`
            : langs.join('_');
    }

    /** A BCP-47 language tag using only the primary language and region (e.g.
     *  `en` or `en-US`). Unlike `getTagString`, this is a valid value for an
     *  HTML `lang` attribute or a SpeechSynthesisUtterance — it never includes
     *  the multilingual `_` joins or multiple regions. Undefined for an empty tag. */
    getBCP47(): string | undefined {
        const language = this.getLanguageText();
        if (language === undefined) return undefined;
        const region = this.getRegionText();
        return region ? `${language}-${region}` : language;
    }

    /** All region-name tokens in source order: primary first, then extras. */
    getRegionTokens(): Token[] {
        const tokens: Token[] = [];
        if (this.language && this.region) tokens.push(this.region);
        for (const token of this.regionExtras) {
            if (token.isSymbol(Sym.Name)) tokens.push(token);
        }
        return tokens;
    }

    /** All region-code texts in source order. */
    getRegionTexts(): string[] {
        return this.getRegionTokens().map((t) => t.getText());
    }

    /** Primary (first) region code text, if any. */
    getRegionText(): string | undefined {
        return this.language ? this.region?.getText() : undefined;
    }

    /** Primary (first) language code, if it resolves to a recognized LanguageCode. */
    getLanguageCode(): LanguageCode | undefined {
        const lang = this.getLanguageText();
        return lang && lang in Languages ? (lang as LanguageCode) : undefined;
    }

    /** True if this tag has more than one language. */
    isMultilingual(): boolean {
        return this.getLanguageTokens().length > 1;
    }

    isLocale(locale: Locale) {
        return this.isLocaleLanguage(locale) && this.isLocaleRegion(locale);
    }

    /** True if any language in this tag matches the locale's language. */
    isLocaleLanguage(locale: Locale) {
        return this.getLanguageTexts().some(
            (text) => text === locale.language,
        );
    }

    /** True if this tag's regions and the given locale's regions match, where
     *  match means both are empty or they share at least one region. */
    isLocaleRegion(locale: Locale) {
        const regions = this.getRegionTexts();
        return (
            (regions.length === 0 && locale.regions.length === 0) ||
            regions.some((region) => locale.regions.includes(region))
        );
    }

    /** One Locale per language in the tag, all sharing this tag's regions. */
    getLocaleIDs(): Locale[] {
        const regions = this.getRegionTexts() as RegionCode[];
        return this.getLanguageTexts().map((language) => ({
            language: language as LanguageCode,
            regions,
        }));
    }

    /** Locales appropriate for a "languages used" picker: one Locale per
     *  individual language in the tag plus — if multilingual — a single
     *  combination Locale carrying the full language list. Lets pickers
     *  surface each language on its own AND the multilingual combo. */
    getPickerLocaleIDs(): Locale[] {
        const regions = this.getRegionTexts() as RegionCode[];
        const languages = this.getLanguageTexts() as LanguageCode[];
        if (languages.length === 0) return [];
        const result: Locale[] = languages.map((language) => ({
            language,
            regions,
        }));
        if (languages.length > 1)
            result.push({
                language: languages[0],
                regions,
                multilingual: languages,
            });
        return result;
    }

    /** Primary-language Locale, if any. Convenience for callers that don't
     *  need every language in the tag. */
    getLocaleID(): Locale | undefined {
        return this.getLocaleIDs()[0];
    }

    isEqualTo(lang: Node) {
        if (!(lang instanceof Language)) return false;
        const a = this.getLanguageTexts();
        const b = lang.getLanguageTexts();
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
        const aRegions = this.getRegionTexts();
        const bRegions = lang.getRegionTexts();
        if (aRegions.length !== bRegions.length) return false;
        for (let i = 0; i < aRegions.length; i++)
            if (aRegions[i] !== bRegions[i]) return false;
        return true;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Language;
    getLocalePath() {
        return Language.LocalePath;
    }

    getDescriptionInputs() {
        return {};
    }

    getCharacter() {
        return Characters.Language;
    }
}
