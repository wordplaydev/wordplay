import type Locale from '@locale/Locale';
import Paragraph from './Paragraph';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Content from './Content';
import type { TemplateInput } from '../locale/concretize';
import { list, node, type Grammar, type Replacement } from './Node';
import type Spaces from '../parser/Spaces';
import { toMarkup } from '../parser/Parser';
import Token from './Token';
import Symbol from './Symbol';

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
        const [markup] = toMarkup(text);
        return markup;
    }

    static getPossibleNodes() {
        return [new Markup([new Paragraph([])])];
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'paragraphs',
                kind: list(node(Paragraph)),
                newline: true,
                double: true,
            },
        ];
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

    getMatchingText(
        text: string,
        locale: Locale[]
    ): [string, number] | undefined {
        const wordsWithText = this.paragraphs
            .map((p) => p.nodes())
            .flat()
            .filter(
                (n): n is Token =>
                    n instanceof Token && n.isSymbol(Symbol.Words)
            )
            .filter((w) => w.getText().indexOf(text) >= 0);

        return wordsWithText.length === 0
            ? undefined
            : [
                  wordsWithText[0].getText(),
                  wordsWithText[0]
                      .getText()
                      .toLocaleLowerCase(locale.map((l) => l.language))
                      .indexOf(text),
              ];
    }

    asFirstParagraph() {
        return new Markup(this.paragraphs.slice(0, 1), this.spaces);
    }

    toText() {
        return this.paragraphs.map((p) => p.toText()).join('\n\n');
    }
}
