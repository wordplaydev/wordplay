import Expression, { type GuardContext } from './Expression';
import KeyValue from '@nodes/KeyValue';
import type Token from './Token';
import type Type from './Type';
import type Conflict from '@conflicts/Conflict';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import MapValue from '@values/MapValue';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import UnionType from './UnionType';
import type TypeSet from './TypeSet';
import { NotAKeyValue } from '@conflicts/NotAKeyValue';
import MapType from './MapType';
import AnyType from './AnyType';
import BindToken from './BindToken';
import SetOpenToken from './SetOpenToken';
import SetCloseToken from './SetCloseToken';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import { node, type Grammar, type Replacement, optional, list } from './Node';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { BasisTypeName } from '../basis/BasisConstants';
import concretize from '../locale/concretize';
import ValueException from '../values/ValueException';
import Sym from './Sym';
import type Locales from '../locale/Locales';
import { MAX_LINE_LENGTH } from '@parser/Spaces';

export default class MapLiteral extends Expression {
    readonly open: Token;
    readonly values: (Expression | KeyValue)[];
    readonly close?: Token;
    readonly bind?: Token;
    readonly literal: Token | undefined;

    constructor(
        open: Token,
        values: (KeyValue | Expression)[],
        bind?: Token,
        close?: Token,
        literal?: Token,
    ) {
        super();

        this.open = open;
        this.values = values;
        this.bind = bind;
        this.close = close;
        this.literal = literal;

        this.computeChildren();
    }

    static make(values?: KeyValue[]) {
        return new MapLiteral(
            new SetOpenToken(),
            values ?? [],
            (values ?? []).length === 0 ? new BindToken() : undefined,
            new SetCloseToken(),
        );
    }

    static getPossibleNodes() {
        return [MapLiteral.make()];
    }

    getDescriptor() {
        return 'MapLiteral';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.SetOpen) },
            { name: 'bind', kind: optional(node(Sym.Bind)) },
            {
                name: 'values',
                kind: list(true, node(KeyValue)),
                space: true,
                indent: true,
                initial: true,
                newline: this.wrap(),
            },
            { name: 'close', kind: node(Sym.SetClose), newline: this.wrap() },
            { name: 'literal', kind: node(Sym.Literal) },
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
        return new MapLiteral(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('values', this.values, replace),
            this.replaceChild('bind', this.bind, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('literal', this.literal, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Value;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'map';
    }

    getKeyValuePairs() {
        return this.values.filter((v): v is KeyValue => v instanceof KeyValue);
    }

    computeConflicts(): Conflict[] {
        const conflicts: Conflict[] = [];

        // Check for non-key/value pairs
        for (const expression of this.values.filter(
            (v): v is Expression => v instanceof Expression,
        ))
            conflicts.push(new NotAKeyValue(this, expression));

        if (this.close === undefined)
            return [
                new UnclosedDelimiter(this, this.open, new SetCloseToken()),
            ];

        return conflicts;
    }

    computeType(context: Context): Type {
        const keyType =
            this.values.length === 0
                ? new AnyType()
                : UnionType.getPossibleUnion(
                      context,
                      this.getKeyValuePairs().map((v) =>
                          v.key.getType(context),
                      ),
                  );

        const valueType =
            this.values.length === 0
                ? new AnyType()
                : UnionType.getPossibleUnion(
                      context,
                      this.getKeyValuePairs().map((v) =>
                          v.value.getType(context),
                      ),
                  );

        // Strip away any concrete types in the item types.
        return MapType.make(
            this.literal ? keyType : keyType.generalize(context),
            this.literal ? valueType : valueType.generalize(context),
        );
    }

    getDependencies(): Expression[] {
        return this.getKeyValuePairs()
            .map((kv) => [kv.key, kv.value])
            .flat();
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        return [
            new Start(this),
            // Evaluate all of the item or key/value expressions
            ...this.getKeyValuePairs().reduce(
                (steps: Step[], item) => [
                    ...steps,
                    ...[
                        ...item.key.compile(evaluator, context),
                        ...item.value.compile(evaluator, context),
                    ],
                ],
                [],
            ),
            // Then build the set or map.
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Pop all of the values. Order matters because redundant keys that come later should override previous keys.
        const values: [Value, Value][] = [];
        for (let i = 0; i < this.values.length; i++) {
            const value = evaluator.popValue(this);
            const key = evaluator.popValue(this);
            if (value instanceof ValueException) return value;
            if (key instanceof ValueException) return value;
            values.unshift([key, value]);
        }
        return new MapValue(this, values);
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        this.values.forEach((val) => {
            if (val instanceof Expression)
                val.evaluateTypeGuards(current, guard);
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.MapLiteral);
    }

    getStartExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.MapLiteral.start),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return concretize(
            locales,
            locales.get((l) => l.node.MapLiteral.finish),
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getDescriptionInputs() {
        return [this.values.length];
    }

    getGlyphs() {
        return Glyphs.Set;
    }
}
