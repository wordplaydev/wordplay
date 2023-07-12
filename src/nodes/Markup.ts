import type Locale from '@locale/Locale';
import Paragraph from './Paragraph';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Content from './Content';
import type { TemplateInput } from '../locale/concretize';
import type { Replacement } from './Node';
import Words from './Words';
import Token from './Token';
import TokenType from './TokenType';
import type Spaces from '../parser/Spaces';

/**
 * To refer to an input, use a $, followed by the number of the input desired,
 * starting from 1.
 *
 *      "Hello, my name is $1"
 */
export default class Markup extends Content {
    readonly paragraphs: Paragraph[];
    readonly spaces: Spaces | undefined;

    constructor(content: Paragraph[], spaces: Spaces | undefined = undefined) {
        super();

        this.paragraphs = content;
        this.spaces = spaces;

        this.computeChildren();
    }

    static words(text: string) {
        return new Markup([
            new Paragraph([
                new Words(
                    undefined,
                    [new Token(text, TokenType.Words)],
                    undefined
                ),
            ]),
        ]);
    }

    getGrammar() {
        return [{ name: 'paragraphs', types: [[Paragraph]] }];
    }

    clone(replace?: Replacement) {
        return new Markup(
            this.replaceChild('paragraphs', this.paragraphs, replace),
            this.spaces
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    computeConflicts() {}

    getNodeLocale(translation: Locale) {
        return translation.node.Markup;
    }

    getGlyphs() {
        return Glyphs.Markup;
    }

    getDescriptionInputs() {
        return [this.paragraphs.length];
    }

    concretize(locale: Locale, inputs: TemplateInput[]): Markup | undefined {
        const concrete = this.paragraphs.map((p) =>
            p.concretize(locale, inputs)
        );
        return concrete.some((p) => p === undefined)
            ? undefined
            : new Markup(concrete as Paragraph[], this.spaces);
    }

    toText() {
        return this.paragraphs.map((p) => p.toText()).join('\n\n');
    }
}
