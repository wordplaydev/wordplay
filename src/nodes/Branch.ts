import Purpose from '../concepts/Purpose';
import type Locale from '../locale/Locale';
import type { TemplateInput } from '../locale/concretize';
import type Glyph from '../lore/Glyph';
import Glyphs from '../lore/Glyphs';
import Content from './Content';
import Mention from './Mention';
import type { Field, Replacement } from './Node';
import Token from './Token';
import TokenType from './TokenType';
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
    readonly bar: Token;
    readonly no: Words;
    readonly close: Token;

    constructor(
        mention: Mention,
        open: Token,
        yes: Words,
        bar: Token,
        no: Words,
        close: Token
    ) {
        super();

        this.mention = mention;
        this.open = open;
        this.yes = yes;
        this.bar = bar;
        this.no = no;
        this.close = close;
    }

    getGrammar(): Field[] {
        return [
            { name: 'mention', types: [Mention] },
            { name: 'open', types: [TokenType.ListOpen] },
            { name: 'yes', types: [[Words]] },
            { name: 'bar', types: [TokenType.Union] },
            { name: 'no', types: [[Words]] },
            { name: 'close', types: [TokenType.ListClose] },
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

    concretize(locale: Locale, inputs: TemplateInput[]): Words | undefined {
        const value = this.mention.concretize(locale, inputs);
        return value === undefined ||
            (value instanceof Token && value.getText() === 'false')
            ? this.no.concretize(locale, inputs)
            : this.yes.concretize(locale, inputs);
    }

    getDescriptionInputs() {
        return [this.id];
    }

    toText() {
        return this.toWordplay();
    }
}
