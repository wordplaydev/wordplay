import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { Purpose } from '@concepts/Purpose';
import type Locales from '@locale/Locales';
import type { TemplateInput } from '@locale/Locales';
import { selectPluralIndex } from '@locale/plurals';
import Characters from '../lore/BasisCharacters';
import Content from '@nodes/Content';
import Mention from '@nodes/Mention';
import type Node from '@nodes/Node';
import { type Grammar, list, node, type Replacement } from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import Words from '@nodes/Words';

/**
 * A choice between segments of markup, written as a mention followed
 * immediately by bracketed arms.
 *
 * With a plain mention, the two arms select on whether the input is defined and
 * not false:
 *
 *      "I received $value[$value|nothing]"
 *      "I received $other[$another[$value|$other]|nothing]"
 *
 * With a *count* mention (`$#name`), the arms are plural forms, one per form
 * the reading locale distinguishes, in the canonical order of `PluralCategories`
 * — two for English, one for Japanese, four for Polish, six for Arabic:
 *
 *      "list of $#count[$count value|$count values]"
 */
export default class Branch extends Content {
    readonly mention: Mention;
    readonly open: Token;
    /**
     * The arms and the `|` tokens between them, in source order — one list
     * rather than two, because the grammar emits each field in turn, so
     * parallel `arms` and `bars` lists would render as `[abc|||]`.
     */
    readonly segments: (Words | Token)[];
    readonly close: Token | undefined;

    constructor(
        mention: Mention,
        open: Token,
        segments: (Words | Token)[],
        close: Token | undefined,
    ) {
        super();

        this.mention = mention;
        this.open = open;
        this.segments = segments;
        this.close = close;
    }

    /** The choices, without the `|` separators. */
    get arms(): Words[] {
        return this.segments.filter((s): s is Words => s instanceof Words);
    }

    /** The `|` separators, without the arms. */
    get bars(): Token[] {
        return this.segments.filter((s): s is Token => s instanceof Token);
    }

    getDescriptor(): NodeDescriptor {
        return 'Branch';
    }

    getGrammar(): Grammar {
        return [
            { name: 'mention', kind: node(Mention), label: undefined },
            { name: 'open', kind: node(Sym.ListOpen), label: undefined },
            {
                name: 'segments',
                kind: list(true, node(Words), node(Sym.Union)),
                label: () => (l) => l.glossary.markup.word,
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
            this.replaceChild('segments', this.segments, replace),
            this.replaceChild('close', this.close, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Documentation;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Branch;
    getLocalePath() {
        return Branch.LocalePath;
    }

    getCharacter() {
        return Characters.Branch;
    }

    /** Whether this branch selects a plural form rather than testing presence. */
    isPlural() {
        return this.mention.isCount();
    }

    /**
     * The arm this branch's input selects. A plural branch asks the locale's
     * plural rules which form the count takes; anything else keeps the presence
     * rule — undefined, or the literal text `false`, takes the second arm.
     *
     * Either way the index is clamped to the arms actually written: a locale
     * string with too few arms should degrade to its last form (which is always
     * `other`) rather than render nothing.
     */
    private getArmIndex(
        locales: Locales,
        inputs: Record<string, TemplateInput>,
        replacements: [Node, Node][],
    ): number {
        if (this.isPlural()) {
            const value = inputs[this.mention.getName()];
            return selectPluralIndex(
                locales.getLanguages()[0] ?? '',
                typeof value === 'number' ? value : Number(value ?? 0),
            );
        }
        // Presence: resolve the mention the way it would render, so a `$?`
        // placeholder and a `false` value keep behaving exactly as before.
        const value = this.mention.concretize(locales, inputs, replacements);
        return value === undefined ||
            (value instanceof Token && value.getText() === 'false')
            ? 1
            : 0;
    }

    concretize(
        locales: Locales,
        inputs: Record<string, TemplateInput>,
        replacements: [Node, Node][],
    ): Words | undefined {
        if (this.arms.length === 0) return undefined;
        const index = this.getArmIndex(locales, inputs, replacements);
        // Clamp: a locale string with fewer arms than its plural rules call for
        // degrades to its last form rather than rendering nothing.
        const arm = this.arms[Math.min(index, this.arms.length - 1)];
        const replacement = arm.concretize(locales, inputs, replacements);

        if (replacement) replacements.push([this, replacement]);
        return replacement;
    }

    getDescriptionInputs(): Record<string, TemplateInput> {
        return { condition: this.mention.getName() };
    }

    toText() {
        return this.toWordplay();
    }
}
