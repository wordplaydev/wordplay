import { Purpose } from '#concepts/Purpose.ts';
import type { ReplaceContext } from '#edit/revision/EditContext.ts';
import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '#parser/Symbols.ts';
import BoolValue from '#values/BoolValue.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import type Locales from '#locale/Locales.ts';
import Characters from '../lore/BasisCharacters';
import BooleanType from '#nodes/BooleanType.ts';
import Conditional from '#nodes/Conditional.ts';
import type Context from '#nodes/Context.ts';
import Literal from '#nodes/Literal.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import type Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';

export default class BooleanLiteral extends Literal {
    readonly value: Token;

    constructor(value: Token) {
        super();

        this.value = value;

        this.computeChildren();
    }

    static make(value: boolean) {
        return new BooleanLiteral(
            new Token(value === true ? TRUE_SYMBOL : FALSE_SYMBOL, Sym.Boolean),
        );
    }

    static getPossibleReplacements({ node }: ReplaceContext) {
        // If the node is true, offer false, and vice versa.
        return node instanceof BooleanLiteral
            ? [
                  node.bool()
                      ? BooleanLiteral.make(false)
                      : BooleanLiteral.make(true),
                  Conditional.make(
                      node,
                      BooleanLiteral.make(true),
                      BooleanLiteral.make(false),
                  ),
              ]
            : [];
    }

    static getPossibleInsertions() {
        return [BooleanLiteral.make(true), BooleanLiteral.make(false)];
    }

    getDescriptor(): NodeDescriptor {
        return 'BooleanLiteral';
    }

    getPurpose() {
        return Purpose.Truth;
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'value',
                kind: node(Sym.Boolean),
                getType: () => BooleanType.make(),
                label: undefined,
            },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new BooleanLiteral(this.replaceChild('value', this.value, replace)),
        );
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'boolean';
    }

    computeConflicts() {
        return [];
    }

    computeType(): Type {
        return BooleanType.make();
    }

    getValue() {
        return new BoolValue(this, this.bool());
    }

    bool(): boolean {
        // Canonical text, so a typed keyword word for true (e.g. `true`) is true, not just `⊤` (#1296).
        return this.value.getCanonicalText() === TRUE_SYMBOL;
    }

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    getStart() {
        return this.value;
    }
    getFinish() {
        return this.value;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.BooleanLiteral;
    getLocalePath() {
        return BooleanLiteral.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize((l) => l.node.BooleanLiteral.start, {
            value: new NodeRef(
                this.value,
                locales,
                context,
                this.value.getText(),
            ),
        });
    }

    getDescriptionInputs() {
        return {
            value: this.bool(),
        };
    }

    getCharacter() {
        return Characters.BooleanLiteral;
    }

    adjust(): this | undefined {
        return this.cloned(BooleanLiteral.make(!this.bool()));
    }
}
