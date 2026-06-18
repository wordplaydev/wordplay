import { Purpose, type PurposeType } from '@concepts/Purpose';
import {
    getLanguageQuoteOpen,
    getLanguageSecondaryQuote,
} from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import type Locales from '@locale/Locales';
import type { LocaleTextAccessor, TemplateInput } from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import Node, { type Grammar, type Replacement } from '@nodes/Node';
import type Root from '@nodes/Root';
import { Sym, type SymType } from '@nodes/Sym';
import type Spaces from '@parser/Spaces';
import { TextCloseByTextOpen } from '@parser/Tokenizer';
import UnicodeString from '@unicode/UnicodeString';
import { Emotion } from '../lore/Emotion';

/**
 * The concept {@link Purpose} a token belongs to, by its symbol type — so token
 * suggestions in the autocomplete menu group with the feature they're part of
 * (e.g. the pattern `|` under Text, `[` under Lists) instead of all landing in
 * the catch-all "Hidden" group. Symbols with no creator-facing meaning as a
 * standalone suggestion (a bare name, the End/Unknown markers) are left out and
 * fall back to {@link Purpose.Hidden}.
 */
const TokenPurposes = new Map<SymType, PurposeType>([
    // Numbers
    ...[
        Sym.Number,
        Sym.Decimal,
        Sym.Base,
        Sym.Pi,
        Sym.Infinity,
        Sym.NumberType,
        Sym.HanNumeral,
        Sym.RomanNumeral,
        Sym.ThaiNumeral,
        Sym.BengaliNumeral,
        Sym.DevanagariNumeral,
        Sym.GujaratiNumeral,
        Sym.GurmukhiNumeral,
        Sym.KannadaNumeral,
        Sym.TamilNumeral,
        Sym.TeluguNumeral,
    ].map((s): [SymType, PurposeType] => [s, Purpose.Numbers]),
    // Truth
    ...[Sym.Boolean, Sym.BooleanType, Sym.None].map(
        (s): [SymType, PurposeType] => [s, Purpose.Truth],
    ),
    // Text — text literals, formatted text, and language tags.
    ...[
        Sym.Text,
        Sym.Code,
        Sym.Language,
        Sym.LanguageJoin,
        Sym.Region,
        Sym.Locale,
        Sym.Formatted,
        Sym.FormattedType,
    ].map((s): [SymType, PurposeType] => [s, Purpose.Text]),
    // Patterns — the whole pattern sublanguage (`⣿ ⣿` and its constructs).
    ...[
        Sym.PatternDelimiter,
        Sym.PatternAny,
        Sym.PatternLetter,
        Sym.PatternDigit,
        Sym.PatternSpace,
        Sym.PatternRest,
        Sym.PatternWord,
        Sym.PatternWordEdge,
        Sym.PatternStart,
        Sym.PatternEnd,
        Sym.PatternAhead,
        Sym.PatternBehind,
        Sym.PatternFold,
        Sym.PatternRange,
        Sym.PatternComplement,
        Sym.PatternAlternation,
        Sym.PatternSlash,
        Sym.PatternEqual,
        Sym.PatternGreater,
        Sym.PatternGreaterEqual,
        Sym.PatternLess,
        Sym.PatternLessEqual,
        Sym.PatternText,
    ].map((s): [SymType, PurposeType] => [s, Purpose.Patterns]),
    // Documentation — docs and markup formatting.
    ...[
        Sym.Doc,
        Sym.Words,
        Sym.Italic,
        Sym.Underline,
        Sym.Light,
        Sym.Bold,
        Sym.Extra,
        Sym.Link,
        Sym.Concept,
        Sym.URL,
        Sym.Mention,
        Sym.ExternalExample,
        Sym.Highlight,
    ].map((s): [SymType, PurposeType] => [s, Purpose.Documentation]),
    // Lists
    ...[Sym.ListOpen, Sym.ListClose].map((s): [SymType, PurposeType] => [
        s,
        Purpose.Lists,
    ]),
    // Sets and maps
    ...[Sym.SetOpen, Sym.SetClose].map((s): [SymType, PurposeType] => [
        s,
        Purpose.Maps,
    ]),
    // Tables
    ...[
        Sym.TableOpen,
        Sym.TableClose,
        Sym.Select,
        Sym.Insert,
        Sym.Update,
        Sym.Delete,
    ].map((s): [SymType, PurposeType] => [s, Purpose.Tables]),
    // Types
    ...[
        Sym.Type,
        Sym.TypeOpen,
        Sym.TypeClose,
        Sym.Union,
        Sym.Literal,
        Sym.Convert,
    ].map((s): [SymType, PurposeType] => [s, Purpose.Types]),
    // Decisions
    ...[Sym.Conditional, Sym.Otherwise, Sym.Match].map(
        (s): [SymType, PurposeType] => [s, Purpose.Decisions],
    ),
    // Definitions
    ...[
        Sym.Function,
        Sym.Bind,
        Sym.Share,
        Sym.Borrow,
        Sym.EvalOpen,
        Sym.EvalClose,
        Sym.Access,
    ].map((s): [SymType, PurposeType] => [s, Purpose.Definitions]),
    // Inputs — streams and their operators.
    ...[Sym.Stream, Sym.Change, Sym.Initial, Sym.Previous].map(
        (s): [SymType, PurposeType] => [s, Purpose.Inputs],
    ),
    // Advanced — grouping, access, and other structural/meta symbols.
    ...[
        Sym.TagOpen,
        Sym.TagClose,
        Sym.Separator,
        Sym.Placeholder,
        Sym.This,
        Sym.Translate,
        Sym.Operator,
        Sym.Etc,
    ].map((s): [SymType, PurposeType] => [s, Purpose.Advanced]),
]);

