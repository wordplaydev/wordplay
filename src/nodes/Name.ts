import type Conflict from '@conflicts/Conflict';
import type { InsertContext } from '@edit/revision/EditContext';
import type LanguageCode from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { type SymType } from '@nodes/Sym';
import { ExpressionStartKeywordSyms } from '@parser/Keywords';
import { BasisTypeSymbols, COMMA_SYMBOL } from '@parser/Symbols';
import { OperatorRegEx } from '@parser/Tokenizer';
import { EmojiTestRegex } from '@unicode/emoji';
import { Purpose } from '@concepts/Purpose';
import { Emotion } from '../lore/Emotion';
import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import Evaluate from '@nodes/Evaluate';
import Language from '@nodes/Language';
import { LanguageTagged } from '@nodes/LanguageTagged';
import NameToken from '@nodes/NameToken';
import type { Grammar, Replacement } from '@nodes/Node';
import Node, { node, optional } from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

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

    getDescriptor(): NodeDescriptor {
        return 'Name';
    }

    getGrammar(): Grammar {
        return [
            { name: 'name', kind: node(Sym.Name), label: undefined },
            {
                name: 'language',
                kind: optional(node(Language)),
                label: () => (l) => l.glossary.language.word,
            },
            {
                name: 'separator',
                kind: optional(node(Sym.Separator)),
                label: undefined,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Name(
            this.replaceChild('name', this.name, replace),
            this.replaceChild('language', this.language, replace),
            this.replaceChild('separator', this.separator, replace),
        ) as this;
    }

    /** Doesn't ever make sense to replace a Name with an empty name. */
    static getPossibleReplacements() {
        return [];
    }

    /** Suggest names for insertion.  */
    static getPossibleInsertions({ locales }: InsertContext) {
        return [
            Name.make(locales.getUnannotatedText((l) => l.glossary.name.word)),
        ];
    }

    simplify() {
        return this.withoutLanguage();
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
        return Purpose.Definitions;
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

    /**
     * Symbolic (preferred in symbol display mode) if it's an operator, an emoji, or a basis-type
     * delimiter (e.g. `''`, `[]`, `#`, `ø`). A name that is merely a single grapheme (a lone letter
     * or kanji) is NOT symbolic — it renders as itself like any word, and is not infix-capable.
     * See LANGUAGE.md.
     */
    isSymbolic() {
        return this.isOperator() || this.isEmoji() || this.isDelimiter();
    }

    /** True if this is a basis type's delimiter name (the symbolic form of Text, List, etc.). */
    isDelimiter(): boolean {
        return BasisTypeSymbols.has(this.name.getText());
    }

    getName(): string {
        return this.name.getText();
    }

    isEmoji(): boolean {
        return EmojiTestRegex.test(this.name.getText());
    }

    withName(name: string) {
        return new Name(new NameToken(name), this.language, this.separator);
    }

    startsWith(prefix: string) {
        return this.name && this.name.startsWith(prefix);
    }

    isOperator() {
        return OperatorRegEx.test(this.name.text.getText());
    }

    /**
     * If this name's token is a dual-type localized keyword (it carries Name plus a keyword Sym whose
     * construct wins over a name at expression start), return that keyword Sym — i.e. this name
     * shadows a keyword. Returns undefined for ordinary names and for keyword collisions that leave
     * the name fully usable (number type, operators). See LANGUAGE.md.
     */
    getShadowedKeyword(): SymType | undefined {
        for (const sym of ExpressionStartKeywordSyms)
            if (this.name.isSymbol(sym)) return sym;
        return undefined;
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

    static readonly LocalePath = (l: LocaleText) => l.node.Name;
    getLocalePath() {
        return Name.LocalePath;
    }

    getDescriptionInputs() {
        return {
            name: this.name.getText(),
        };
    }

    getCharacter() {
        return { symbols: this.name.getText(), emotion: Emotion.kind };
    }
}
