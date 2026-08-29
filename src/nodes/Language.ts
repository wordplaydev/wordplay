import type { TemplateInput } from '@locale/Locales';
import type Locales from '@locale/Locales';
import type Context from './Context';
import type Conflict from '@conflicts/Conflict';
import DuplicateLanguage from '@conflicts/DuplicateLanguage';
import MissingLanguage from '@conflicts/MissingLanguage';
import UnknownLanguage from '@conflicts/UnknownLanguage';
import UnknownRegion from '@conflicts/UnknownRegion';
import type {
    EditContext,
    InsertContext,
    ReplaceContext,
} from '@edit/revision/EditContext';
import type LanguageCode from '@locale/LanguageCode';
import { Languages } from '@locale/LanguageCode';
import {
    completeLanguageTag,
    completeRegionTag,
    getRegionName,
    MaxTagCompletions,
    resolveLanguageCode,
    resolveRegionCode,
} from '@locale/tagNames';
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

/** What a tag token means: its resolved code where it names one, and the text
 *  the author wrote where it doesn't. Every accessor that *serializes* a tag
 *  uses this rather than the strictly-resolved form, because a value's tag is
 *  also how `TextValue` knows it has a tag at all — dropping an unrecognized
 *  code would silently untag `'hi'/aaa` and stop it round-tripping. */
function meaningOf(
    text: string,
    resolve: (text: string) => string | undefined,
): string {
    return resolve(text) ?? text;
}

/** The given texts with any two that mean the same thing collapsed to the
 *  first spelling of it. */
function uniqueByMeaning(
    texts: string[],
    resolve: (text: string) => string | undefined,
): string[] {
    const byMeaning = new Map<string, string>();
    for (const text of texts) {
        const key = meaningOf(text, resolve);
        if (!byMeaning.has(key)) byMeaning.set(key, text);
    }
    return [...byMeaning.values()];
}

/** How a tag token reads in a description: what the author wrote, followed by
 *  the other form of it — a code gets its name ("es (español)"), a name gets
 *  its code ("español (es)"). Both forms help, and which one is missing depends
 *  on how the author wrote it. Unrecognized text is left as written. */