export default class Token extends Node {
    /** The one or more types of token this might represent. This is narrowed during parsing to one.*/
    readonly types: SymType[];

    /** The text of the token */
    readonly text: UnicodeString;

    constructor(text: string | UnicodeString, types: SymType | SymType[]) {
        super();

        this.types = Array.isArray(types) ? types : [types];

        // Ensure tokens are canonically structured from a unicode perspective.
        this.text =
            text instanceof UnicodeString ? text : new UnicodeString(text);

        // No token is allowed to be empty except the end token.
        // if (
        //     this.text.isEmpty() &&
        //     !this.isSymbol(Sym.End) &&
        //     !this.isSymbol(Sym.Words)
        // )
        //     throw Error('This token has no text');
    }

    // NODE CONTRACT

    getDescriptor(): NodeDescriptor {
        return 'Token';
    }

    getGrammar(): Grammar {
        return [];
    }

    isLeaf(): this is Token {
        return true;
    }

    computeConflicts() {
        return [];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Token;
    getLocalePath() {
        return Token.LocalePath;
    }

    getPurpose() {
        // Categorize by the token's symbol type(s) so suggestions group with the
        // feature they belong to. A token may carry several candidate types
        // (e.g. PatternLetter|LanguageJoin); use the first that maps. Symbols
        // with no creator-facing purpose fall back to Hidden.
        for (const type of this.types) {
            const purpose = TokenPurposes.get(type);
            if (purpose !== undefined) return purpose;
        }
        return Purpose.Hidden;
    }

    // TOKEN TYPES

    isntSymbol(type: SymType) {
        return !this.isSymbol(type);
    }

    isSymbol(type: SymType) {
        return this.getTypes().includes(type);
    }

    isName() {
        return this.isSymbol(Sym.Name);
    }

    getTypes() {
        return this.types;
    }

    isEqualTo(node: Node) {
        return (
            node instanceof Token &&
            this.getText() === node.getText() &&
            this.types.some((type1) =>
                node.types.some((type2) => type1 === type2),
            )
        );
    }

    toWordplay(spaces?: Spaces): string {
        return `${spaces?.getSpace(this) ?? ''}${this.text.toString()}`;
    }

    // TEXT UTILITIES
    getText() {
        return this.text.toString();
    }

    toText() {
        return this.text.toString();
    }

    getDelimiters() {
        return (
            (this.text.at(0)?.toString() ?? '') +
            (this.text.at(this.text.getLength() - 1)?.toString() ?? '')
        );
    }

    /** Get the grapheme length of the text (as opposed to the codepoint length) */
    getTextLength() {
        return this.text.getLength();
    }

    startsWith(prefix: string) {
        return this.text.startsWith(prefix);
    }

    containsText(text: string) {
        return this.text.contains(text);
    }

    /**
     * Override node's
     * */
    getLabel(locales: Locales): string {
        return getTokenLabel(this, locales);
    }

    /** If this is a placeholder, determine a label for it. */
    getPlaceholder(
        root: Root,
        context: Context,
        locales: Locales,
    ): LocaleTextAccessor | undefined {
        if (!this.isSymbol(Sym.Placeholder)) return undefined;
        const parent = root.getParent(this);
        return parent === undefined
            ? undefined
            : parent.getChildPlaceholderLabel(this, locales, context, root);
    }

    getDescriptionInputs(locales: Locales): Record<string, TemplateInput> {
        return { label: getTokenLabel(this, locales) };
    }

    localized(
        // If the caret is inside the token
        inside: boolean,
        symbolic: boolean,
        locale: Locale,
        root: Root,
        context: Context,
    ) {
        // Get this token's text
        let text = this.getText();

        // Is this text? Localize delimiters.
        const isText = this.isSymbol(Sym.Text);
        if (isText) {
            // Find the parent.
            const parent = root.getParent(this);
            if (parent) {
                const leaves = parent
                    .leaves()
                    .filter((t) => t.isSymbol(Sym.Text));

                const open =
                    leaves[0] instanceof Token && leaves[0].isSymbol(Sym.Text)
                        ? leaves[0]
                        : undefined;
                const close =
                    leaves.at(-1) instanceof Token &&
                    leaves.at(-1)?.isSymbol(Sym.Text)
                        ? leaves.at(-1)
                        : undefined;
                if (open) {
                    const preferredQuote = getLanguageQuoteOpen(
                        locale.language,
                    );
                    const preferredSecondaryQuote = getLanguageSecondaryQuote(
                        locale.language,
                    );
                    const preferredOpen =
                        open.getText() === preferredQuote
                            ? preferredQuote
                            : open.getText() === preferredSecondaryQuote
                              ? preferredSecondaryQuote
                              : preferredQuote;
                    // Is this the open and its not the preferred quote? Make it the preferred one.
                    if (open === this) text = preferredOpen;
                    // Is this the close and the close isn't the preferred?
                    if (close === this)
                        text = TextCloseByTextOpen[preferredOpen];
                }
            }
        }

        // Is this a name? Choose the most appropriate name.
        if (
            // Caret isn't in the name?
            !inside &&
            // The name is more than 1 symbol? (We preserve symbolic names)
            this.getTextLength() > 1 &&
            // The token is a name or operator?
            (this.isSymbol(Sym.Name) || this.isSymbol(Sym.Operator))
        ) {
            const parent = root.getParent(this);
            let def: Definition | undefined = undefined;
            if (parent) {
                def = parent.getCorrespondingDefinition(context);
                if (def) {
                    text = def.names.getPreferredNameString(locale, symbolic);
                }
            }
        }

        // Return the localized text.
        return text;
    }

    // TRANSFORMATIONS

    clone(replace?: Replacement): this {
        if (replace === undefined)
            return new Token(this.text, this.types) as this;

        const { original, replacement } = replace;
        // Is this what we're replacing? Replace it.
        if (original === this && replacement instanceof Token)
            return replacement as this;
        // Otherwise, just return this, since it isn't changing.
        else return this;
    }

    withText(text: string) {
        return new Token(text, this.types);
    }

    // DEBUGGING

    toString(depth = 0) {
        return `${'\t'.repeat(depth)}${
            Array.isArray(this.types) ? this.types.join() : Sym[this.types]
        }: ${this.text
            .toString()
            .replaceAll('\n', '\\n')
            .replaceAll('\t', '\\t')}`;
    }

    getCharacter() {
        return { symbols: this.getText(), emotion: Emotion.cheerful };
    }
}

export function getTokenLabel(token: Node, locales: Locales): string {
    if (!(token instanceof Token)) return token.getLabel(locales);

    const tokenType = Object.entries(Sym).find(
        ([, val]) => val === token.types[0],
    );
    const tokenLabel = tokenType
        ? locales.getLocale().token[tokenType[0] as keyof typeof Sym]
        : '';
    return tokenLabel;
}
