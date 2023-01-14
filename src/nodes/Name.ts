import Node, { type Replacement } from './Node';
import Token from './Token';
import type Conflict from '../conflicts/Conflict';
import Language from './Language';
import type LanguageCode from '../translation/LanguageCode';
import NameToken from './NameToken';
import PlaceholderToken from './PlaceholderToken';
import type Translation from '../translation/Translation';
import { NAME_SEPARATOR_SYMBOL } from '../parser/Symbols';
import TokenType from './TokenType';

export default class Name extends Node {
    readonly separator?: Token;
    readonly name: Token;
    readonly lang?: Language;

    constructor(separator: Token | undefined, name: Token, lang?: Language) {
        super();

        this.separator = separator;
        this.name = name;
        this.lang = lang;

        this.computeChildren();
    }

    static make(name?: string, lang?: Language) {
        return new Name(
            undefined,
            name ? new NameToken(name) : new PlaceholderToken(),
            lang
        );
    }

    getGrammar() {
        return [
            { name: 'separator', types: [Token, undefined] },
            { name: 'name', types: [Token] },
            { name: 'lang', types: [Language, undefined] },
        ];
    }

    clone(replace?: Replacement) {
        return new Name(
            this.replaceChild('separator', this.separator, replace),
            this.replaceChild('name', this.name, replace),
            this.replaceChild('lang', this.lang, replace)
        ) as this;
    }

    computeConflicts(): Conflict[] {
        return [];
    }

    withSeparator(): Name {
        return this.separator !== undefined
            ? this
            : new Name(
                  new Token(NAME_SEPARATOR_SYMBOL, TokenType.NAME_SEPARATOR),
                  this.name,
                  this.lang
              );
    }

    getName(): string | undefined {
        return this.name instanceof Token
            ? this.name.text.toString()
            : this.name;
    }

    startsWith(prefix: string) {
        return this.name.startsWith(prefix);
    }

    getLowerCaseName(): string | undefined {
        return this.name
            .getText()
            .toLocaleLowerCase(this.lang?.getLanguageCode());
    }
    getLanguage() {
        return this.lang === undefined ? undefined : this.lang.getLanguage();
    }
    isLanguage(lang: LanguageCode) {
        return this.getLanguage() === (lang as LanguageCode);
    }

    equals(alias: Name) {
        const thisLang = this.lang;
        const thatLang = alias.lang;

        return (
            this.getName() === alias.getName() &&
            ((thisLang === undefined && thatLang === undefined) ||
                (thisLang !== undefined &&
                    thatLang !== undefined &&
                    thisLang.equals(thatLang)))
        );
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.Name;
    }
}
