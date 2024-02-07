import Paragraph from './Paragraph';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Content from './Content';
import type { TemplateInput } from '../locale/concretize';
import { list, node, type Grammar, type Replacement } from './Node';
import type Spaces from '../parser/Spaces';
import { toMarkup } from '../parser/toMarkup';
import Token from './Token';
import Sym from './Sym';
import type Node from './Node';
import Words from './Words';
import type { FormattedText } from '../output/Phrase';
import type { FontWeight } from '../basis/Fonts';
import type Locales from '../locale/Locales';

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

    getDescriptor() {
        return 'Markup';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'paragraphs',
                kind: list(true, node(Paragraph)),
                newline: true,
                double: true,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Markup(
            this.replaceChild('paragraphs', this.paragraphs, replace),
            this.spaces,
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    computeConflicts() {
        return;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Markup);
    }

    getGlyphs() {
        return Glyphs.Markup;
    }

    getDescriptionInputs() {
        return [this.paragraphs.length];
    }

    concretize(locales: Locales, inputs: TemplateInput[]): Markup | undefined {
        // Create an empty list of replacements which we'll recursively fill and then update space with.
        const replacements: [Node, Node][] = [];
        const concrete = this.paragraphs.map((p) =>
            p.concretize(locales, inputs, replacements),
        );

        let newSpaces = this.spaces;
        for (const [original, replacement] of replacements)
            newSpaces = newSpaces?.withReplacement(original, replacement);

        // Remap the first token of all replaced nodes with the first token of the replacement.
        return concrete.some((p) => p === undefined)
            ? undefined
            : new Markup(concrete as Paragraph[], newSpaces);
    }

    getMatchingText(
        text: string,
        locales: Locales,
    ): [string, number] | undefined {
        const wordsWithText = this.paragraphs
            .map((p) => p.nodes())
            .flat()
            .filter(
                (n): n is Token => n instanceof Token && n.isSymbol(Sym.Words),
            )
            .filter((w) => w.getText().indexOf(text) >= 0);

        return wordsWithText.length === 0
            ? undefined
            : [
                  wordsWithText[0].getText(),
                  wordsWithText[0]
                      .getText()
                      .toLocaleLowerCase(locales.getLanguages())
                      .indexOf(text),
              ];
    }

    asFirstParagraph() {
        return new Markup(this.paragraphs.slice(0, 1), this.spaces);
    }

    toText() {
        return this.paragraphs.map((p) => p.toText()).join('\n\n');
    }

    /** Returns a sequence of text with formats applied, and null representing paragraph breaks. */
    getFormats() {
        // Enumerate all of the word tokens and identify the Words formats that contain them, generating a list of formatted text.
        const formats: FormattedText[] = [];
        const words: Words[] = [];
        for (const node of this.traverseTopDownWithEnterAndExit()) {
            if (node instanceof Words) {
                if (words[0] === node) words.shift();
                else words.unshift(node);
            } else if (node instanceof Token && node.isSymbol(Sym.Words)) {
                formats.push({
                    text: node.getText(),
                    italic: words.some((word) => word.getFormat() === 'italic'),
                    weight:
                        words
                            .map((word) => word.getWeight())
                            .filter(
                                (word): word is FontWeight =>
                                    word !== undefined,
                            )
                            .at(-1) ?? 400,
                });
            }
        }
        return formats;
    }

    asLine() {
        return new Markup(
            [new Paragraph(this.paragraphs.map((p) => p.segments).flat())],
            this.spaces,
        );
    }

    getRepresentativeText() {
        return this.nodes()
            .filter(
                (n): n is Token => n instanceof Token && n.isSymbol(Sym.Words),
            )[0]
            ?.getText();
    }

    toString() {
        return '';
    }
}
