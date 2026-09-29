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
    /** Which words are in which language, when there are several (see
     *  `TextPart`); undefined for text in one language, which is nearly all. */
    readonly parts: readonly TextPart[] | undefined;

    constructor(
        creator: Expression,
        text: string,
        language?: Language,
        parts?: readonly TextPart[],
    ) {
        super(creator);

        // We normalize all strings to ensure they are comparable.
        this.text = text.normalize();
        // A language tag with no codes (e.g. a bare `/`) is no tag at all.
        this.language =
            language !== undefined && language.getTagString() !== undefined
                ? language
                : undefined;
        this.parts =
            parts === undefined
                ? undefined
                : keepParts(this.text, parts, this.language);
    }

    /** This text's parts, or the whole of it as one part in its own language. */
    getParts(): readonly TextPart[] {
        return this.parts ?? [{ text: this.text, language: this.language }];
    }

    /** Whether joining with another text would mix languages, and so needs parts. */
    private mixesWith(text: TextValue) {
        return (
            this.parts !== undefined ||
            text.parts !== undefined ||
            (this.language !== undefined &&
                text.language !== undefined &&
                !sameLanguage(this.language, text.language))
        );
    }

    /** Parts for these graphemes of this text, taken in any order. */
    private partsOf(indices: readonly number[]): TextPart[] | undefined {
        if (this.parts === undefined) return undefined;
        const graphemes = this.graphemes();
        const starts = graphemeStarts(graphemes);
        return partsOfGraphemes(
            this.parts,
            indices.map((index) => graphemes[index] ?? ''),
            indices.map((index) => starts[index] ?? 0),
        );
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
        const parts = this.parts;
        return new TextValue(
            requestor,
            this.text.repeat(count),
            this.language,
            parts === undefined
                ? undefined
                : Array.from(
                      { length: Math.max(0, count) },
                      () => parts,
                  ).flat(),
        );
    }

    /** Each part cased under its own language, which may differ between parts
     *  (Turkish dotted i beside English, say). */
    private cased(
        requestor: Expression,
        casing: (text: string, locale: string | undefined) => string,
    ) {
        if (this.parts === undefined)
            return new TextValue(
                requestor,
                casing(this.text, this.language?.getBCP47()),
                this.language,
            );
        const parts = this.parts.map((part) => ({
            text: casing(
                part.text,
                (part.language ?? this.language)?.getBCP47(),
            ),
            language: part.language,
        }));
        return new TextValue(
            requestor,
            parts.map((part) => part.text).join(''),
            this.language,
            parts,
        );
    }

    /** Casing follows this text's own locale tag, since only the tag says what
     *  language the letters are in; untagged text uses Unicode's root mapping. */
    uppercase(requestor: Expression) {
        return this.cased(requestor, upperCase);
    }

    lowercase(requestor: Expression) {
        return this.cased(requestor, lowerCase);
    }

    /** A slice of the text, in graphemes. Mirrors List.subsequence exactly —
     *  1-based, inclusive, clamped, and an inverted range comes back reversed —
     *  so the same name doesn't mean two different things. */
    subsequence(requestor: Expression, start: number, end: number | undefined) {
        const graphemes = this.graphemes();
        const from = Math.max(1, start);
        const to = Math.min(graphemes.length, end ?? graphemes.length);
        const first = Math.min(from, to) - 1;
        const slice = graphemes.slice(first, Math.max(from, to));
        const indices = slice.map((_, index) => first + index);
        if (from > to) {
            slice.reverse();
            indices.reverse();
        }
        return new TextValue(
            requestor,
            slice.join(''),
            this.language,
            this.partsOf(indices),
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
        if (of.text.length === 0)
            return new TextValue(
                requestor,
                this.text,
                Language.union(this.language, replacement.language),
                this.parts,
            );
        // UnicodeString.split matches whole graphemes, so this can't cut into
        // the middle of an emoji the way String.split can.
        const pieces = new UnicodeString(this.text).split(of.text);
        const language = Language.union(this.language, replacement.language);
        if (!this.mixesWith(replacement))
            return new TextValue(
                requestor,
                pieces.join(replacement.text),
                language,
            );
        // Each piece keeps its own parts, and the replacement brings its own.
        const own = this.getParts();
        const parts: TextPart[] = [];
        let offset = 0;
        pieces.forEach((piece, index) => {
            if (index > 0) parts.push(...replacement.getParts());
            parts.push(...sliceParts(own, offset, offset + piece.length));
            offset += piece.length + of.text.length;
        });
        return new TextValue(
            requestor,
            pieces.join(replacement.text),
            language,
            parts,
        );
    }

    /** The text without leading and trailing whitespace. */
    trim(requestor: Expression) {
        const start = this.text.length - this.text.trimStart().length;
        const end = this.text.trimEnd().length;
        return new TextValue(
            requestor,
            this.text.trim(),
            this.language,
            this.parts === undefined
                ? undefined
                : sliceParts(this.parts, start, Math.max(start, end)),
        );
    }

    /** The text backwards, by grapheme, so emoji and accents stay whole. */
    reverse(requestor: Expression) {
        const graphemes = this.graphemes();
        return new TextValue(
            requestor,
            [...graphemes].reverse().join(''),
            this.language,
            this.partsOf(graphemes.map((_, index) => index).reverse()),
        );
    }

    segment(requestor: Expression, delimiter: TextValue | string) {
        const separator =
            typeof delimiter === 'string' ? delimiter : delimiter.text;
        const parts = this.parts;
        let offset = 0;
        return new ListValue(
            requestor,
            new UnicodeString(this.text)
                .split(separator)
                // Each fragment inherits the source text's locale, and the
                // parts of it that fall in the fragment.
                .map((s) => {
                    const start = offset;
                    offset += s.length + separator.length;
                    return new TextValue(
                        requestor,
                        s,
                        this.language,
                        parts === undefined
                            ? undefined
                            : sliceParts(parts, start, start + s.length),
                    );
                }),
        );
    }

    combine(requestor: Expression, text: TextValue) {
        // Union the operands' locales: an untagged side inherits the other,
        // and differing tags merge into a multilingual/multi-region tag.
        return new TextValue(
            requestor,
            this.text + text.text,
            Language.union(this.language, text.language),
            // Keep which words are in which language, so each is read in its
            // own voice rather than all in the union's first (#111).
            this.mixesWith(text)
                ? [...this.getParts(), ...text.getParts()]
                : undefined,
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

/** The parts, when they still line up with this exact text and say more than its tag. */
function keepParts(
    text: string,
    parts: readonly TextPart[],
    language: Language | undefined,
): TextPart[] | undefined {
    const kept = normalizeParts(
        parts.map((part) => ({
            text: part.text.normalize(),
            language: part.language,
        })),
        language,
    );
    // Normalizing across a part boundary can recompose characters, in which
    // case the parts no longer line up with the text and are better dropped.
    return kept !== undefined && kept.map((part) => part.text).join('') === text
        ? kept
        : undefined;
}

/**
 * A stretch of text in one language (#111). A text value built from texts in
 * several languages — `'hi'/en + 'hola'/es`, or an interpolation of one inside
 * another — keeps its parts so that each can be shown and read aloud in its own
 * language. The value's `language` stays the union, so types and conflicts are
 * unchanged; the parts only say which words are in which language.
 */
export type TextPart = {
    readonly text: string;
    /** Undefined when the part is untagged, and so in the surrounding language. */
    readonly language: Language | undefined;
};

/** Whether two tags mean the same language, however each is spelled. */
export function sameLanguage(
    a: Language | undefined,
    b: Language | undefined,
): boolean {
    if (a === b) return true;
    if (a === undefined || b === undefined) return false;
    return a.getBCP47() === b.getBCP47();
}

/**
 * The parts worth keeping, given the value's own tag: empty parts dropped and
 * neighbors in the same language joined. Undefined when the value's tag already
 * says everything — one language, and the tag's — which is what keeps every
 * ordinary text value free of this allocation. A single part in another
 * language is kept: a Spanish word segmented out of `/en_es` text is still
 * tagged with the union, whose primary language is English.
 */
function normalizeParts(
    parts: readonly TextPart[],
    language: Language | undefined,
): TextPart[] | undefined {
    const merged: TextPart[] = [];
    for (const part of parts) {
        if (part.text.length === 0) continue;
        const last = merged.at(-1);
        if (last !== undefined && sameLanguage(last.language, part.language))
            merged[merged.length - 1] = {
                text: last.text + part.text,
                language: last.language ?? part.language,
            };
        else merged.push(part);
    }
    const tagged = new Set<string>();
    for (const part of merged) {
        const tag = part.language?.getBCP47();
        if (tag !== undefined) tagged.add(tag);
    }
    const [only] = tagged;
    return tagged.size > 1 ||
        (only !== undefined && only !== language?.getBCP47())
        ? merged
        : undefined;
}

/** The parts covering code units [start, end) of their joined text. */
function sliceParts(
    parts: readonly TextPart[],
    start: number,
    end: number,
): TextPart[] {
    const sliced: TextPart[] = [];
    let offset = 0;
    for (const part of parts) {
        const partEnd = offset + part.text.length;
        const from = Math.max(start, offset);
        const to = Math.min(end, partEnd);
        if (from < to)
            sliced.push({
                text: part.text.slice(from - offset, to - offset),
                language: part.language,
            });
        offset = partEnd;
    }
    return sliced;
}

/** The language of the part containing code unit `index`, so a grapheme that
 *  straddles two parts takes the language of the one it starts in. */
function languageAt(
    parts: readonly TextPart[],
    index: number,
): Language | undefined {
    let offset = 0;
    for (const part of parts) {
        offset += part.text.length;
        if (index < offset) return part.language;
    }
    return parts.at(-1)?.language;
}

/**
 * Parts for a sequence of graphemes taken from text with the given parts, in
 * any order: each grapheme keeps the language of the code unit it started at.
 * `starts` are those code unit offsets, one per grapheme.
 */
function partsOfGraphemes(
    parts: readonly TextPart[],
    graphemes: readonly string[],
    starts: readonly number[],
): TextPart[] {
    return graphemes.map((text, index) => ({
        text,
        language: languageAt(parts, starts[index] ?? 0),
    }));
}

/** Code unit offsets at which each grapheme starts. */
function graphemeStarts(graphemes: readonly string[]): number[] {
    const starts: number[] = [];
    let offset = 0;
    for (const grapheme of graphemes) {
        starts.push(offset);
        offset += grapheme.length;
    }
    return starts;
}
