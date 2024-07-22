import type { Grammar, Replacement } from './Node';
import Token from './Token';
import type Conflict from '@conflicts/Conflict';
import Language from './Language';
import NameToken from './NameToken';
import { COMMA_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import Emotion from '../lore/Emotion';
import Purpose from '../concepts/Purpose';
import type Context from './Context';
import type Definition from './Definition';
import Evaluate from './Evaluate';
import ReservedSymbols from '../parser/ReservedSymbols';
import Node, { node, optional } from './Node';
import { LanguageTagged } from './LanguageTagged';
import type Locales from '../locale/Locales';
import type LanguageCode from '@locale/LanguageCode';
import type Locale from '@locale/Locale';

export default class Name extends LanguageTagged {
    readonly name: Token;
    readonly separator: Token | undefined;

    constructor(
        name: Token,
        language: Language | undefined = undefined,
        separator: Token | undefined = undefined,
    ) {
        super(language);

        this.name = name;
        this.separator = separator;

        this.computeChildren();
    }

    static make(name?: string, lang?: Language) {
        return new Name(new NameToken(name ?? '_'), lang, undefined);
    }

    getDescriptor() {
        return 'Name';
    }

    getGrammar(): Grammar {
        return [
            { name: 'name', kind: node(Sym.Name) },
            { name: 'language', kind: optional(node(Language)) },
            { name: 'separator', kind: optional(node(Sym.Separator)) },
        ];
    }

    clone(replace?: Replacement) {
        return new Name(
            this.replaceChild('name', this.name, replace),
            this.replaceChild('language', this.language, replace),
            this.replaceChild('separator', this.separator, replace),
        ) as this;
    }

    simplify() {
        return new Name(this.name, undefined, this.separator);
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
        return this.language !== undefined && this.language.slash !== undefined;
    }

    isLanguage(lang: LanguageCode) {
        return this.language?.getLanguageCode() === lang;
    }

    isLocale(locale: Locale) {
        return this.language !== undefined && this.language.isLocale(locale);
    }

    withSeparator(): Name {
        return this.separator !== undefined
            ? this
            : new Name(
                  this.name,
                  this.language,
                  new Token(COMMA_SYMBOL, Sym.Separator),
              );
    }

    /** Symbolic if it matches the binary op regex  */
    isSymbolic() {
        return (
            this.name.text.getLength() === 1 ||
            this.name.text
                .getText()
                .split('')
                .every((c) => ReservedSymbols.includes(c))
        );
    }

    getName(): string {
        return this.name.getText();
    }

    withName(name: string) {
        return new Name(new NameToken(name), this.language, this.separator);
    }

    startsWith(prefix: string) {
        return this.name && this.name.startsWith(prefix);
    }

    withoutLanguage() {
        return new Name(this.name, undefined, this.separator);
    }

    getLowerCaseName(): string | undefined {
        return this.name === undefined
            ? undefined
            : this.name
                  .getText()
                  .toLocaleLowerCase(this.language?.getLanguageCode());
    }

    isEqualTo(alias: Node) {
        const thisLang = this.language;
        if (!(alias instanceof Name)) return false;
        const thatLang = alias.language;

        return (
            this.getName() === alias.getName() &&
            ((thisLang === undefined && thatLang === undefined) ||
                (thisLang !== undefined &&
                    thatLang !== undefined &&
                    thisLang.isEqualTo(thatLang)))
        );
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Name);
    }

    getDescriptionInputs() {
        return [this.name.getText()];
    }

    getGlyphs() {
        return {
            symbols: this.name.getText(),
            emotion: Emotion.kind,
        };
    }
}
