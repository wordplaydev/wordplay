import type Conflict from '@conflicts/Conflict';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { MAX_LINE_LENGTH } from '@parser/Spaces';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import ListValue from '@values/ListValue';
import type Value from '@values/Value';
import type { BasisTypeName } from '../basis/BasisConstants';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import TypeException from '../values/TypeException';
import AnyType from './AnyType';
import CompositeLiteral from './CompositeLiteral';
import type Context from './Context';
import Expression, { type GuardContext } from './Expression';
import ListCloseToken from './ListCloseToken';
import ListOpenToken from './ListOpenToken';
import ListType from './ListType';
import { list, node, type Grammar, type Replacement } from './Node';
import Spread from './Spread';
import Sym from './Sym';
import type Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';
import UnionType from './UnionType';

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

    static getPossibleAppends() {
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
                label: () => (l) => l.term.value,
                // Only allow types to be inserted that are of the surrounding field's expected type.
                getType: (context) => {
                    // What is the field of this list?
                    const parent = context.getRoot(this)?.getParent(this);
                    if (parent) {
                        const field = parent.getFieldOfChild(this);
                        if (field) {
                            if (field.getType) {
                                const fieldValue = parent.getField(field.name);
                                const index = Array.isArray(fieldValue)
                                    ? fieldValue.indexOf(this)
                                    : -1;
                                const listType = field.getType(
                                    context,
                                    index < 0 ? undefined : index,
                                );
                                if (
                                    listType instanceof ListType &&
                                    listType.type !== undefined
                                )
                                    return listType.type;
                            }
                        }
                    }
                    return new AnyType();
                },
                space: true,
                // Only add line breaks if greater than 40 characters long.
                newline: this.wrap(),
                // Include a newline before the first item in the list
                initial: true,
                // Include an indent before all items in the list
                indent: true,
            },
            {
                name: 'close',
                kind: node(Sym.ListClose),
                label: undefined,
                newline: this.wrap(),
            },
            { name: 'literal', kind: node(Sym.Literal), label: undefined },
        ];
    }

    wrap(): boolean {
        return (
            this.values.reduce(
                (sum, value) => sum + value.toWordplay().length,
                0,
            ) > MAX_LINE_LENGTH
        );
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
                    return type instanceof ListType ? type.type : undefined;
                } else return e.getType(context);
            })
            .filter((type): type is Type => type !== undefined);
        return types.length === 0
            ? undefined
            : UnionType.getPossibleUnion(context, types);
    }

    computeType(context: Context): Type {
        // Strip away any concrete types in the item types.
        const union = ListType.make(
            this.getItemType(context),
            this.values.length,
        );

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
        return locales.concretize(
            (l) => l.node.ListLiteral.finish,
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getDescriptionInputs() {
        return [this.values.length];
    }

    getCharacter() {
        return Characters.List;
    }
}
