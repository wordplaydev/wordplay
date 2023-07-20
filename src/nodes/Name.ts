import type { Grammar, Replacement } from './Node';
import Token from './Token';
import type Conflict from '@conflicts/Conflict';
import Language from './Language';
import type LanguageCode from '@locale/LanguageCode';
import NameToken from './NameToken';
import type Locale from '@locale/Locale';
import { COMMA_SYMBOL } from '@parser/Symbols';
import Symbol from './Symbol';
import Emotion from '../lore/Emotion';
import Purpose from '../concepts/Purpose';
import type Context from './Context';
import type Definition from './Definition';
import Evaluate from './Evaluate';
import ReservedSymbols from '../parser/ReservedSymbols';
import Node, { node, optional } from './Node';

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
        return new Name(undefined, new NameToken(name ?? '_'), lang);
    }

    getGrammar(): Grammar {
        return [
            { name: 'separator', kind: optional(node(Symbol.Separator)) },
            { name: 'name', kind: optional(node(Symbol.Name)) },
            { name: 'lang', kind: optional(node(Language)) },
        ];
    }

    clone(replace?: Replacement) {
        return new Name(
            this.replaceChild('separator', this.separator, replace),
            this.replaceChild('name', this.name, replace),
            this.replaceChild('lang', this.lang, replace)
        ) as this;
    }

    simplify() {
        return new Name(this.separator, this.name, undefined);
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
        return Purpose.Bind;
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
                  new Token(COMMA_SYMBOL, Symbol.Separator),
                  this.name,
                  this.lang
              );
    }

    /** Symbolic if it matches the binary op regex  */
    isSymbolic() {
        return (
            this.name &&
            (this.name.text.getLength() === 1 ||
                this.name.text
                    .getText()
                    .split('')
                    .every((c) => ReservedSymbols.includes(c)))
        );
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

    isEqualTo(alias: Node) {
        const thisLang = this.lang;
        if (!(alias instanceof Name)) return false;
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
            emotion: Emotion.kind,
        };
    }
}
