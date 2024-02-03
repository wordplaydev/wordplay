import Expression, { type GuardContext } from './Expression';
import ListType from './ListType';
import type Token from './Token';
import type Type from './Type';
import ListValue from '@values/ListValue';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import UnionType from './UnionType';
import type TypeSet from './TypeSet';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import type Conflict from '@conflicts/Conflict';
import ListOpenToken from './ListOpenToken';
import ListCloseToken from './ListCloseToken';
import { node, type Grammar, type Replacement, list } from './Node';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { BasisTypeName } from '../basis/BasisConstants';
import concretize from '../locale/concretize';
import Sym from './Sym';
import AnyType from './AnyType';
import Spread from './Spread';
import TypeException from '../values/TypeException';
import type Locales from '../locale/Locales';
import { MAX_LINE_LENGTH } from '@parser/Spaces';

export default class ListLiteral extends Expression {
    readonly open: Token;
    readonly values: (Spread | Expression)[];
    readonly close?: Token;
    readonly literal?: Token;

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

    static getPossibleNodes() {
        return [ListLiteral.make()];
    }

    getDescriptor() {
        return 'ListLiteral';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.ListOpen) },
            {
                name: 'values',
                kind: list(true, node(Expression), node(Spread)),
                label: (locales: Locales) =>
                    locales.get((l) => l.node.ListLiteral.item),
                // Only allow types to be inserted that are of the list's type, if provided.
                getType: (context) =>
                    this.getItemType(context)?.generalize(context) ??
                    new AnyType(),
                space: true,
                // Add line breaks if greater than 40 characters long.
                newline:
                    this.values.reduce(
                        (sum, value) => sum + value.toWordplay().length,
                        0,
                    ) > MAX_LINE_LENGTH,
                indent: true,
            },
            { name: 'close', kind: node(Sym.ListClose) },
            { name: 'literal', kind: node(Sym.Literal) },
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
        return Purpose.Value;
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.ListLiteral);
    }

    getStartExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.ListLiteral.start),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return concretize(
            locales,
            locales.get((l) => l.node.ListLiteral.finish),
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getDescriptionInputs() {
        return [this.values.length];
    }

    getGlyphs() {
        return Glyphs.List;
    }
}
