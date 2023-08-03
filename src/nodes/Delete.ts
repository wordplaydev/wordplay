import type Node from './Node';
import type Token from './Token';
import Expression from './Expression';
import type Conflict from '@conflicts/Conflict';
import type Type from './Type';
import BooleanType from './BooleanType';
import TableType from './TableType';
import Bind from '@nodes/Bind';
import type Value from '@runtime/Value';
import Finish from '@runtime/Finish';
import type Step from '@runtime/Step';
import Start from '@runtime/Start';
import type Context from './Context';
import type Definition from './Definition';
import type TypeSet from './TypeSet';
import type Evaluator from '@runtime/Evaluator';
import { node, type Grammar, type Replacement } from './Node';
import type Locale from '@locale/Locale';
import NodeRef from '@locale/NodeRef';
import Glyphs from '../lore/Glyphs';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import concretize from '../locale/concretize';
import Symbol from './Symbol';
import Purpose from '../concepts/Purpose';
import FunctionDefinition from './FunctionDefinition';
import Names from './Names';
import Table from '../runtime/Table';
import type Structure from '../runtime/Structure';
import Evaluation from '../runtime/Evaluation';
import Initialize from '../runtime/Initialize';
import List from '../runtime/List';
import Number from '../runtime/Number';
import Next from '../runtime/Next';
import NumberType from './NumberType';
import Check from '../runtime/Check';
import Bool from '../runtime/Bool';
import ListType from './ListType';

const INDEX = 'index';
const LIST = 'list';

export default class Delete extends Expression {
    readonly table: Expression;
    readonly del: Token;
    readonly query: Expression;

    /** A derived function based on the query, used to evaluate each row of the table. */
    readonly fun: FunctionDefinition;

    constructor(table: Expression, del: Token, query: Expression) {
        super();

        this.table = table;
        this.del = del;
        this.query = query;

        this.fun = FunctionDefinition.make(
            undefined,
            Names.make([]),
            undefined,
            [],
            this.query,
            BooleanType.make()
        );

        this.computeChildren();
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'table',
                kind: node(Expression),
                label: (translation: Locale) => translation.term.table,
            },
            { name: 'del', kind: node(Symbol.Delete) },
            {
                name: 'query',
                kind: node(Expression),
                label: (translation: Locale) => translation.term.query,
                // Must be a boolean
                getType: () => BooleanType.make(),
                space: true,
            },
        ];
    }

    getPurpose() {
        return Purpose.Value;
    }

    clone(replace?: Replacement) {
        return new Delete(
            this.replaceChild('table', this.table, replace),
            this.replaceChild('del', this.del, replace),
            this.replaceChild('query', this.query, replace)
        ) as this;
    }

    getScopeOfChild(child: Node, context: Context): Node | undefined {
        return child === this.query ? this.table : this.getParent(context);
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        const tableType = this.table.getType(context);

        // Table must be table typed.
        if (!(tableType instanceof TableType))
            conflicts.push(
                new IncompatibleInput(this.table, tableType, TableType.make([]))
            );

        // The query must be truthy.
        const queryType = this.query.getType(context);
        if (
            this.query instanceof Expression &&
            !(queryType instanceof BooleanType)
        )
            conflicts.push(
                new IncompatibleInput(this.query, queryType, BooleanType.make())
            );

        return conflicts;
    }

    computeType(context: Context): Type {
        // The type is identical to the table's type.
        return this.table.getType(context);
    }

    getDefinitions(node: Node, context: Context): Definition[] {
        node;
        const type = this.table.getType(context);
        if (type instanceof TableType)
            return type.columns
                .filter((col) => col instanceof Bind)
                .map((col) => col) as Bind[];
        else return [];
    }

    getDependencies(): Expression[] {
        return [this.table, this.query];
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            ...this.table.compile(context),
            // Initialize a keep list and a counter as we iterate through the rows.
            new Initialize(this, (evaluator) => {
                evaluator.bind(INDEX, new Number(this, 0));
                evaluator.bind(LIST, new List(this, []));
                return undefined;
            }),
            new Next(this, (evaluator) => {
                const index = evaluator.resolve(INDEX);
                const table = evaluator.peekValue();
                // If the index is past the last index of the list, jump to the end.
                if (!(index instanceof Number))
                    return evaluator.getValueOrTypeException(
                        this,
                        NumberType.make(),
                        index
                    );
                else if (!(table instanceof Table))
                    return evaluator.getValueOrTypeException(
                        this,
                        TableType.make(),
                        table
                    );
                else {
                    if (
                        index.greaterThan(
                            this,
                            new Number(this, table.rows.length - 1)
                        ).bool
                    )
                        // Jump past this evaluation step to the finish
                        evaluator.jump(1);
                    else {
                        const row = table.rows[index.toNumber()];

                        // Start a new evaluation of the query with the row as scope.
                        evaluator.startEvaluation(
                            new Evaluation(evaluator, this, this.fun, row)
                        );
                    }
                }
            }),
            // Save the translated value and then jump to the conditional.
            new Check(this, (evaluator) => {
                // Get the boolean from the function evaluation.
                const remove = evaluator.popValue(this, BooleanType.make());
                if (!(remove instanceof Bool)) return remove;

                // Get the current index.
                const index = evaluator.resolve(INDEX);
                if (!(index instanceof Number))
                    return evaluator.getValueOrTypeException(
                        this,
                        NumberType.make(),
                        index
                    );

                const table = evaluator.peekValue();
                if (!(table instanceof Table))
                    return evaluator.getValueOrTypeException(
                        this,
                        TableType.make(),
                        table
                    );

                // If the include decided yes, append the value.
                const newList = evaluator.resolve(LIST);
                if (!(newList instanceof List))
                    return evaluator.getValueOrTypeException(
                        this,
                        ListType.make(),
                        newList
                    );
                else if (!(remove instanceof Bool))
                    return evaluator.getValueOrTypeException(
                        this,
                        BooleanType.make(),
                        remove
                    );
                else {
                    const row = table.rows[index.toNumber()];
                    if (!remove.bool) {
                        evaluator.bind(LIST, newList.add(this, row));
                    }
                }

                // Increment the counter
                evaluator.bind(INDEX, index.add(this, new Number(this, 1)));

                // Jump back to the
                evaluator.jump(-2);

                return undefined;
            }),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator): Value {
        const table = evaluator.popValue(this);

        if (!(table instanceof Table)) return table;

        const kept = evaluator.resolve(LIST);
        if (!(kept instanceof List))
            return evaluator.getValueOrTypeException(
                this,
                ListType.make(),
                kept
            );

        // Create a new table based on the kept rows
        return new Table(table.literal, kept.values as Structure[]);
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        if (this.table instanceof Expression)
            this.table.evaluateTypeSet(bind, original, current, context);
        if (this.query instanceof Expression)
            this.query.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getStart() {
        return this.del;
    }
    getFinish() {
        return this.del;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Delete;
    }

    getStartExplanations(locale: Locale, context: Context) {
        return concretize(
            locale,
            locale.node.Delete.start,
            new NodeRef(this.table, locale, context)
        );
    }

    getFinishExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return concretize(
            locale,
            locale.node.Delete.finish,
            this.getValueIfDefined(locale, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Delete;
    }
}
