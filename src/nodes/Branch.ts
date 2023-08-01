import Purpose from '../concepts/Purpose';
import type Locale from '../locale/Locale';
import type { TemplateInput } from '../locale/concretize';
import type Glyph from '../lore/Glyph';
import Glyphs from '../lore/Glyphs';
import Content from './Content';
import Mention from './Mention';
import { node, type Replacement, type Grammar, list, optional } from './Node';
import Token from './Token';
import Symbol from './Symbol';
import Words from './Words';
import type Node from './Node';

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

    getGrammar(): Grammar {
        return [
            { name: 'mention', kind: node(Mention) },
            { name: 'open', kind: node(Symbol.ListOpen) },
            { name: 'yes', kind: list(node(Words)) },
            { name: 'bar', kind: optional(node(Symbol.Union)) },
            { name: 'no', kind: list(node(Words)) },
            { name: 'close', kind: node(Symbol.ListClose) },
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
    getNodeLocale(locale: Locale) {
        return locale.node.Branch;
    }

    getGlyphs(): Glyph {
        return Glyphs.Branch;
    }

    concretize(
        locale: Locale,
        inputs: TemplateInput[],
        replacements: [Node, Node][]
    ): Words | undefined {
        const value = this.mention.concretize(locale, inputs, replacements);
        const replacement =
            value === undefined ||
            (value instanceof Token && value.getText() === 'false')
                ? this.no.concretize(locale, inputs, replacements)
                : this.yes.concretize(locale, inputs, replacements);

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
