import type Conflict from '@conflicts/Conflict';
import { NotAListIndex } from '@conflicts/NotAListIndex';
import Expression from './Expression';
import ListType from './ListType';
import MeasurementType from './MeasurementType';
import Token from './Token';
import Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@runtime/Value';
import List from '@runtime/List';
import Measurement from '@runtime/Measurement';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import NoneType from './NoneType';
import UnionType from './UnionType';
import type TypeSet from './TypeSet';
import Unit from './Unit';
import type Bind from './Bind';
import { NotAList } from '@conflicts/NotAList';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import ListOpenToken from './ListOpenToken';
import ListCloseToken from './ListCloseToken';
import MeasurementLiteral from './MeasurementLiteral';
import type { Replacement } from './Node';
import type Translation from '@translation/Translation';
import { NotAListType } from './NotAListType';
import NodeLink from '@translation/NodeLink';
import Glyphs from '../lore/Glyphs';
import type { NativeTypeName } from '../native/NativeConstants';
import Purpose from '../concepts/Purpose';
import None from '../runtime/None';

export default class ListAccess extends Expression {
    readonly list: Expression;
    readonly open: Token;
    readonly index: Expression;
    readonly close?: Token;

    constructor(
        list: Expression,
        open: Token,
        index: Expression,
        close?: Token
    ) {
        super();

        this.list = list;
        this.open = open;
        this.index = index;
        this.close = close;

        this.computeChildren();
    }

    static make(list: Expression, index: Expression) {
        return new ListAccess(
            list,
            new ListOpenToken(),
            index,
            new ListCloseToken()
        );
    }

    getGrammar() {
        return [
            {
                name: 'list',
                types: [Expression],
                label: (translation: Translation) => translation.data.list,
                // Must be a list
                getType: () => ListType.make(),
            },
            { name: 'open', types: [Token] },
            {
                name: 'index',
                types: [Expression],
                label: (translation: Translation) => translation.data.index,
                // Must be a number
                getType: () => MeasurementType.make(),
            },
            { name: 'close', types: [Token] },
        ];
    }

    clone(replace?: Replacement) {
        return new ListAccess(
            this.replaceChild('list', this.list, replace),
            this.replaceChild('open', this.open, replace),
            this.replaceChild('index', this.index, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getPurpose(): Purpose {
        return Purpose.Store;
    }

    getAffiliatedType(): NativeTypeName | undefined {
        return 'list';
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts = [];

        if (this.close === undefined)
            conflicts.push(
                new UnclosedDelimiter(this, this.open, new ListCloseToken())
            );

        const listType = this.list.getType(context);
        if (!(listType instanceof ListType))
            conflicts.push(new NotAList(this, listType));

        const indexType = this.index.getType(context);

        if (
            !(indexType instanceof MeasurementType) ||
            (indexType.unit instanceof Unit && !indexType.unit.isUnitless())
        )
            conflicts.push(new NotAListIndex(this, indexType));

        return conflicts;
    }

    computeType(context: Context): Type {
        // The type is the list's value type, or unknown otherwise.
        const listType = this.list.getType(context);
        if (listType instanceof ListType && listType.type instanceof Type) {
            if (
                listType.length !== undefined &&
                this.index instanceof MeasurementLiteral &&
                this.index.getValue().num.greaterThanOrEqualTo(1) &&
                this.index.getValue().num.lessThanOrEqualTo(listType.length)
            )
                return listType.type;
            else
                return UnionType.getPossibleUnion(context, [
                    listType.type,
                    NoneType.None,
                ]);
        } else return new NotAListType(this, listType);
    }

    getDependencies(): Expression[] {
        return [this.list, this.index];
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            ...this.list.compile(context),
            ...this.index.compile(context),
            new Finish(this),
        ];
    }

    getStart() {
        return this.open;
    }
    getFinish() {
        return this.close ?? this.index;
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const index = evaluator.popValue(this, MeasurementType.make());
        if (!(index instanceof Measurement) || !index.num.isInteger())
            return new None(this);

        const list = evaluator.popValue(this, ListType.make());
        if (!(list instanceof List)) return list;

        return list.get(index);
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        if (this.list instanceof Expression)
            this.list.evaluateTypeSet(bind, original, current, context);
        if (this.index instanceof Expression)
            this.index.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getNodeTranslation(translation: Translation) {
        return translation.node.ListAccess;
    }

    getStartExplanations(translation: Translation, context: Context) {
        return translation.node.ListAccess.start(
            new NodeLink(this.list, translation, context)
        );
    }

    getFinishExplanations(
        translation: Translation,
        context: Context,
        evaluator: Evaluator
    ) {
        return translation.node.ListAccess.finish(
            this.getValueIfDefined(translation, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.List;
    }
}
