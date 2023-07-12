import MissingLanguage from '@conflicts/MissingLanguage';
import Node from './Node';
import type { Replacement } from './Node';
import Token from './Token';
import NameToken from './NameToken';
import LanguageToken from './LanguageToken';
import type Conflict from '@conflicts/Conflict';
import { Languages } from '@locale/LanguageCode';
import UnknownLanguage from '@conflicts/UnknownLanguage';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';

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

    getGrammar() {
        return [
            { name: 'slash', types: [Token] },
            { name: 'lang', types: [Token, undefined] },
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
