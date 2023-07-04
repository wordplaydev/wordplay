import Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@runtime/Value';
import Set from '@runtime/Set';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import UnionType from './UnionType';
import type TypeSet from './TypeSet';
import SetType from './SetType';
import AnyType from './AnyType';
import type Bind from './Bind';
import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from '@parser/Symbols';
import TokenType from './TokenType';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import type { NativeTypeName } from '../native/NativeConstants';
import Purpose from '../concepts/Purpose';
import UnclosedDelimiter from '../conflicts/UnclosedDelimiter';
import SetCloseToken from './SetCloseToken';
import type Conflict from '../conflicts/Conflict';
import generalize from './generalize';

export default class SetLiteral extends Expression {
    readonly open: Token;
    readonly values: Expression[];
    readonly close: Token | undefined;

    constructor(open: Token, values: Expression[], close: Token | undefined) {
        super();

        this.open = open;
        this.values = values;
        this.close = close;

        this.computeChildren();
    }

    static make(values: Expression[]) {
        return new SetLiteral(
            new Token(SET_OPEN_SYMBOL, TokenType.SetOpen),
            values,
            new Token(SET_CLOSE_SYMBOL, TokenType.SetClose)
        );
    }

    getGrammar() {
        return [
            { name: 'open', types: [Token] },
            {
                name: 'values',
                types: [[Expression]],
                space: true,
                indent: true,
            },
            { name: 'close', types: [Token] },
        ];
    }

    clone(replace?: Replacement) {
        return new SetLiteral(
            this.replaceChild('open', this.open, replace),
            this.replaceChild<Expression[]>('values', this.values, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getPurpose(): Purpose {
        return Purpose.Store;
    }

    getAffiliatedType(): NativeTypeName | undefined {
        return 'set';
    }

    computeConflicts(): Conflict[] {
        return this.close === undefined
            ? [new UnclosedDelimiter(this, this.open, new SetCloseToken())]
            : [];
    }

    computeType(context: Context): Type {
        let types =
            this.values.length === 0
                ? new AnyType()
                : UnionType.getPossibleUnion(
                      context,
                      this.values.map((v) => (v as Expression).getType(context))
                  );

        // Strip away any concrete types in the item types.
        types = generalize(types, context);

        return SetType.make(types);
    }

    getDependencies(): Expression[] {
        return [...this.values];
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            // Evaluate all of the item or key/value expressions
            ...this.values.reduce(
                (steps: Step[], item) => [
                    ...steps,
                    ...(item as Expression).compile(context),
                ],
                []
            ),
            // Then build the set or map.
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Pop all of the values. Order doesn't matter.
        const values = [];
        for (let i = 0; i < this.values.length; i++)
            values.unshift(evaluator.popValue(this));
        return new Set(this, values);
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
        return translation.node.SetLiteral;
    }

    getStartExplanations(translation: Locale) {
        return translation.node.SetLiteral.start;
    }

    getFinishExplanations(
        translation: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return translation.node.SetLiteral.finish(
            this.getValueIfDefined(translation, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Set;
    }
}
