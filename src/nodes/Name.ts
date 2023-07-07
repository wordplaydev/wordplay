import Node, { type Replacement } from './Node';
import Token from './Token';
import type Conflict from '@conflicts/Conflict';
import Language from './Language';
import type LanguageCode from '@locale/LanguageCode';
import NameToken from './NameToken';
import PlaceholderToken from './PlaceholderToken';
import type Locale from '@locale/Locale';
import { COMMA_SYMBOL } from '@parser/Symbols';
import TokenType from './TokenType';
import Emotion from '../lore/Emotion';
import Purpose from '../concepts/Purpose';
import type Context from './Context';
import type Definition from './Definition';
import Evaluate from './Evaluate';

export default class Name extends Node {
    readonly separator: Token | undefined;
    readonly name: Token | undefined;
    readonly lang?: Language;

    constructor(
        separator: Token | undefined,
        name: Token | undefined,
        lang?: Language
    ) {
        super();

        this.separator = separator;
        this.name = name;
        this.lang = lang;

        this.computeChildren();
    }

    static make(name?: string, lang?: Language) {
        return new Name(
            undefined,
            name !== undefined ? new NameToken(name) : new PlaceholderToken(),
            lang
        );
    }

    getGrammar() {
        return [
            { name: 'separator', types: [Token, undefined] },
            { name: 'name', types: [Token, undefined] },
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

    getCorrespondingDefinition(context: Context): Definition | undefined {
        const name = this.getName();
        if (name === undefined) return undefined;
        // Does this name correspond to an evaluation bind? Find the corresponding input to get its names.
        const evaluate = context.source.root
            .getAncestors(this)
            .filter((n): n is Evaluate => n instanceof Evaluate)[0];
        if (evaluate) {
            const fun = evaluate.getFunction(context);
            if (fun) return fun.inputs.find((input) => input.hasName(name));
        }
        return undefined;
    }

    getPurpose() {
        return Purpose.Represent;
    }

    computeConflicts(): Conflict[] {
        return [];
    }

    hasLanguage() {
        return this.lang !== undefined && this.lang.slash !== undefined;
    }

    withSeparator(): Name {
        return this.separator !== undefined
            ? this
            : new Name(
                  new Token(COMMA_SYMBOL, TokenType.Separator),
                  this.name,
                  this.lang
              );
    }

    isEmoji() {
        return this.name && this.name.text.getLength() === 1;
    }

    getName(): string | undefined {
        return this.name instanceof Token
            ? this.name.text.toString()
            : this.name;
    }

    startsWith(prefix: string) {
        return this.name && this.name.startsWith(prefix);
    }

    getLowerCaseName(): string | undefined {
        return this.name === undefined
            ? undefined
            : this.name
                  .getText()
                  .toLocaleLowerCase(this.lang?.getLanguageCode());
    }
    getLanguage() {
        return this.lang === undefined ? undefined : this.lang.getLanguage();
    }
    isLanguage(lang: LanguageCode) {
        return this.getLanguage() === (lang as LanguageCode);
    }

    isEqualTo(alias: Name) {
        const thisLang = this.lang;
        const thatLang = alias.lang;

        return (
            this.getName() === alias.getName() &&
            ((thisLang === undefined && thatLang === undefined) ||
                (thisLang !== undefined &&
                    thatLang !== undefined &&
                    thisLang.isEqualTo(thatLang)))
        );
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Name;
    }

    getDescriptionInputs() {
        return [this.name?.getText()];
    }

    getGlyphs() {
        return {
            symbols: this.name?.getText() ?? '',
            emotion: Emotion.Kind,
        };
    }
}
