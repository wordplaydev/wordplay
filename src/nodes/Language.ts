import MissingLanguage from '@conflicts/MissingLanguage';
import Node, { node, optional } from './Node';
import type { Grammar, Replacement } from './Node';
import type Token from './Token';
import NameToken from './NameToken';
import LanguageToken from './LanguageToken';
import type Conflict from '@conflicts/Conflict';
import { Languages } from '@locale/LanguageCode';
import UnknownLanguage from '@conflicts/UnknownLanguage';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Symbol from './Symbol';
import type Type from './Type';
import type LanguageCode from '@locale/LanguageCode';

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

    static make(lang: string) {
        return new Language(new LanguageToken(), new NameToken(lang));
    }

    static getPossibleNodes(type: Type | undefined, node: Node | undefined) {
        const prefix =
            node instanceof Language && node.language
                ? node.language.getText()
                : '';
        return Object.keys(Languages)
            .filter((lang) => lang.startsWith(prefix))
            .map((language) => Language.make(language));
    }

    getGrammar(): Grammar {
        return [
            { name: 'slash', kind: node(Symbol.Language) },
            { name: 'language', kind: optional(node(Symbol.Name)) },
            { name: 'dash', kind: optional(node(Symbol.Region)) },
            { name: 'region', kind: optional(node(Symbol.Name)) },
        ];
    }

    clone(replace?: Replacement) {
        return new Language(
            this.replaceChild('slash', this.slash, replace),
            this.replaceChild('language', this.language, replace),
            this.replaceChild('dash', this.dash, replace),
            this.replaceChild('region', this.region, replace)
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

    isLocaleRegion(locale: Locale) {
        return (
            this.region !== undefined && this.region.getText() === locale.region
        );
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

    getNodeLocale(translation: Locale) {
        return translation.node.Language;
    }

    getDescriptionInputs() {
        const language = this.language?.getText();
        return [
            language !== undefined && language in Languages
                ? Languages[language as LanguageCode].name
                : undefined,
        ];
    }

    getGlyphs() {
        return Glyphs.Language;
    }
}
