import type Conflict from '@conflicts/Conflict';
import Expression, { type GuardContext } from './Expression';
import ListType from './ListType';
import NumberType from './NumberType';
import type Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import ListValue from '@values/ListValue';
import NumberValue from '@values/NumberValue';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import type TypeSet from './TypeSet';
import Unit from './Unit';
import Bind from './Bind';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import ListOpenToken from './ListOpenToken';
import ListCloseToken from './ListCloseToken';
import { node, type Grammar, type Replacement } from './Node';
import { NotAType } from './NotAType';
import NodeRef from '@locale/NodeRef';
import Glyphs from '../lore/Glyphs';
import type { BasisTypeName } from '../basis/BasisConstants';
import Purpose from '../concepts/Purpose';
import NoneValue from '@values/NoneValue';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import concretize from '../locale/concretize';
import Sym from './Sym';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import type Locales from '../locale/Locales';
import AnyType from './AnyType';
import getGuards from './getGuards';
import Reference from './Reference';
import PropertyReference from './PropertyReference';
import UnionType from './UnionType';

export default class ListAccess extends Expression {
    readonly list: Expression;
    readonly open: Token;
    readonly index: Expression;
    readonly close?: Token;

    constructor(
        list: Expression,
        open: Token,
        index: Expression,
        close?: Token,
    ) {
        super();

        this.list = list;
        this.open = open;
        this.index = index;
        this.close = close;

        this.computeChildren();
    }

    static make(list: Expression, index: Expression) {
        return new ListAccess(
            list,
            new ListOpenToken(),
            index,
            new ListCloseToken(),
        );
    }

    static getPossibleNodes() {
        return [
            ListAccess.make(
                ExpressionPlaceholder.make(ListType.make()),
                ExpressionPlaceholder.make(NumberType.make()),
            ),
        ];
    }

    getDescriptor() {
        return 'ListAccess';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'list',
                kind: node(Expression),
                label: (locales: Locales) => locales.get((l) => l.term.list),
                // Must be a list
                getType: () => ListType.make(),
            },
            { name: 'open', kind: node(Sym.ListOpen) },
            {
                name: 'index',
                kind: node(Expression),
                label: (locales: Locales) => locales.get((l) => l.term.index),
                // Must be a number
                getType: () => NumberType.make(),
            },
            { name: 'close', kind: node(Sym.ListClose) },
        ];
    }

    clone(replace?: Replacement) {
        return new ListAccess(
            this.replaceChild('list', this.list, replace),
            this.replaceChild('open', this.open, replace),
            this.replaceChild('index', this.index, replace),
            this.replaceChild('close', this.close, replace),
        ) as this;
    }

    getPurpose(): Purpose {
        return Purpose.Evaluate;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'list';
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts = [];

        if (this.close === undefined)
            conflicts.push(
                new UnclosedDelimiter(this, this.open, new ListCloseToken()),
            );

        const listType = this.list.getType(context);
        if (!(listType instanceof ListType))
            conflicts.push(
                new IncompatibleInput(this.list, listType, ListType.make()),
            );

        const indexType = this.index.getType(context);

        if (
            !(indexType instanceof NumberType) ||
            (indexType.unit instanceof Unit && !indexType.unit.isUnitless())
        )
            conflicts.push(
                new IncompatibleInput(this.index, indexType, NumberType.make()),
            );

        return conflicts;
    }

    computeType(context: Context): Type {
        // Non-number index? Give a more precise unknown type.
        const indexType = this.index.getType(context);
        if (!(indexType instanceof NumberType))
            return new NotAType(this, indexType, NumberType.make());

        // The type is the list's value type, or unknown otherwise.
        const listType = this.list.getType(context);
        if (listType instanceof ListType) {
            // No type specified? It could be anything.
            if (listType.type === undefined) return new AnyType();

            // Get the type specified.
            const itemType = listType.type;

            // See if there are any type guards on list accesses with equivalent expressions.
            // Find any type guards that are also list accesses that have an equivalent index expression.
            const guards = getGuards(this, context, (node) => {
                if (
                    // Node is a list access
                    node instanceof ListAccess &&
                    // And it's index expression is equal this access's index expression
                    node.index.isEqualTo(this.index)
                ) {
                    // If the parent of the list access is an expression and it guards types, then return it.
                    const parent = context.source.root.getParent(node);
                    return parent instanceof Expression && parent.guardsTypes();
                } else return false;
            });

            // Grab the furthest ancestor and evaluate possible types from there.
            const root = guards[0];
            if (root !== undefined) {
                const reference = this.getReference();
                // Get the list this refers to.
                const bind = reference ? reference.resolve(context) : undefined;
                if (bind instanceof Bind && reference) {
                    // Get the possible types of the item type.
                    const possibleTypes = itemType.getTypeSet(context);
                    root.evaluateTypeGuards(possibleTypes, {
                        bind,
                        key: this.index.toWordplay(),
                        original: possibleTypes,
                        context,
                    });
                    // Get the narrowed type of this index. Use the expression as the key.
                    return (
                        context.getReferenceType(
                            reference,
                            this.index.toWordplay(),
                        ) ?? itemType
                    );
                }
            }
            return itemType;
        }
        // Not a list? Give a more precise unknown type.
        else return new NotAType(this, listType, ListType.make());
    }

    getReference(): Reference | PropertyReference | undefined {
        return this.list instanceof Reference ||
            this.list instanceof PropertyReference
            ? this.list
            : undefined;
    }

    getDependencies(): Expression[] {
        return [this.list, this.index];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        return [
            new Start(this),
            ...this.list.compile(evaluator, context),
            ...this.index.compile(evaluator, context),
            new Finish(this),
        ];
    }

    getStart() {
        return this.open;
    }
    getFinish() {
        return this.close ?? this.index;
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const index = evaluator.popValue(this, NumberType.make());
        if (!(index instanceof NumberValue) || !index.num.isInteger())
            return new NoneValue(this);

        const list = evaluator.popValue(this, ListType.make());
        if (!(list instanceof ListValue)) return list;

        return list.get(index);
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        // We're evaluating the bind this list refers to, cache the possible values of this index at this point.
        if (
            (this.list instanceof Reference ||
                this.list instanceof PropertyReference) &&
            this.isGuardMatch(guard)
        )
            guard.context.setReferenceType(
                this.list,
                this.index.toWordplay(),
                UnionType.getPossibleUnion(guard.context, current.list()),
            );

        // Pass the guards down through the list and index.
        if (this.list instanceof Expression)
            this.list.evaluateTypeGuards(current, guard);
        if (this.index instanceof Expression)
            this.index.evaluateTypeGuards(current, guard);
        return current;
    }

    isGuardMatch(guard: GuardContext): boolean {
        return (
            this.getReference()?.resolve(guard.context) === guard.bind &&
            this.index.toWordplay() === guard.key
        );
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.ListAccess);
    }

    getStartExplanations(locales: Locales, context: Context) {
        return concretize(
            locales,
            locales.get((l) => l.node.ListAccess.start),
            new NodeRef(this.list, locales, context),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return concretize(
            locales,
            locales.get((l) => l.node.ListAccess.finish),
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getGlyphs() {
        return Glyphs.ListAccess;
    }
}
