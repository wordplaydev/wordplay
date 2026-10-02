import type Conflict from '#conflicts/Conflict.ts';
import { NotAKeyValue } from '#conflicts/NotAKeyValue.ts';
import UnclosedDelimiter from '#conflicts/UnclosedDelimiter.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import KeyValue from '#nodes/KeyValue.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import Finish from '#runtime/Finish.ts';
import Start from '#runtime/Start.ts';
import type Step from '#runtime/Step.ts';
import MapValue from '#values/MapValue.ts';
import type Value from '#values/Value.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import { Purpose } from '#concepts/Purpose.ts';
import type Locales from '#locale/Locales.ts';
import Characters from '../lore/BasisCharacters';
import ValueException from '#values/ValueException.ts';
import AnyType from '#nodes/AnyType.ts';
import BindToken from '#nodes/BindToken.ts';
import CompositeLiteral from '#nodes/CompositeLiteral.ts';
import type Context from '#nodes/Context.ts';
import Expression, { type GuardContext } from '#nodes/Expression.ts';
import MapType from '#nodes/MapType.ts';
import {
    list,
    node,
    optional,
    type Grammar,
    type Replacement,
} from '#nodes/Node.ts';
import SetCloseToken from '#nodes/SetCloseToken.ts';
import SetOpenToken from '#nodes/SetOpenToken.ts';
import { Sym } from '#nodes/Sym.ts';
import type Token from '#nodes/Token.ts';
import type Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';
import UnionType from '#nodes/UnionType.ts';

export default class MapLiteral extends CompositeLiteral {
    readonly open: Token;
    readonly values: (Expression | KeyValue)[];
    readonly close: Token | undefined;
    readonly bind: Token | undefined;
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
            SetOpenToken(),
            values ?? [],
            (values ?? []).length === 0 ? BindToken() : undefined,
            SetCloseToken(),
        );
    }

    static getPossibleReplacements() {
        return [];
    }

    static getPossibleInsertions() {
        return [MapLiteral.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'MapLiteral';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.SetOpen), label: undefined },
            { name: 'bind', kind: optional(node(Sym.Bind)), label: undefined },
            {
                name: 'values',
                kind: list(true, node(KeyValue)),
                space: true,
                indent: true,
                initial: true,
                // Break onto one line per value when the literal doesn't fit.
                wrap: true,
                label: () => (l) => l.node.MapLiteral.label.values,
            },
            {
                name: 'close',
                kind: node(Sym.SetClose),
                wrap: true,
                label: undefined,
            },
            { name: 'literal', kind: node(Sym.Literal), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new MapLiteral(
                this.replaceChild('open', this.open, replace),
                this.replaceChild('values', this.values, replace),
                this.replaceChild('bind', this.bind, replace),
                this.replaceChild('close', this.close, replace),
                this.replaceChild('literal', this.literal, replace),
            ),
        );
    }

    getPurpose() {
        return Purpose.Maps;
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
            return [new UnclosedDelimiter(this, this.open, SetCloseToken())];

        return conflicts;
    }

    getConstantLength(): number {
        return this.values.length;
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
        // Entries are KeyValue, which extends Node rather than Expression, so an
        // `instanceof Expression` filter here silently skipped every one of them.
        this.values.forEach((val) => {
            if (val instanceof KeyValue) {
                val.key.evaluateTypeGuards(current, guard);
                val.value.evaluateTypeGuards(current, guard);
            } else val.evaluateTypeGuards(current, guard);
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

    static readonly LocalePath = (l: LocaleText) => l.node.MapLiteral;
    getLocalePath() {
        return MapLiteral.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.MapLiteral.start);
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize((l) => l.node.MapLiteral.finish, {
            value: this.getValueIfDefined(locales, context, evaluator),
        });
    }

    getDescriptionInputs() {
        return {
            count: this.values.length,
        };
    }

    getCharacter() {
        return Characters.Set;
    }
}
