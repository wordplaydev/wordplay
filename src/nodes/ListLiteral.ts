import Expression from './Expression';
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
import type Bind from './Bind';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import type Conflict from '@conflicts/Conflict';
import ListOpenToken from './ListOpenToken';
import ListCloseToken from './ListCloseToken';
import { node, type Grammar, type Replacement, list } from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { BasisTypeName } from '../basis/BasisConstants';
import concretize from '../locale/concretize';
import Sym from './Sym';
import AnyType from './AnyType';
import Spread from './Spread';
import TypeException from '../values/TypeException';

export default class ListLiteral extends Expression {
    readonly open: Token;
    readonly values: (Spread | Expression)[];
    readonly close?: Token;

    constructor(open: Token, values: (Spread | Expression)[], close?: Token) {
        super();

        this.open = open;
        this.values = values;
        this.close = close;

        this.computeChildren();
    }

    static make(values?: (Expression | Spread)[]) {
        return new ListLiteral(
            new ListOpenToken(),
            values ?? [],
            new ListCloseToken()
        );
    }

    static getPossibleNodes() {
        return [ListLiteral.make()];
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.ListOpen) },
            {
                name: 'values',
                kind: list(true, node(Expression), node(Spread)),
                label: (translation: Locale) =>
                    translation.node.ListLiteral.item,
                // Only allow types to be inserted that are of the list's type, if provided.
                getType: (context) =>
                    this.getItemType(context)?.generalize(context) ??
                    new AnyType(),
                space: true,
                indent: true,
            },
            { name: 'close', kind: node(Sym.ListClose) },
        ];
    }

    clone(replace?: Replacement) {
        return new ListLiteral(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('values', this.values, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Value;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'list';
    }

    getItemType(context: Context): Type | undefined {
        const expressions = this.values.filter(
            (e) => e instanceof Expression
        ) as Expression[];
        return expressions.length === 0
            ? undefined
            : UnionType.getPossibleUnion(
                  context,
                  expressions.map((v) => v.getType(context))
              );
    }

    computeType(context: Context): Type {
        // Strip away any concrete types in the item types.
        return ListType.make(
            this.getItemType(context),
            this.values.length
        ).generalize(context);
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
                []
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
                        value
                    );
            }
            // Add the non-spread value.
            else values.unshift(value);
        }

        // Construct the new list.
        return new ListValue(this, values);
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        this.values.forEach((val) => {
            if (val instanceof Expression)
                val.evaluateTypeSet(bind, original, current, context);
        });
        return current;
    }

    getStart() {
        return this.open;
    }
    getFinish() {
        return this.close ?? this.values[this.values.length - 1] ?? this.open;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.ListLiteral;
    }

    getStartExplanations(locale: Locale) {
        return concretize(locale, locale.node.ListLiteral.start);
    }

    getFinishExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return concretize(
            locale,
            locale.node.ListLiteral.finish,
            this.getValueIfDefined(locale, context, evaluator)
        );
    }

    getDescriptionInputs() {
        return [this.values.length];
    }

    getGlyphs() {
        return Glyphs.List;
    }
}
