import type Conflict from '@conflicts/Conflict';
import { IncompatibleKey } from '@conflicts/IncompatibleKey';
import Expression from './Expression';
import type Token from './Token';
import Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import SetValue from '@values/SetValue';
import MapValue from '@values/MapValue';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import MapType from './MapType';
import SetType from './SetType';
import BooleanType from './BooleanType';
import type Bind from './Bind';
import type TypeSet from './TypeSet';
import TypeException from '@values/TypeException';
import UnionType from './UnionType';
import SetOpenToken from './SetOpenToken';
import SetCloseToken from './SetCloseToken';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import { node, type Grammar, type Replacement } from './Node';
import NodeRef from '@locale/NodeRef';
import Glyphs from '../lore/Glyphs';
import type { BasisTypeName } from '../basis/BasisConstants';
import Purpose from '../concepts/Purpose';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import { NotAType } from './NotAType';
import concretize from '../locale/concretize';
import Sym from './Sym';
import type Locales from '../locale/Locales';
import NoneType from './NoneType';

export default class SetOrMapAccess extends Expression {
    readonly setOrMap: Expression;
    readonly open: Token;
    readonly key: Expression;
    readonly close?: Token;

    constructor(
        setOrMap: Expression,
        open: Token,
        key: Expression,
        close?: Token
    ) {
        super();

        this.setOrMap = setOrMap;
        this.open = open;
        this.key = key;
        this.close = close;

        this.computeChildren();
    }

    static make(setOrMap: Expression, key: Expression) {
        return new SetOrMapAccess(
            setOrMap,
            new SetOpenToken(),
            key,
            new SetCloseToken()
        );
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'setOrMap',
                kind: node(Expression),
                label: (locales: Locales) => locales.get((l) => l.term.set),
                // Must be a number
                getType: () => UnionType.make(SetType.make(), MapType.make()),
            },
            { name: 'open', kind: node(Sym.SetOpen) },
            {
                name: 'key',
                kind: node(Expression),
                label: (locales: Locales) => locales.get((l) => l.term.key),
            },
            { name: 'close', kind: node(Sym.SetClose) },
        ];
    }

    clone(replace?: Replacement) {
        return new SetOrMapAccess(
            this.replaceChild('setOrMap', this.setOrMap, replace),
            this.replaceChild('open', this.open, replace),
            this.replaceChild('key', this.key, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getPurpose(): Purpose {
        return Purpose.Value;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'set';
    }

    computeConflicts(context: Context): Conflict[] {
        const setMapType = this.setOrMap.getType(context);
        const keyType = this.key.getType(context);

        const conflicts = [];

        if (!(setMapType instanceof SetType || setMapType instanceof MapType))
            conflicts.push(
                new IncompatibleInput(
                    this,
                    setMapType,
                    UnionType.make(SetType.make(), MapType.make())
                )
            );

        if (
            (setMapType instanceof SetType || setMapType instanceof MapType) &&
            setMapType.key instanceof Type &&
            !setMapType.key.accepts(keyType, context)
        )
            conflicts.push(new IncompatibleKey(this, setMapType.key, keyType));

        if (this.close === undefined)
            return [
                new UnclosedDelimiter(this, this.open, new SetCloseToken()),
            ];

        return conflicts;
    }

    computeType(context: Context): Type {
        // Either a set or map type, and if so, the key or value's type.
        const setOrMapType = this.setOrMap.getType(context);
        if (
            setOrMapType instanceof MapType &&
            setOrMapType.value instanceof Type
        )
            return UnionType.make(setOrMapType.value, NoneType.make());
        else if (setOrMapType instanceof SetType) return BooleanType.make();
        else
            return new NotAType(
                this,
                setOrMapType,
                UnionType.make(SetType.make(), MapType.make())
            );
    }

    getDependencies(): Expression[] {
        return [this.setOrMap, this.key];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        // Evaluate the set expression, then the key expression, then this.
        return [
            new Start(this),
            ...this.setOrMap.compile(evaluator, context),
            ...this.key.compile(evaluator, context),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const key = evaluator.popValue(this);
        const setOrMap = evaluator.popValue(this);

        if (!(setOrMap instanceof SetValue || setOrMap instanceof MapValue))
            return new TypeException(
                this,
                evaluator,
                UnionType.make(SetType.make(), MapType.make()),
                setOrMap
            );
        else return setOrMap.has(this, key);
    }

    evaluateTypeGuards(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        if (this.setOrMap instanceof Expression)
            this.setOrMap.evaluateTypeGuards(bind, original, current, context);
        if (this.key instanceof Expression)
            this.key.evaluateTypeGuards(bind, original, current, context);
        return current;
    }

    getStart() {
        return this.open;
    }
    getFinish() {
        return this.close ?? this.key;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.SetOrMapAccess);
    }

    getStartExplanations(locales: Locales, context: Context) {
        return concretize(
            locales,
            locales.get((l) => l.node.SetOrMapAccess.start),
            new NodeRef(this.setOrMap, locales, context)
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator
    ) {
        return concretize(
            locales,
            locales.get((l) => l.node.SetOrMapAccess.finish),
            this.getValueIfDefined(locales, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.SetOrMapAccess;
    }
}
