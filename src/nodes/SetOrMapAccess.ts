import type Conflict from '../conflicts/Conflict';
import { IncompatibleKey } from '../conflicts/IncompatibleKey';
import Expression from './Expression';
import Token from './Token';
import Type from './Type';
import type Evaluator from '../runtime/Evaluator';
import type Value from '../runtime/Value';
import Set from '../runtime/Set';
import Map from '../runtime/Map';
import type Step from '../runtime/Step';
import Finish from '../runtime/Finish';
import Start from '../runtime/Start';
import type Context from './Context';
import MapType from './MapType';
import SetType from './SetType';
import BooleanType from './BooleanType';
import type Bind from './Bind';
import type TypeSet from './TypeSet';
import TypeException from '../runtime/TypeException';
import UnionType from './UnionType';
import SetOpenToken from './SetOpenToken';
import SetCloseToken from './SetCloseToken';
import { NotASetOrMap } from '../conflicts/NotASetOrMap';
import UnclosedDelimiter from '../conflicts/UnclosedDelimiter';
import type { Replacement } from './Node';
import type Translation from '../translations/Translation';
import { NotASetOrMapType } from './NotASetOrMapType';
import NodeLink from '../translations/NodeLink';

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

    getGrammar() {
        return [
            {
                name: 'setOrMap',
                types: [Expression],
                label: (translation: Translation) => translation.data.set,
                // Must be a number
                getType: () => UnionType.make(SetType.make(), MapType.make()),
            },
            { name: 'open', types: [Token] },
            {
                name: 'key',
                types: [Expression],
                label: (translation: Translation) => translation.data.key,
            },
            { name: 'close', types: [Token] },
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

    computeConflicts(context: Context): Conflict[] {
        const setMapType = this.setOrMap.getType(context);
        const keyType = this.key.getType(context);

        const conflicts = [];

        if (!(setMapType instanceof SetType || setMapType instanceof MapType))
            conflicts.push(new NotASetOrMap(this, setMapType));

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
            return setOrMapType.value;
        else if (setOrMapType instanceof SetType) return BooleanType.make();
        else return new NotASetOrMapType(this, setOrMapType);
    }

    getDependencies(): Expression[] {
        return [this.setOrMap, this.key];
    }

    compile(context: Context): Step[] {
        // Evaluate the set expression, then the key expression, then this.
        return [
            new Start(this),
            ...this.setOrMap.compile(context),
            ...this.key.compile(context),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const key = evaluator.popValue(this);
        const setOrMap = evaluator.popValue(this);

        if (!(setOrMap instanceof Set || setOrMap instanceof Map))
            return new TypeException(
                evaluator,
                UnionType.make(SetType.make(), MapType.make()),
                setOrMap
            );
        else return setOrMap.has(this, key);
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        if (this.setOrMap instanceof Expression)
            this.setOrMap.evaluateTypeSet(bind, original, current, context);
        if (this.key instanceof Expression)
            this.key.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getStart() {
        return this.open;
    }
    getFinish() {
        return this.close ?? this.key;
    }

    getNodeTranslation(translation: Translation) {
        return translation.expressions.SetOrMapAccess;
    }

    getStartExplanations(translation: Translation, context: Context) {
        return translation.expressions.SetOrMapAccess.start(
            new NodeLink(this.setOrMap, translation, context)
        );
    }

    getFinishExplanations(
        translation: Translation,
        context: Context,
        evaluator: Evaluator
    ) {
        return translation.expressions.SetOrMapAccess.finish(
            this.getValueIfDefined(translation, context, evaluator)
        );
    }
}
