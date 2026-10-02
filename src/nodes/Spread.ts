import conciseRef from '#nodes/conciseRef.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import type Locales from '#locale/Locales.ts';
import type {
    InsertContext,
    ReplaceContext,
} from '#edit/revision/EditContext.ts';
import getConceptName from '#locale/getConceptName.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import { Purpose } from '#concepts/Purpose.ts';
import type Conflict from '#conflicts/Conflict.ts';
import IncompatibleType from '#conflicts/IncompatibleType.ts';
import Characters from '../lore/BasisCharacters';
import { BIND_SYMBOL } from '#parser/Symbols.ts';
import AnyType from '#nodes/AnyType.ts';
import type Context from '#nodes/Context.ts';
import Expression from '#nodes/Expression.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import ListType from '#nodes/ListType.ts';
import RangeType from '#nodes/RangeType.ts';
import UnionType from '#nodes/UnionType.ts';
import type { Grammar, Replacement } from '#nodes/Node.ts';
import Node, { node, optional } from '#nodes/Node.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';

/** Inside a list literal, flattens values of a list value — or the numbers of a range — into a new list */
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
        if (!(node instanceof Expression)) return [];
        const type = node.getType(context);
        return type.accepts(ListType.make(), context) ||
            type instanceof RangeType
            ? [Spread.make(node)]
            : [];
    }

    /** Offer a spread wherever list values live, so `:` can reach an empty list literal. */
    static getPossibleInsertions({ parent, field }: InsertContext) {
        const kind = parent.getGrammar().find((f) => f.name === field)?.kind;
        return kind !== undefined && kind.allowsKind(Spread)
            ? [Spread.make(ExpressionPlaceholder.make(ListType.make()))]
            : [];
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
                getType: () =>
                    UnionType.make(
                        ListType.make(new AnyType()),
                        RangeType.make(),
                    ),
                label: () => (l) => getConceptName(l, 'list'),
            },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new Spread(
                this.replaceChild('dots', this.dots, replace),
                this.replaceChild('list', this.list, replace),
            ),
        );
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
            // A range spreads to the numbers it holds, so it's as spreadable as a list.
            if (
                !context.isUnknownDownstream(this.list) &&
                !(type instanceof ListType) &&
                !(type instanceof RangeType)
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

    getDescriptionInputs(
        locales: Locales,
        context: Context,
    ): Record<string, TemplateInput> {
        return {
            list: this.list
                ? conciseRef(this.list, locales, context)
                : undefined,
        };
    }

    getCharacter() {
        return Characters.Stream;
    }
}
