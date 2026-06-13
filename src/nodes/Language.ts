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
    readonly region: Token | undefined;

    constructor(
        slash: Token,
        lang?: Token,
        extras: Token[] = [],
        dash?: Token,
        region?: Token,
    ) {
        super();

        this.slash = slash;
        this.language = lang;
        this.extras = extras;
        this.dash = dash;
        this.region = region;

        this.computeChildren();
    }

    static make(lang: string | undefined, region?: string, extras?: string[]) {
        const extraTokens: Token[] = [];
        for (const extra of extras ?? []) {
            extraTokens.push(new Token('_', Sym.LanguageJoin));
            extraTokens.push(new NameToken(extra));
        }
        return new Language(
            new LanguageToken(),
            lang ? new NameToken(lang) : undefined,
            extraTokens,
            region ? new Token('-', Sym.Region) : undefined,
            region ? new NameToken(region) : undefined,
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
                            node.getRegionText(),
                            node.getLanguageTexts().slice(1),
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
     *  tokens should still surface locale options as parent-level replacements. */
    getReplacementsForTokenAnchor(): Language[] {
        return Language.getPossibleLanguages();
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
        ];
    }

    clone(replace?: Replacement) {
        return new Language(
            this.replaceChild('slash', this.slash, replace),
            this.replaceChild('language', this.language, replace),
            this.replaceChild<Token[]>('extras', this.extras, replace),
            this.replaceChild('dash', this.dash, replace),
            this.replaceChild('region', this.region, replace),
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
        const region = this.getRegionText();
        return region ? `${langs.join('_')}-${region}` : langs.join('_');
    }

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

    /** True if these this language and the given locale region match, where match means both are undefined or both are the same region. */
    isLocaleRegion(locale: Locale) {
        return (
            (this.region === undefined && locale.regions.length === 0) ||
            (this.region !== undefined &&
                locale.regions.includes(this.region.getText()))
        );
    }

    /** One Locale per language in the tag, all sharing this tag's region. */
    getLocaleIDs(): Locale[] {
        const region = this.getRegionText();
        return this.getLanguageTexts().map((language) => ({
            language: language as LanguageCode,
            regions: region ? [region as RegionCode] : [],
        }));
    }

    /** Locales appropriate for a "languages used" picker: one Locale per
     *  individual language in the tag plus — if multilingual — a single
     *  combination Locale carrying the full language list. Lets pickers
     *  surface each language on its own AND the multilingual combo. */
    getPickerLocaleIDs(): Locale[] {
        const region = this.getRegionText();
        const regions = region ? [region as RegionCode] : [];
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
        return (
            ((this.dash === undefined && lang.dash === undefined) ||
                (this.dash !== undefined &&
                    lang.dash !== undefined &&
                    this.dash.isEqualTo(lang.dash))) &&
            ((this.region === undefined && lang.region === undefined) ||
                (this.region !== undefined &&
                    lang.region !== undefined &&
                    this.region.isEqualTo(lang.region)))
        );
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