function describeTagToken<Code extends string>(
    text: string | undefined,
    resolve: (text: string) => Code | undefined,
    nameOf: (code: Code) => string | undefined,
): string | undefined {
    if (text === undefined) return undefined;
    const code = resolve(text);
    if (code === undefined) return text;
    // Written as a code: add the name, unless the code has none worth adding.
    if (text === code) {
        const name = nameOf(code);
        return name === undefined || name === code ? text : `${text} (${name})`;
    }
    // Written as a name: add the code, which is the part a reader can't infer.
    return `${text} (${code})`;
}

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
        // Deduplicate by what each text *means*, not how it is spelled, or
        // `/Español + /es` would produce `/Español_es` — a DuplicateLanguage
        // conflict manufactured by `+`. The first spelling seen is the one kept.
        const langs = uniqueByMeaning(
            [...a.getLanguageTexts(), ...b.getLanguageTexts()],
            resolveLanguageCode,
        );
        const regions = uniqueByMeaning(
            [...a.getRegionTexts(), ...b.getRegionTexts()],
            resolveRegionCode,
        );
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
        return [
            ...this.getPossibleExtensions(),
            ...Language.getPossibleLanguages(),
        ];
    }

    /** The regions this tag's primary language is actually used in, which is
     *  what makes `/en-` offer `US GB CA AU …` instead of every region some
     *  shipped locale happens to name (which is where `/en-BR` came from).
     *  Falls back to the shipped regions for a language that lists none. */
    getLikelyRegions(): string[] {
        const language = this.getLanguageCode();
        const regions = language ? Languages[language]?.regions : undefined;
        return regions !== undefined && regions.length > 0
            ? regions.map((region) => String(region))
            : SupportedRegionCodes;
    }

    /** Variants of this tag with one more language or region added, drawn from
     *  supported locales (skipping codes already present). Lets autocomplete
     *  grow a tag into a multilingual / multi-region one. Empty for an
     *  empty tag — whole-locale suggestions cover that case. */
    getPossibleExtensions(): Language[] {
        const langs = this.getLanguageTexts();
        if (langs.length === 0) return [];
        const regions = this.getRegionTexts();
        // Membership is by resolved code, so a tag already saying `/Español`
        // is never offered `es` as an addition.
        const haveLanguage = new Set<string>(this.getLanguageCodes());
        const haveRegion = new Set<string>(this.getRegionCodes());

        // Nothing can be *added* to a tag whose parts don't yet name anything:
        // `/en-U` is a region being typed, not a tag missing a part, and
        // extending it would keep the half-typed `U` as the primary region and
        // complete nothing. Completion handles that case instead.
        if (
            haveLanguage.size !== langs.length ||
            haveRegion.size !== regions.length
        )
            return [];

        const extensions: Language[] = [];
        // Add a region first: someone who typed `/en` overwhelmingly wants
        // `-US`, and multilingual tags are the rare case. (Becomes the primary
        // region if there is none.)
        for (const region of this.getLikelyRegions())
            if (!haveRegion.has(region))
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
        // Then another language as an extra.
        for (const language of SupportedLanguageCodes)
            if (!haveLanguage.has(language))
                extensions.push(
                    Language.make(
                        langs[0],
                        regions[0],
                        [...langs.slice(1), language],
                        regions.slice(1),
                    ),
                );
        return extensions;
    }

    /** This tag's region texts, read straight off the fields rather than through
     *  `getRegionTokens`, which is gated on there being a language and so
     *  reports nothing for a half-written tag. */
    private getRawRegionTexts(): string[] {
        return [
            ...(this.region ? [this.region] : []),
            ...this.regionExtras.filter((token) => token.isSymbol(Sym.Name)),
        ].map((token) => token.getText());
    }

    /** Which part of the tag a caret just after `anchor` is completing, and what
     *  has been typed of it. Located by token identity, since two parts of a tag
     *  can hold the same text. Undefined for the slash, dash, and joins, which
     *  type no text of their own. */
    private locateTagPart(
        anchor: Token,
    ):
        | { part: 'language' | 'region'; index: number; prefix: string }
        | undefined {
        if (anchor === this.language)
            return { part: 'language', index: 0, prefix: anchor.getText() };
        if (anchor === this.region)
            return { part: 'region', index: 0, prefix: anchor.getText() };
        const extraIndex = (tokens: Token[]) => {
            let index = 0;
            for (const token of tokens) {
                if (!token.isSymbol(Sym.Name)) continue;
                index++;
                if (token === anchor) return index;
            }
            return undefined;
        };
        const language = extraIndex(this.extras);
        if (language !== undefined)
            return {
                part: 'language',
                index: language,
                prefix: anchor.getText(),
            };
        const region = extraIndex(this.regionExtras);
        if (region !== undefined)
            return { part: 'region', index: region, prefix: anchor.getText() };
        return undefined;
    }

    /** This tag with one part's text replaced, keeping every other part as the
     *  author wrote it. */
    private withTagPart(
        part: 'language' | 'region',
        index: number,
        text: string,
    ): Language {
        const langs = this.getLanguageTexts();
        const regions = this.getRawRegionTexts();
        const replaced = [...(part === 'language' ? langs : regions)];
        replaced[index] = text;
        const newLangs = part === 'language' ? replaced : langs;
        const newRegions = part === 'region' ? replaced : regions;
        return Language.make(
            newLangs[0],
            newRegions[0],
            newLangs.slice(1),
            newRegions.slice(1),
        );
    }

    /**
     * Completions for a tag being typed, for a caret just after `anchor`.
     *
     * A tag's parts are tokens rather than nodes, so nothing the menu's
     * field-driven paths offer can reach them (`Sym.Name` is a wildcard — see
     * `getPossibleNodes`). This is what a caret beside a tag gets instead, and
     * the anchor token is what says which part is being typed.
     */
    getPossibleCompletions(anchor: Token, edit: EditContext): Language[] {
        // The slash: nothing typed yet, so offer whole tags. Deliberately the
        // shipped locales rather than all 262 languages, which is a wall.
        if (anchor === this.slash) return Language.getPossibleLanguages(edit);

        // A `_` join: they're adding a part, which is what extensions are.
        if (anchor.isSymbol(Sym.LanguageJoin))
            return this.getPossibleExtensions();

        // The dash: a region is coming, so offer only regions.
        if (anchor === this.dash)
            return this.getLikelyRegions().map((region) =>
                this.withTagPart('region', 0, region),
            );

        const typing = this.locateTagPart(anchor);
        if (typing === undefined) return [];
        const { part, index, prefix } = typing;

        // When what's typed already names something, they've finished this part
        // and the useful offer is what can be added to it — a region first.
        const resolve =
            part === 'language' ? resolveLanguageCode : resolveRegionCode;
        const extensions =
            resolve(prefix) === undefined ? [] : this.getPossibleExtensions();

        // Otherwise complete it, in whichever form they were typing.
        const taken = new Set<string>(
            part === 'language'
                ? this.getLanguageCodes()
                : this.getRegionCodes(),
        );
        const likely = part === 'region' ? this.getLikelyRegions() : [];
        const completions = (
            part === 'language'
                ? completeLanguageTag(prefix)
                : completeRegionTag(prefix)
        )
            .filter(({ code }) => !taken.has(code))
            // A region the language is actually used in first, so `/en-U` leads
            // with `US` rather than every region whose code starts with U.
            .sort(
                (a, b) =>
                    Number(likely.includes(b.code)) -
                    Number(likely.includes(a.code)),
            )
            .map(({ text }) => this.withTagPart(part, index, text));

        return [...extensions, ...completions].slice(0, MaxTagCompletions);
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
                label: () => (l) => l.glossary.region.word,
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

        // Unknown-language conflict per individual language token. A token
        // names a language by code or by name; neither is a conflict.
        for (const token of languageTokens) {
            if (resolveLanguageCode(token.getText()) === undefined)
                conflicts.push(new UnknownLanguage(this, token));
        }

        const regionTokens = this.getRegionTokens();

        // Unknown-region conflict per individual region token.
        for (const token of regionTokens) {
            if (resolveRegionCode(token.getText()) === undefined)
                conflicts.push(new UnknownRegion(this, token));
        }

        // Duplicate conflicts compare what each token *means*, so `/es_Spanish`
        // is caught: it names one language twice, however it spells it.
        const duplicates = (
            tokens: Token[],
            resolve: (text: string) => string | undefined,
            which: 'language' | 'region',
        ) => {
            const seen = new Map<string, Token>();
            for (const token of tokens) {
                const key = meaningOf(token.getText(), resolve);
                const prior = seen.get(key);
                if (prior !== undefined)
                    conflicts.push(
                        new DuplicateLanguage(this, prior, token, which),
                    );
                else seen.set(key, token);
            }
        };
        duplicates(languageTokens, resolveLanguageCode, 'language');
        duplicates(regionTokens, resolveRegionCode, 'region');

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

    /** Every language this tag names, as codes, however it spells them.
     *  Deduplicated, since `/es_Spanish` names one language twice. */
    getLanguageCodes(): LanguageCode[] {
        const codes: LanguageCode[] = [];
        for (const text of this.getLanguageTexts()) {
            const code = resolveLanguageCode(text);
            if (code !== undefined && !codes.includes(code)) codes.push(code);
        }
        return codes;
    }

    /** Every region this tag names, as codes, however it spells them. */
    getRegionCodes(): RegionCode[] {
        const codes: RegionCode[] = [];
        for (const text of this.getRegionTexts()) {
            const code = resolveRegionCode(text);
            if (code !== undefined && !codes.includes(code)) codes.push(code);
        }
        return codes;
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
        const langs = this.getMeaningfulLanguages();
        if (langs.length === 0) return undefined;
        const regions = this.getMeaningfulRegions();
        return regions.length > 0
            ? `${langs.join('_')}-${regions.join('_')}`
            : langs.join('_');
    }

    /** This tag's languages as codes where they name one and as written where
     *  they don't, deduplicated by meaning. The serializing form. */
    private getMeaningfulLanguages(): string[] {
        return uniqueByMeaning(
            this.getLanguageTexts(),
            resolveLanguageCode,
        ).map((text) => meaningOf(text, resolveLanguageCode));
    }

    /** This tag's regions, in the same resolve-or-raw form. */
    private getMeaningfulRegions(): string[] {
        return uniqueByMeaning(this.getRegionTexts(), resolveRegionCode).map(
            (text) => meaningOf(text, resolveRegionCode),
        );
    }

    /** A BCP-47 language tag using only the primary language and region (e.g.
     *  `en` or `en-US`). Unlike `getTagString`, this is a valid value for an
     *  HTML `lang` attribute or a SpeechSynthesisUtterance — it never includes
     *  the multilingual `_` joins or multiple regions. Undefined for an empty tag. */
    getBCP47(): string | undefined {
        const language = this.getLanguageText();
        if (language === undefined) return undefined;
        // Resolve-or-raw, so `/Español-México` becomes the valid `es-MX` while
        // an unrecognized code still reaches Intl as written. Every consumer
        // (countWords, pattern/segment, collation) already degrades a tag Intl
        // rejects to the root locale rather than throwing.
        const code = meaningOf(language, resolveLanguageCode);
        const region = this.getRegionText();
        return region
            ? `${code}-${meaningOf(region, resolveRegionCode)}`
            : code;
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

    /** Primary language, as a code, if this tag names one. Read from the full
     *  list rather than the first token, so a tag whose primary is unknown but
     *  whose extra is known still has a language. */
    getLanguageCode(): LanguageCode | undefined {
        return this.getLanguageCodes()[0];
    }

    /** Primary region, as a code, if this tag names one. */
    getRegionCode(): RegionCode | undefined {
        return this.getRegionCodes()[0];
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
        return this.getLanguageCodes().some((code) => code === locale.language);
    }

    /** True if this tag's regions and the given locale's regions match, where
     *  match means both are empty or they share at least one region. */
    isLocaleRegion(locale: Locale) {
        const regions = this.getRegionCodes();
        return (
            (regions.length === 0 && locale.regions.length === 0) ||
            regions.some((region) => locale.regions.includes(region))
        );
    }

    /** One Locale per language in the tag, all sharing this tag's regions. */
    getLocaleIDs(): Locale[] {
        const regions = this.getRegionCodes();
        return this.getLanguageCodes().map((language) => ({
            language,
            regions,
        }));
    }

    /** Locales appropriate for a "languages used" picker: one Locale per
     *  individual language in the tag plus — if multilingual — a single
     *  combination Locale carrying the full language list. Lets pickers
     *  surface each language on its own AND the multilingual combo. */
    getPickerLocaleIDs(): Locale[] {
        const regions = this.getRegionCodes();
        const languages = this.getLanguageCodes();
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

    /** Two tags are equal when they mean the same thing, so `/es` equals
     *  `/Español`. Unrecognized codes compare as written, so `/aaa` still
     *  differs from `/bbb`. */
    isEqualTo(lang: Node) {
        if (!(lang instanceof Language)) return false;
        const same = (a: string[], b: string[]) =>
            a.length === b.length &&
            a.every((text, index) => text === b[index]);
        return (
            same(
                this.getMeaningfulLanguages(),
                lang.getMeaningfulLanguages(),
            ) && same(this.getMeaningfulRegions(), lang.getMeaningfulRegions())
        );
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Language;
    getLocalePath() {
        return Language.LocalePath;
    }

    getDescriptionInputs(
        _: Locales,
        __: Context,
    ): Record<string, TemplateInput> {
        return {
            language: describeTagToken(
                this.language?.getText(),
                resolveLanguageCode,
                (code) => Languages[code]?.name,
            ),
            region: describeTagToken(
                this.region?.getText(),
                resolveRegionCode,
                getRegionName,
            ),
        };
    }

    getCharacter() {
        return Characters.Language;
    }
}
