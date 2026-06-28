import type { ReplaceContext } from '@edit/revision/EditContext';
import getConceptName from '@locale/getConceptName';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type { BasisTypeName } from '@basis/BasisConstants';
import { Purpose } from '@concepts/Purpose';
import type Conflict from '@conflicts/Conflict';
import IncompatibleType from '@conflicts/IncompatibleType';
import Characters from '../lore/BasisCharacters';
import { BIND_SYMBOL } from '@parser/Symbols';
import AnyType from '@nodes/AnyType';
import type Context from '@nodes/Context';
import Expression from '@nodes/Expression';
import ListType from '@nodes/ListType';
import type { Grammar, Replacement } from '@nodes/Node';
import Node, { node, optional } from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

/** Inside a list literal, flattens values of a list value into a new list */
export default class Spread extends Node {
    readonly dots: Token;
    readonly list: Expression | undefined;

    constructor(dots: Token, list: Expression | undefined) {
        super();

        this.dots = dots;
        this.list = list;

        this.computeChildren();
    }

    static make(list: Expression) {
        return new Spread(new Token(BIND_SYMBOL, Sym.Bind), list);
    }

    static getPossibleReplacements({ node, context }: ReplaceContext) {
        return node instanceof Expression &&
            node.getType(context).accepts(ListType.make(), context)
            ? [Spread.make(node)]
            : [];
    }

    static getPossibleInsertions() {
        return [];
    }

    getDescriptor(): NodeDescriptor {
        return 'Spread';
    }

    getGrammar(): Grammar {
        return [
            { name: 'dots', kind: node(Sym.Bind), label: undefined },
            {
                name: 'list',
                kind: optional(node(Expression)),
                getType: () => ListType.make(new AnyType()),
                label: () => (l) => getConceptName(l, 'list'),
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Spread(
            this.replaceChild('dots', this.dots, replace),
            this.replaceChild('list', this.list, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Lists;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'list';
    }

    computeConflicts(context: Context): Conflict[] {
        if (this.list) {
            const type = this.list.getType(context);
            if (
                !context.isUnknownDownstream(this.list) &&
                !(type instanceof ListType)
            )
                return [
                    new IncompatibleType(
                        this.list,
                        ListType.make(),
                        this.list,
                        type,
                    ),
                ];
        }

        return [];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Spread;
    getLocalePath() {
        return Spread.LocalePath;
    }

    getCharacter() {
        return Characters.Stream;
    }
}
