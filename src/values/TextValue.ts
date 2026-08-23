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
import { lowerCase, upperCase } from '@unicode/casing';
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

    /* The number of graphemes in the text (not the number of code points).
     * Code points would disagree with `→ ['']`, `subsequence`, and `index`,
     * which all segment: a family emoji is one symbol but five code points. */
    length(requestor: Expression) {
        return new NumberValue(requestor, this.graphemes().length);
    }

    /** This text's graphemes, the unit every position-based operation counts in
     *  (LANGUAGE.md: text is a sequence of graphemes, not code points). */
    private graphemes() {
        return new UnicodeString(this.text).getGraphemes();
    }

    repeat(requestor: Expression, count: number) {
        return new TextValue(requestor, this.text.repeat(count), this.language);
    }

    /** Casing follows this text's own locale tag, since only the tag says what
     *  language the letters are in; untagged text uses Unicode's root mapping. */
    uppercase(requestor: Expression) {
        return new TextValue(
            requestor,
            upperCase(this.text, this.language?.getBCP47()),
            this.language,
        );
    }

    lowercase(requestor: Expression) {
        return new TextValue(
            requestor,
            lowerCase(this.text, this.language?.getBCP47()),
            this.language,
        );
    }

    /** A slice of the text, in graphemes. Mirrors List.subsequence exactly —
     *  1-based, inclusive, clamped, and an inverted range comes back reversed —
     *  so the same name doesn't mean two different things. */
    subsequence(requestor: Expression, start: number, end: number | undefined) {
        const graphemes = this.graphemes();
        const from = Math.max(1, start);
        const to = Math.min(graphemes.length, end ?? graphemes.length);
        const slice = graphemes.slice(
            Math.min(from, to) - 1,
            Math.max(from, to),
        );
        return new TextValue(
            requestor,
            (from > to ? slice.reverse() : slice).join(''),
            this.language,
        );
    }

    /** The 1-based grapheme position of the first occurrence, or undefined.
     *  Counted in graphemes so it lines up with length and subsequence; a
     *  UTF-16 index would point into the middle of an emoji. */
    index(text: TextValue): number | undefined {
        if (text.text.length === 0) return undefined;
        const graphemes = this.graphemes();
        const target = new UnicodeString(text.text).getGraphemes();
        for (let i = 0; i <= graphemes.length - target.length; i++)
            if (target.every((g, j) => graphemes[i + j] === g)) return i + 1;
        return undefined;
    }

    /** Every occurrence of one text replaced by another. Unions the locales the
     *  way combine does, since the replacement's own words end up in the result.
     *  Replacing nothing is a no-op rather than splicing between every symbol. */
    replace(requestor: Expression, of: TextValue, replacement: TextValue) {
        return new TextValue(
            requestor,
            of.text.length === 0
                ? this.text
                : // UnicodeString.split matches whole graphemes, so this can't
                  // cut into the middle of an emoji the way String.split can.
                  new UnicodeString(this.text)
                      .split(of.text)
                      .join(replacement.text),
            Language.union(this.language, replacement.language),
        );
    }

    /** The text without leading and trailing whitespace. */
    trim(requestor: Expression) {
        return new TextValue(requestor, this.text.trim(), this.language);
    }

    /** The text backwards, by grapheme, so emoji and accents stay whole. */
    reverse(requestor: Expression) {
        return new TextValue(
            requestor,
            this.graphemes().reverse().join(''),
            this.language,
        );
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

    /**
     * Two texts are equal when they say the same thing. A language tag records what
     * language the text is written in, not which text it is, so it doesn't take part:
     * comparing it made `'x' = 'x'/en` silently false forever, which meant any check of
     * untagged input — a key press, a chat message — against a localized word could
     * never be true.
     */
    isEqualTo(text: Value) {
        return text instanceof TextValue && this.text === text.text;
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
