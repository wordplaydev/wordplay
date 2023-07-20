import Expression from './Expression';
import KeyValue from './KeyValue';
import type Token from './Token';
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
import { node, type Grammar, type Replacement, optional, list } from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { NativeTypeName } from '../native/NativeConstants';
import concretize from '../locale/concretize';
import ValueException from '../runtime/ValueException';
import Symbol from './Symbol';

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

    static make(values?: KeyValue[]) {
        return new MapLiteral(
            new SetOpenToken(),
            values ?? [],
            (values ?? []).length === 0 ? new BindToken() : undefined,
            new SetCloseToken()
        );
    }

    static getPossibleNodes() {
        return [MapLiteral.make()];
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Symbol.SetOpen) },
            { name: 'bind', kind: optional(node(Symbol.Bind)) },
            {
                name: 'values',
                kind: list(node(KeyValue)),
                space: true,
                indent: true,
            },
            { name: 'close', kind: node(Symbol.SetClose) },
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
        return Purpose.Value;
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

        // Strip away any concrete types in the item types.
        return MapType.make(keyType, valueType).generalize(context);
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
            if (value instanceof ValueException) return value;
            if (key instanceof ValueException) return value;
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

    getStartExplanations(locale: Locale) {
        return concretize(locale, locale.node.MapLiteral.start);
    }

    getFinishExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return concretize(
            locale,
            locale.node.MapLiteral.finish,
            this.getValueIfDefined(locale, context, evaluator)
        );
    }

    getDescriptionInputs(locale: Locale, _: Context) {
        return [this.values.length];
    }

    getGlyphs() {
        return Glyphs.Set;
    }
}
