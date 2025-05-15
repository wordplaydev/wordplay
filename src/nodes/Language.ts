import type Conflict from '@conflicts/Conflict';
import MissingLanguage from '@conflicts/MissingLanguage';
import UnknownLanguage from '@conflicts/UnknownLanguage';
import type LanguageCode from '@locale/LanguageCode';
import { Languages } from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type { RegionCode } from '@locale/Regions';
import Purpose from '../concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import LanguageToken from './LanguageToken';
import NameToken from './NameToken';
import type { Grammar, Replacement } from './Node';
import Node, { node, optional } from './Node';
import Sym from './Sym';
import type Token from './Token';

export default class Language extends Node {
    readonly slash: Token;
    readonly language: Token | undefined;
    readonly dash: Token | undefined;
    readonly region: Token | undefined;

    constructor(slash: Token, lang?: Token, dash?: Token, region?: Token) {
        super();

        this.slash = slash;
        this.language = lang;
        this.dash = dash;
        this.region = region;

        this.computeChildren();
    }

    static make(lang: string | undefined) {
        return new Language(
            new LanguageToken(),
            lang ? new NameToken(lang) : undefined,
        );
    }

    static getPossibleReplacements() {
        // const prefix =
        //     node instanceof Language && node.language
        //         ? node.language.getText()
        //         : '';
        return Object.keys(Languages).map((language) =>
            Language.make(language),
        );
    }

    static getPossibleAppends() {
        return Object.keys(Languages).map((language) =>
            Language.make(language),
        );
    }

    getDescriptor(): NodeDescriptor {
        return 'Language';
    }

    getGrammar(): Grammar {
        return [
            { name: 'slash', kind: node(Sym.Language) },
            { name: 'language', kind: optional(node(Sym.Name)) },
            { name: 'dash', kind: optional(node(Sym.Region)) },
            { name: 'region', kind: optional(node(Sym.Name)) },
        ];
    }

    clone(replace?: Replacement) {
        return new Language(
            this.replaceChild('slash', this.slash, replace),
            this.replaceChild('language', this.language, replace),
            this.replaceChild('dash', this.dash, replace),
            this.replaceChild('region', this.region, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    computeConflicts(): Conflict[] {
        const conflicts: Conflict[] = [];

        if (this.language === undefined) {
            if (this.slash !== undefined)
                conflicts.push(new MissingLanguage(this, this.slash));
        } else {
            if (!(this.language.getText() in Languages))
                conflicts.push(new UnknownLanguage(this, this.language));
        }

        return conflicts;
    }

    getLanguageText(): string | undefined {
        return this.language ? this.language.getText() : undefined;
    }

    getRegionText(): string | undefined {
        return this.language ? this.region?.getText() : undefined;
    }

    getLanguageCode(): LanguageCode | undefined {
        const lang = this.getLanguageText();
        return lang && lang in Languages ? (lang as LanguageCode) : undefined;
    }

    isLocale(locale: Locale) {
        return this.isLocaleLanguage(locale) && this.isLocaleRegion(locale);
    }

    isLocaleLanguage(locale: Locale) {
        return (
            this.language !== undefined &&
            this.language.getText() === locale.language
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

    getLocaleID(): Locale | undefined {
        const language = this.getLanguageText();
        const region = this.getRegionText();
        return language
            ? {
                  language: language as LanguageCode,
                  regions: region ? [region as RegionCode] : [],
              }
            : undefined;
    }

    isEqualTo(lang: Node) {
        return (
            lang instanceof Language &&
            this.getLanguageText() === lang.getLanguageText() &&
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
        const language = this.language?.getText();
        return [
            language !== undefined && language in Languages
                ? Languages[language as LanguageCode].name
                : undefined,
        ];
    }

    getCharacter() {
        return Characters.Language;
    }
}
