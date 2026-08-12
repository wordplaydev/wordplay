import type Conflict from '@conflicts/Conflict';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import ListValue from '@values/ListValue';
import type Value from '@values/Value';
import type { BasisTypeName } from '@basis/BasisConstants';
import { Purpose } from '@concepts/Purpose';
import type Locales from '@locale/Locales';
import Characters from '../lore/BasisCharacters';
import TypeException from '@values/TypeException';
import AnyType from '@nodes/AnyType';
import CompositeLiteral from '@nodes/CompositeLiteral';
import type Context from '@nodes/Context';
import Expression, { type GuardContext } from '@nodes/Expression';
import getExpectedType from '@nodes/getExpectedType';
import ListCloseToken from '@nodes/ListCloseToken';
import ListOpenToken from '@nodes/ListOpenToken';
import ListType from '@nodes/ListType';
import { list, node, type Grammar, type Replacement } from '@nodes/Node';
import Spread from '@nodes/Spread';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';
import UnionType from '@nodes/UnionType';

export default class ListLiteral extends CompositeLiteral {
    readonly open: Token;
    readonly values: (Spread | Expression)[];
    readonly close: Token | undefined;
    readonly literal: Token | undefined;

    constructor(
        open: Token,
        values: (Spread | Expression)[],
        close?: Token,
        literal?: Token,
    ) {
        super();

        this.open = open;
        this.values = values;
        this.close = close;
        this.literal = literal;

        this.computeChildren();
    }

    static make(values?: (Expression | Spread)[]) {
        return new ListLiteral(
            new ListOpenToken(),
            values ?? [],
            new ListCloseToken(),
        );
    }

    static getPossibleReplacements() {
        // Offer to wrap the element in a list
        return node instanceof Expression ? [ListLiteral.make([node])] : [];
    }

    static getPossibleInsertions() {
        return [ListLiteral.make([])];
    }

    getDescriptor(): NodeDescriptor {
        return 'ListLiteral';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.ListOpen), label: undefined },
            {
                name: 'values',
                kind: list(true, node(Expression), node(Spread)),
                label: () => (l) => l.glossary.value.word,
                // Only allow types to be inserted that are of the surrounding field's expected type.
                getType: (context, index) => {
                    // What is the field of this list?
                    const parent = context.getRoot(this)?.getParent(this);
                    if (parent) {
                        const field = parent.getFieldOfChild(this);
                        if (field) {
                            if (field.getType) {
                                const fieldValue = parent.getField(field.name);
                                const position = Array.isArray(fieldValue)
                                    ? fieldValue.indexOf(this)
                                    : -1;
                                const listType = field.getType(
                                    context,
                                    position < 0 ? undefined : position,
                                );
                                if (listType instanceof ListType) {
                                    // Prefer the type declared for the position being edited.
                                    const itemType =
                                        (index === undefined
                                            ? undefined
                                            : listType.getTypeAt(index)) ??
                                        listType.getItemType(context);
                                    if (itemType !== undefined) return itemType;
                                }
                            }
                        }
                    }
                    return new AnyType();
                },
                space: true,
                // Break onto one line per value when the literal doesn't fit.
                wrap: true,
                // Include a newline before the first item in the list
                initial: true,
                // Include an indent before all items in the list
                indent: true,
            },
            {
                name: 'close',
                kind: node(Sym.ListClose),
                label: undefined,
                wrap: true,
            },
            { name: 'literal', kind: node(Sym.Literal), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new ListLiteral(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('values', this.values, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('literal', this.literal, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Lists;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'list';
    }

    getItemType(context: Context): Type | undefined {
        const types = this.values
            .map((e) => {
                if (e instanceof Spread) {
                    const type = e.list?.getType(context);
                    return type instanceof ListType
                        ? type.getItemType(context)
                        : undefined;
                } else return e.getType(context);
            })
            .filter((type): type is Type => type !== undefined);
        return types.length === 0
            ? undefined
            : UnionType.getPossibleUnion(context, types);
    }

    getConstantLength(): number | undefined {
        // Unknown if any element is a spread, since its length isn't fixed.
        return this.values.some((v) => v instanceof Spread)
            ? undefined
            : this.values.length;
    }

    computeType(context: Context): Type {
        const length = this.getConstantLength();

        // If the type expected here specifies a type per position, and this list has exactly that
        // many values, take a type per position, so that order is checked. Otherwise the item types
        // are unioned, which loses what's at each position.
        const expected = getExpectedType(this, context);
        if (
            expected instanceof ListType &&
            expected.isTuple() &&
            length === expected.types.length
        ) {
            const positions = this.values
                .filter((value): value is Expression => !(value instanceof Spread))
                .map((value) => value.getType(context));
            if (positions.length === length) {
                const tuple = ListType.tuple(positions);
                return this.literal ? tuple : tuple.generalize(context);
            }
        }

        // Strip away any concrete types in the item types.
        const union = ListType.make(this.getItemType(context), length);

        // If a literal type, keep it, otherwise generalize the type.
        return this.literal ? union : union.generalize(context);
    }

    computeConflicts(): Conflict[] {
        if (this.close === undefined)
            return [
                new UnclosedDelimiter(this, this.open, new ListCloseToken()),
            ];

        return [];
    }

    getDependencies(): Expression[] {
        return this.values
            .map((val) => (val instanceof Spread ? val.list : val))
            .filter((val): val is Expression => val !== undefined);
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        return [
            new Start(this),
            ...this.values.reduce(
                (steps: Step[], item) => [
                    ...steps,
                    ...(item instanceof Spread
                        ? item.list
                            ? item.list.compile(evaluator, context)
                            : []
                        : item.compile(evaluator, context)),
                ],
                [],
            ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Start with the list of values from the expression to help keep track of the ones that were handled.
        const items = this.values.slice();

        // Pop all of the values.
        const values = [];
        for (let i = 0; i < this.values.length; i++) {
            const value = evaluator.popValue(this);
            let item;
            do {
                item = items.pop();
            } while (item instanceof Spread && item.list === undefined);
            // Was this a spread value? Add all of its items to this list.
            if (item instanceof Spread) {
                if (value instanceof ListValue) {
                    // Add them in reverse order so they end up in the correct order.
                    for (let j = value.values.length - 1; j >= 0; j--)
                        values.unshift(value.values[j]);
                } else
                    return new TypeException(
                        this,
                        evaluator,
                        ListType.make(),
                        value,
                    );
            }
            // Add the non-spread value.
            else values.unshift(value);
        }

        // Construct the new list.
        return new ListValue(this, values);
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        this.values.forEach((val) => {
            if (val instanceof Expression)
                val.evaluateTypeGuards(current, guard);
            else if (val.list) val.list.evaluateTypeGuards(current, guard);
        });
        return current;
    }

    getStart() {
        return this.open;
    }
    getFinish() {
        return this.close ?? this.values[this.values.length - 1] ?? this.open;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.ListLiteral;
    getLocalePath() {
        return ListLiteral.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.ListLiteral.start);
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize((l) => l.node.ListLiteral.finish, {
            value: this.getValueIfDefined(locales, context, evaluator),
        });
    }

    getDescriptionInputs() {
        return {
            count: this.values.length,
        };
    }

    getCharacter() {
        return Characters.List;
    }
}
