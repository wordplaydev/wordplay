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

export default class Name extends LanguageTagged {
    readonly separator: Token | undefined;
    readonly name: Token | undefined;

    constructor(
        separator: Token | undefined,
        name: Token | undefined,
        language?: Language
    ) {
        super(language);

        this.separator = separator;
        this.name = name;

        this.computeChildren();
    }

    static make(name?: string, lang?: Language) {
        return new Name(undefined, new NameToken(name ?? '_'), lang);
    }

    getDescriptor() {
        return 'Name';
    }

    getGrammar(): Grammar {
        return [
            { name: 'separator', kind: optional(node(Sym.Separator)) },
            { name: 'name', kind: optional(node(Sym.Name)) },
            { name: 'language', kind: optional(node(Language)) },
        ];
    }

    clone(replace?: Replacement) {
        return new Name(
            this.replaceChild('separator', this.separator, replace),
            this.replaceChild('name', this.name, replace),
            this.replaceChild('language', this.language, replace)
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
        return this.language !== undefined && this.language.slash !== undefined;
    }

    withSeparator(): Name {
        return this.separator !== undefined
            ? this
            : new Name(
                  new Token(COMMA_SYMBOL, Sym.Separator),
                  this.name,
                  this.language
              );
    }

    /** Symbolic if it matches the binary op regex  */
    isSymbolic() {
        return (
            this.name !== undefined &&
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

    withName(name: string) {
        return new Name(this.separator, new NameToken(name), this.language);
    }

    startsWith(prefix: string) {
        return this.name && this.name.startsWith(prefix);
    }

    withoutLanguage() {
        return new Name(this.separator, this.name, undefined);
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
        return [this.name?.getText()];
    }

    getGlyphs() {
        return {
            symbols: this.name?.getText() ?? '',
            emotion: Emotion.kind,
        };
    }
}
