import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import type { TemplateInput } from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import Content from './Content';
import Mention from './Mention';
import type Node from './Node';
import { type Grammar, list, node, optional, type Replacement } from './Node';
import Sym from './Sym';
import Token from './Token';
import Words from './Words';

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
        close: Token | undefined,
    ) {
        super();

        this.mention = mention;
        this.open = open;
        this.yes = yes;
        this.bar = bar;
        this.no = no;
        this.close = close;
    }

    getDescriptor(): NodeDescriptor {
        return 'Branch';
    }

    getGrammar(): Grammar {
        return [
            { name: 'mention', kind: node(Mention), label: undefined },
            { name: 'open', kind: node(Sym.ListOpen), label: undefined },
            {
                name: 'yes',
                kind: list(true, node(Words)),
                label: () => (l) => l.term.markup,
            },
            { name: 'bar', kind: optional(node(Sym.Union)), label: undefined },
            {
                name: 'no',
                kind: list(true, node(Words)),
                label: () => (l) => l.term.markup,
            },
            { name: 'close', kind: node(Sym.ListClose), label: undefined },
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
            this.replaceChild('close', this.close, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Branch;
    getLocalePath() {
        return Branch.LocalePath;
    }

    getCharacter() {
        return Characters.Branch;
    }

    concretize(
        locales: Locales,
        inputs: TemplateInput[],
        replacements: [Node, Node][],
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
