import Purpose from '../concepts/Purpose';
import type { TemplateInput } from '../locale/concretize';
import type Glyph from '../lore/Glyph';
import Glyphs from '../lore/Glyphs';
import Content from './Content';
import Mention from './Mention';
import { node, type Replacement, type Grammar, list, optional } from './Node';
import Token from './Token';
import Sym from './Sym';
import Words from './Words';
import type Node from './Node';
import type Locales from '../locale/Locales';

/**
 * To conditionally select a string, use ??, followed by an input that is either a boolean or possibly undefined value,
 * and true and false cases
 *
 *      "I received $1 ?? [$1 | nothing]"
 *      "I received $1 ?? [$2 ?? [$1 | $2] | nothing]"
 *
 */
export default class Branch extends Content {
    readonly mention: Mention;
    readonly open: Token;
    readonly yes: Words;
    readonly bar: Token | undefined;
    readonly no: Words;
    readonly close: Token | undefined;

    constructor(
        mention: Mention,
        open: Token,
        yes: Words,
        bar: Token | undefined,
        no: Words,
        close: Token | undefined
    ) {
        super();

        this.mention = mention;
        this.open = open;
        this.yes = yes;
        this.bar = bar;
        this.no = no;
        this.close = close;
    }

    getDescriptor() {
        return 'Branch';
    }

    getGrammar(): Grammar {
        return [
            { name: 'mention', kind: node(Mention) },
            { name: 'open', kind: node(Sym.ListOpen) },
            { name: 'yes', kind: list(true, node(Words)) },
            { name: 'bar', kind: optional(node(Sym.Union)) },
            { name: 'no', kind: list(true, node(Words)) },
            { name: 'close', kind: node(Sym.ListClose) },
        ];
    }
    computeConflicts() {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new Branch(
            this.replaceChild('mention', this.mention, replace),
            this.replaceChild('open', this.open, replace),
            this.replaceChild('yes', this.yes, replace),
            this.replaceChild('bar', this.bar, replace),
            this.replaceChild('no', this.no, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }
    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Branch);
    }

    getGlyphs(): Glyph {
        return Glyphs.Branch;
    }

    concretize(
        locales: Locales,
        inputs: TemplateInput[],
        replacements: [Node, Node][]
    ): Words | undefined {
        const value = this.mention.concretize(locales, inputs, replacements);
        const replacement =
            value === undefined ||
            (value instanceof Token && value.getText() === 'false')
                ? this.no.concretize(locales, inputs, replacements)
                : this.yes.concretize(locales, inputs, replacements);

        if (replacement) replacements.push([this, replacement]);
        return replacement;
    }

    getDescriptionInputs() {
        return [this.id];
    }

    toText() {
        return this.toWordplay();
    }
}
