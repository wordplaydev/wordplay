import Expression from './Expression';
import KeyValue from './KeyValue';
import Token from './Token';
import type Type from './Type';
import type Conflict from '@conflicts/Conflict';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@runtime/Value';
import Map from '@runtime/Map';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import UnionType from './UnionType';
import type TypeSet from './TypeSet';
import { NotAKeyValue } from '@conflicts/NotAKeyValue';
import MapType from './MapType';
import AnyType from './AnyType';
import type Bind from './Bind';
import BindToken from './BindToken';
import SetOpenToken from './SetOpenToken';
import SetCloseToken from './SetCloseToken';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { NativeTypeName } from '../native/NativeConstants';

export default class MapLiteral extends Expression {
    readonly open: Token;
    readonly values: (Expression | KeyValue)[];
    readonly close?: Token;
    readonly bind?: Token;

    constructor(
        open: Token,
        values: (KeyValue | Expression)[],
        bind?: Token,
        close?: Token
    ) {
        super();

        this.open = open;
        this.values = values;
        this.bind = bind;
        this.close = close;

        this.computeChildren();
    }

    static make(values: KeyValue[]) {
        return new MapLiteral(
            new SetOpenToken(),
            values,
            values.length === 0 ? new BindToken() : undefined,
            new SetCloseToken()
        );
    }

    getGrammar() {
        return [
            { name: 'open', types: [Token] },
            { name: 'values', types: [[KeyValue]], space: true, indent: true },
            { name: 'close', types: [Token] },
            { name: 'bind', types: [Token, undefined] },
        ];
    }

    clone(replace?: Replacement) {
        return new MapLiteral(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('values', this.values, replace),
            this.replaceChild('bind', this.bind, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Store;
    }

    getAffiliatedType(): NativeTypeName | undefined {
        return 'map';
    }

    getKeyValuePairs() {
        return this.values.filter((v): v is KeyValue => v instanceof KeyValue);
    }

    computeConflicts(): Conflict[] {
        const conflicts: Conflict[] = [];

        // Check for non-key/value pairs
        for (const expression of this.values.filter(
            (v): v is Expression => v instanceof Expression
        ))
            conflicts.push(new NotAKeyValue(this, expression));

        if (this.close === undefined)
            return [
                new UnclosedDelimiter(this, this.open, new SetCloseToken()),
            ];

        return conflicts;
    }

    computeType(context: Context): Type {
        let keyType =
            this.values.length === 0
                ? new AnyType()
                : UnionType.getPossibleUnion(
                      context,
                      this.getKeyValuePairs().map((v) => v.key.getType(context))
                  );
        let valueType =
            this.values.length === 0
                ? new AnyType()
                : UnionType.getPossibleUnion(
                      context,
                      this.getKeyValuePairs().map((v) =>
                          v.value.getType(context)
                      )
                  );

        return MapType.make(keyType, valueType);
    }

    getDependencies(): Expression[] {
        return this.getKeyValuePairs()
            .map((kv) => [kv.key, kv.value])
            .flat();
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            // Evaluate all of the item or key/value expressions
            ...this.getKeyValuePairs().reduce(
                (steps: Step[], item) => [
                    ...steps,
                    ...[
                        ...item.key.compile(context),
                        ...item.value.compile(context),
                    ],
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
        const values: [Value, Value][] = [];
        for (let i = 0; i < this.values.length; i++) {
            const value = evaluator.popValue(this);
            const key = evaluator.popValue(this);
            values.unshift([key, value]);
        }
        return new Map(this, values);
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
        return (
            this.close ??
            this.values[this.values.length - 1] ??
            this.bind ??
            this.open
        );
    }

    getNodeLocale(translation: Locale) {
        return translation.node.MapLiteral;
    }

    getStartExplanations(translation: Locale) {
        return translation.node.MapLiteral.start;
    }

    getFinishExplanations(
        translation: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return translation.node.MapLiteral.finish(
            this.getValueIfDefined(translation, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Set;
    }
}
