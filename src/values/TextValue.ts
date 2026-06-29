import type LocaleText from '@locale/LocaleText';
import getConceptName from '@locale/getConceptName';
import Language from '@nodes/Language';
import TextType from '@nodes/TextType';
import BoolValue from '@values/BoolValue';
import ListValue from '@values/ListValue';
import NumberValue from '@values/NumberValue';
import type Value from '@values/Value';
import type { BasisTypeName } from '@basis/BasisConstants';
import type Expression from '@nodes/Expression';
import UnicodeString from '@unicode/UnicodeString';
import SimpleValue from '@values/SimpleValue';

export default class TextValue extends SimpleValue {
    readonly text: string;
    /** The locale of this text, held as a Language node (not a string) to avoid
     *  drift with the node-level locale semantics. Undefined when untagged. */
    readonly language: Language | undefined;

    constructor(creator: Expression, text: string, language?: Language) {
        super(creator);

        // We normalize all strings to ensure they are comparable.
        this.text = text.normalize();
        // A language tag with no codes (e.g. a bare `/`) is no tag at all.
        this.language =
            language !== undefined && language.getTagString() !== undefined
                ? language
                : undefined;
    }

    getType() {
        return TextType.make(undefined, this.language);
    }

    getBasisTypeName(): BasisTypeName {
        return 'text';
    }

    /* The number of graphemes in the text (not the number of code points). */
    length(requestor: Expression) {
        return new NumberValue(requestor, [...this.text].length);
    }

    repeat(requestor: Expression, count: number) {
        return new TextValue(requestor, this.text.repeat(count), this.language);
    }

    segment(requestor: Expression, delimiter: TextValue | string) {
        return new ListValue(
            requestor,
            new UnicodeString(this.text)
                .split(
                    typeof delimiter === 'string' ? delimiter : delimiter.text,
                )
                // Each fragment inherits the source text's locale.
                .map((s) => new TextValue(requestor, s, this.language)),
        );
    }

    combine(requestor: Expression, text: TextValue) {
        // Union the operands' locales: an untagged side inherits the other,
        // and differing tags merge into a multilingual/multi-region tag.
        return new TextValue(
            requestor,
            this.text + text.text,
            Language.union(this.language, text.language),
        );
    }

    has(requestor: Expression, text: TextValue) {
        return new BoolValue(requestor, this.text.includes(text.text));
    }

    starts(requestor: Expression, text: TextValue) {
        return new BoolValue(requestor, this.text.startsWith(text.text));
    }

    ends(requestor: Expression, text: TextValue) {
        return new BoolValue(requestor, this.text.endsWith(text.text));
    }

    toWordplay(): string {
        // Language renders its own leading slash (e.g. `/en`).
        return `"${this.text}"${this.language ? this.language.toWordplay() : ''}`;
    }

    isEqualTo(text: Value) {
        return (
            text instanceof TextValue &&
            this.text === text.text &&
            ((this.language === undefined && text.language === undefined) ||
                (this.language !== undefined &&
                    text.language !== undefined &&
                    this.language.isEqualTo(text.language)))
        );
    }

    /**
     * Converts the text into a number that allows text to be locale sequenced.
     * The sequencing key is the sum of the positionally-weighted code points in the string.
     * This means that the comparison limit is approximately 300 code points long.
     * After that, JavaScript will start returning positive infinity. In practice,
     * this shouldn't matter too much, since it will be pretty rare to be comparing the
     * 301st symbol of two otherwise identical strings. But it will happen.
     */
    sequenced(requestor: Expression): NumberValue {
        let sum = 0;
        for (let i = 0; i < this.text.length; i++) {
            const codepoint = this.text.codePointAt(i) ?? 0;
            sum += codepoint * Math.pow(10, -i);
        }
        return new NumberValue(requestor, sum);
    }

    getDescription() {
        return (l: LocaleText) => getConceptName(l, 'text');
    }

    getRepresentativeText() {
        return new UnicodeString(this.text).at(0)?.toString() ?? '';
    }

    getSize() {
        return 1;
    }
}
