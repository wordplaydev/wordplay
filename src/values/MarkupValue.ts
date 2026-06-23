import type LocaleText from '@locale/LocaleText';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import type { BasisTypeName } from '@basis/BasisConstants';
import type Expression from '@nodes/Expression';
import FormattedType from '@nodes/FormattedType';
import Language from '@nodes/Language';
import Markup from '@nodes/Markup';
import type Type from '@nodes/Type';
import BoolValue from '@values/BoolValue';
import NumberValue from '@values/NumberValue';
import SimpleValue from '@values/SimpleValue';
import type TextValue from '@values/TextValue';
import type Value from '@values/Value';

export default class MarkupValue extends SimpleValue {
    readonly markup: Markup;
    /** The locale of this markup, held as a Language node (mirrors TextValue). */
    readonly language: Language | undefined;

    constructor(creator: Expression, markup: Markup, language?: Language) {
        super(creator);
        this.markup = markup;
        // A language tag with no codes (e.g. a bare `/`) is no tag at all.
        this.language =
            language !== undefined && language.getTagString() !== undefined
                ? language
                : undefined;
    }

    getType(): Type {
        return FormattedType.make(this.language);
    }

    getBasisTypeName(): BasisTypeName {
        return 'formatted';
    }

    /** The number of graphemes in the markup's plain text content (ignoring
     *  formatting and paragraph breaks). */
    length(requestor: Expression) {
        return new NumberValue(
            requestor,
            [...this.markup.getPlainText()].length,
        );
    }

    has(requestor: Expression, text: TextValue) {
        return new BoolValue(
            requestor,
            this.markup.getPlainText().includes(text.text),
        );
    }

    starts(requestor: Expression, text: TextValue) {
        return new BoolValue(
            requestor,
            this.markup.getPlainText().startsWith(text.text),
        );
    }

    ends(requestor: Expression, text: TextValue) {
        return new BoolValue(
            requestor,
            this.markup.getPlainText().endsWith(text.text),
        );
    }

    repeat(requestor: Expression, count: number) {
        // Mirror text: zero or fewer copies is empty. Each copy is cloned so
        // its nodes get fresh IDs (output keys ValueViews by node identity);
        // concat preserves paragraph breaks when the markup is multi-paragraph.
        let result = new Markup([]);
        for (let i = 0; i < count; i++)
            result = result.concat(this.markup.clone());
        return new MarkupValue(requestor, result, this.language);
    }

    combine(requestor: Expression, markup: MarkupValue) {
        // Concatenate (paragraph-preserving) and union the locales (mirrors
        // TextValue). The operands are distinct nodes, so no cloning is needed.
        return new MarkupValue(
            requestor,
            this.markup.concat(markup.markup),
            Language.union(this.language, markup.language),
        );
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof MarkupValue &&
            value.markup.isEqualTo(this.markup) &&
            ((this.language === undefined && value.language === undefined) ||
                (this.language !== undefined &&
                    value.language !== undefined &&
                    this.language.isEqualTo(value.language)))
        );
    }

    getDescription() {
        return (l: LocaleText) => l.node.Markup.name;
    }

    getRepresentativeText() {
        return this.markup
            .nodes()
            .filter(
                (n): n is Token => n instanceof Token && n.isSymbol(Sym.Words),
            )[0]
            ?.getText();
    }

    getSize(): number {
        return 1;
    }

    toWordplay() {
        // Faithful Wordplay source: the markup wrapped in its `…` delimiters
        // plus the locale (e.g. `` `hi`/en ``), mirroring TextValue's
        // `"text"/locale`. Language renders its own leading slash.
        return `\`${this.markup.toWordplay()}\`${this.language ? this.language.toWordplay() : ''}`;
    }
}
