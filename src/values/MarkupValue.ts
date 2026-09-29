import type LocaleText from '@locale/LocaleText';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import type { BasisTypeName } from '@basis/BasisConstants';
import type Expression from '@nodes/Expression';
import FormattedType from '@nodes/FormattedType';
import Language from '@nodes/Language';
import Markup from '@nodes/Markup';
import type { Segment } from '@nodes/Paragraph';
import type Type from '@nodes/Type';
import BoolValue from '@values/BoolValue';
import NumberValue from '@values/NumberValue';
import SimpleValue from '@values/SimpleValue';
import { sameLanguage, type default as TextValue } from '@values/TextValue';
import type Value from '@values/Value';
import { lowerCase, upperCase } from '@unicode/casing';
import UnicodeString from '@unicode/UnicodeString';

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
            // Graphemes, not code points, matching Text: a family emoji is one
            // symbol but five code points.
            new UnicodeString(this.markup.getPlainText()).getLength(),
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
        const own = this.markup.metadata?.segmentLanguages;
        const originals = this.markup.getSegments();
        const languages = new Map<Segment, Language>();
        let result = new Markup([]);
        for (let i = 0; i < count; i++) {
            const clone = this.markup.clone();
            // A clone's segments are new nodes in the same order, so each takes
            // its original's language.
            if (own !== undefined)
                clone.getSegments().forEach((segment, index) => {
                    const original = originals[index];
                    const language =
                        original === undefined ? undefined : own.get(original);
                    if (language !== undefined)
                        languages.set(segment, language);
                });
            result = result.concat(clone);
        }
        return new MarkupValue(
            requestor,
            own === undefined ? result : result.withSegmentLanguages(languages),
            this.language,
        );
    }

    /** Casing follows this markup's own locale tag, mirroring text; only the
     *  prose is converted, so formatting, links, and examples survive. */
    uppercase(requestor: Expression) {
        return this.withMappedWords(requestor, (text) =>
            upperCase(text, this.language?.getBCP47()),
        );
    }

    lowercase(requestor: Expression) {
        return this.withMappedWords(requestor, (text) =>
            lowerCase(text, this.language?.getBCP47()),
        );
    }

    private withMappedWords(
        requestor: Expression,
        map: (text: string) => string,
    ) {
        return new MarkupValue(
            requestor,
            this.markup.withMappedWords(map),
            this.language,
        );
    }

    combine(requestor: Expression, markup: MarkupValue) {
        // Concatenate (paragraph-preserving) and union the locales (mirrors
        // TextValue). The operands are distinct nodes, so no cloning is needed.
        const joined = this.markup.concat(markup.markup);
        const language = Language.union(this.language, markup.language);
        // Keep which segments are in which language, so each is shown and read
        // in its own rather than all in the union's first (#111). Only joining
        // and repeating keep them; other operations rebuild the words.
        const mixes =
            this.markup.metadata?.segmentLanguages !== undefined ||
            markup.markup.metadata?.segmentLanguages !== undefined ||
            (this.language !== undefined &&
                markup.language !== undefined &&
                !sameLanguage(this.language, markup.language));
        if (!mixes) return new MarkupValue(requestor, joined, language);
        const languages = new Map([
            ...this.getSegmentLanguages(),
            ...markup.getSegmentLanguages(),
        ]);
        const tags = new Set(
            [...languages.values()].map((tag) => tag.getBCP47()),
        );
        const [only] = tags;
        return new MarkupValue(
            requestor,
            tags.size > 1 ||
                (only !== undefined && only !== language?.getBCP47())
                ? joined.withSegmentLanguages(languages)
                : joined,
            language,
        );
    }

    /** Each tagged top-level segment's language, from this markup's own record
     *  or else its tag. */
    private getSegmentLanguages(): [Segment, Language][] {
        const own = this.markup.metadata?.segmentLanguages;
        return this.markup
            .getSegments()
            .flatMap((segment): [Segment, Language][] => {
                const language = own?.get(segment) ?? this.language;
                return language === undefined ? [] : [[segment, language]];
            });
    }

    /**
     * Markup is equal to markup that says the same thing with the same
     * structure. The language tag records what language it's written in, not
     * which markup it is, so it doesn't take part — the same rule TextValue
     * follows, and for the same reason: comparing it made `` `x` = `x`/en ``
     * silently false, so untagged input could never match a localized value.
     */
    isEqualTo(value: Value): boolean {
        return (
            value instanceof MarkupValue && value.markup.isEqualTo(this.markup)
        );
    }

    getDescription() {
        return (l: LocaleText) => l.node.Markup.name;
    }

    getRepresentativeText() {
        // Markup that is only a link or an example has no words to represent it.
        return (
            this.markup
                .nodes()
                .filter(
                    (n): n is Token =>
                        n instanceof Token && n.isSymbol(Sym.Words),
                )[0]
                ?.getText() ?? ''
        );
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
