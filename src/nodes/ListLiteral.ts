import Expression from './Expression';
import ListType from './ListType';
import Token from './Token';
import type Type from './Type';
import List from '../runtime/List';
import type Evaluator from '../runtime/Evaluator';
import type Value from '../runtime/Value';
import type Step from '../runtime/Step';
import Finish from '../runtime/Finish';
import Start from '../runtime/Start';
import type Context from './Context';
import UnionType from './UnionType';
import type TypeSet from './TypeSet';
import type Bind from './Bind';
import UnclosedDelimiter from '../conflicts/UnclosedDelimiter';
import type Conflict from '../conflicts/Conflict';
import ListOpenToken from './ListOpenToken';
import ListCloseToken from './ListCloseToken';
import type { Replacement } from './Node';
import type Translation from '../translations/Translation';

export default class ListLiteral extends Expression {
    readonly open: Token;
    readonly values: Expression[];
    readonly close?: Token;

    constructor(open: Token, values: Expression[], close?: Token) {
        super();

        this.open = open;
        this.values = values;
        this.close = close;

        this.computeChildren();
    }

    static make(values: Expression[]) {
        return new ListLiteral(
            new ListOpenToken(),
            values,
            new ListCloseToken()
        );
    }

    getGrammar() {
        return [
            { name: 'open', types: [Token] },
            {
                name: 'values',
                types: [[Expression]],
                label: (translation: Translation) =>
                    translation.expressions.ListLiteral.item,
                space: true,
                indent: true,
            },
            { name: 'close', types: [Token] },
        ];
    }

    clone(replace?: Replacement) {
        return new ListLiteral(
            this.replaceChild('open', this.open, replace),
            this.replaceChild<Expression[]>('values', this.values, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    computeType(context: Context): Type {
        const expressions = this.values.filter(
            (e) => e instanceof Expression
        ) as Expression[];
        let itemType =
            expressions.length === 0
                ? undefined
                : UnionType.getPossibleUnion(
                      context,
                      expressions.map((v) => v.getType(context))
                  );
        return ListType.make(itemType, this.values.length);
    }

    computeConflicts(): Conflict[] {
        if (this.close === undefined)
            return [
                new UnclosedDelimiter(this, this.open, new ListCloseToken()),
            ];

        return [];
    }

    getDependencies(): Expression[] {
        return [...this.values];
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            ...this.values.reduce(
                (steps: Step[], item) => [...steps, ...item.compile(context)],
                []
            ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Pop all of the values.
        const values = [];
        for (let i = 0; i < this.values.length; i++)
            values.unshift(evaluator.popValue(undefined));

        // Construct the new list.
        return new List(this, values);
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

    getDescription(translation: Translation) {
        return translation.expressions.ListLiteral.description;
    }

    getStartExplanations(translation: Translation) {
        return translation.expressions.ListLiteral.start;
    }

    getFinishExplanations(translation: Translation) {
        return translation.expressions.ListLiteral.finish;
    }
}
