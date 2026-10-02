import type Conflict from '#conflicts/Conflict.ts';
import type { InsertContext } from '#edit/revision/EditContext.ts';
import type LanguageCode from '#locale/LanguageCode.ts';
import type Locale from '#locale/Locale.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { type SymType } from '#nodes/Sym.ts';
import { ExpressionStartKeywordSyms } from '#parser/Keywords.ts';
import {
    BasisTypeSymbols,
    COMMA_SYMBOL,
    NOT_SYMBOL,
    SymbolNameRegEx,
} from '#parser/Symbols.ts';
import { OperatorRegEx } from '#parser/Tokenizer.ts';
import { lowerCase } from '#unicode/casing.ts';
import { EmojiTestRegex } from '#unicode/emoji.ts';
import { Purpose } from '#concepts/Purpose.ts';
import { Emotion } from '../lore/Emotion';
import type Context from '#nodes/Context.ts';
import type Definition from '#nodes/Definition.ts';
import Evaluate from '#nodes/Evaluate.ts';
import Language from '#nodes/Language.ts';
import { LanguageTagged } from '#nodes/LanguageTagged.ts';
import NameToken from '#nodes/NameToken.ts';
import type { Grammar, Replacement } from '#nodes/Node.ts';
import Node, { node, optional } from '#nodes/Node.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';

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
        return new Name(NameToken(name ?? '_'), lang, undefined);
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
        return this.cloned(
            new Name(
                this.replaceChild('name', this.name, replace),
                this.replaceChild('language', this.language, replace),
                this.replaceChild('separator', this.separator, replace),
            ),
        );
    }

    /** Doesn't ever make sense to replace a Name with an empty name. */
    static getPossibleReplacements() {
        return [];
    }

    /** Suggest names for insertion.  */
    static getPossibleInsertions({ locales }: InsertContext) {
        return [
            Name.make(
                locales.getUnannotatedPrimaryText((l) => l.glossary.name.word),
            ),
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
     * Symbolic (preferred in symbol display mode) if it's an operator, an emoji, a basis-type
     * delimiter (e.g. `''`, `[]`, `#`, `ø`), or any other Unicode symbol (e.g. `♪`, `⬟`). A name
     * that is merely a single grapheme (a lone letter or kanji) is NOT symbolic — it renders as
     * itself like any word, and is not infix-capable. See LANGUAGE.md.
     */
    isSymbolic() {
        return (
            this.isOperator() ||
            this.isEmoji() ||
            this.isDelimiter() ||
            this.isSymbol()
        );
    }

    /**
     * True if the name is made only of Unicode symbols. Not every symbol is an emoji: `♪` (Note)
     * and `⬟` (Shape) are `So` but not `Extended_Pictographic`, so the emoji test misses them and
     * they would render as though they were words — which they plainly aren't. Letters and digits
     * are excluded, so a lone letter or kanji name stays non-symbolic.
     */
    isSymbol(): boolean {
        return SymbolNameRegEx.test(this.name.getText());
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
        return new Name(NameToken(name), this.language, this.separator);
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
        // A word for ~ wins at expression start too (prefix negation); other operator
        // words (and/or) never win over a name, so they aren't shadows.
        if (
            this.name.isSymbol(Sym.Operator) &&
            this.name.getCanonicalText() === NOT_SYMBOL
        )
            return Sym.Operator;
        return undefined;
    }

    withoutLanguage() {
        return new Name(this.name, undefined, this.separator);
    }

    getLowerCaseName(): string | undefined {
        // Through `lowerCase`, not `toLocaleLowerCase` directly: a tag Intl
        // rejects — including the `😀` symbolic-name code — is a RangeError,
        // and should degrade to the root mapping instead.
        return this.name === undefined
            ? undefined
            : lowerCase(this.name.getText(), this.language?.getBCP47());
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
