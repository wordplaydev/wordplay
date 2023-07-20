import Expression from './Expression';
import ListType from './ListType';
import type Token from './Token';
import type Type from './Type';
import List from '@runtime/List';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@runtime/Value';
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
import type { NativeTypeName } from '../native/NativeConstants';
import concretize from '../locale/concretize';
import Symbol from './Symbol';

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

    static make(values?: Expression[]) {
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
            { name: 'open', types: node(Symbol.ListOpen) },
            {
                name: 'values',
                types: list(node(Expression)),
                label: (translation: Locale) =>
                    translation.node.ListLiteral.item,
                space: true,
                indent: true,
            },
            { name: 'close', types: node(Symbol.ListClose), space: true },
        ];
    }

    clone(replace?: Replacement) {
        return new ListLiteral(
            this.replaceChild('open', this.open, replace),
            this.replaceChild<Expression[]>('values', this.values, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Value;
    }

    getAffiliatedType(): NativeTypeName | undefined {
        return 'list';
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

        // Strip away any concrete types in the item types.
        return ListType.make(itemType, this.values.length).generalize(context);
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
            values.unshift(evaluator.popValue(this));

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
