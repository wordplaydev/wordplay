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

export default class Language extends Node {
    readonly slash: Token;
    readonly lang?: Token;

    constructor(slash: Token, lang?: Token) {
        super();

        this.slash = slash;
        this.lang = lang;

        this.computeChildren();
    }

    static make(lang: string) {
        return new Language(new LanguageToken(), new NameToken(lang));
    }

    static getPossibleNodes(
        type: Type | undefined,
        node: Node | undefined,
        selected: boolean
    ) {
        const prefix =
            node instanceof Language && node.lang ? node.lang.getText() : '';
        return Object.keys(Languages)
            .filter((lang) => lang.startsWith(prefix))
            .map((language) => Language.make(language));
    }

    getGrammar(): Grammar {
        return [
            { name: 'slash', kind: node(Symbol.Language) },
            { name: 'lang', kind: optional(node(Symbol.Name)) },
        ];
    }

    clone(replace?: Replacement) {
        return new Language(
            this.replaceChild('slash', this.slash, replace),
            this.replaceChild('lang', this.lang, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    computeConflicts(): Conflict[] {
        const conflicts: Conflict[] = [];

        if (this.lang === undefined) {
            if (this.slash !== undefined)
                conflicts.push(new MissingLanguage(this, this.slash));
        } else {
            if (!(this.lang.getText() in Languages))
                conflicts.push(new UnknownLanguage(this, this.lang));
        }

        return conflicts;
    }

    getLanguage() {
        return this.lang ? this.lang.getText() : undefined;
    }
    getLanguageCode() {
        const lang = this.getLanguage();
        return lang && lang in Languages ? lang : undefined;
    }

    isEqualTo(lang: Node) {
        return (
            lang instanceof Language &&
            this.getLanguage() === lang.getLanguage()
        );
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Language;
    }

    getDescriptionInputs() {
        return [
            this.lang
                ? Languages[this.lang.getText()]?.name ?? undefined
                : undefined,
        ];
    }

    getGlyphs() {
        return Glyphs.Language;
    }
}
