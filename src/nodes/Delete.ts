import type Node from './Node';
import Token from './Token';
import Expression, { type GuardContext } from './Expression';
import type Conflict from '@conflicts/Conflict';
import type Type from './Type';
import BooleanType from './BooleanType';
import TableType from './TableType';
import Bind from '@nodes/Bind';
import type Value from '@values/Value';
import Finish from '@runtime/Finish';
import type Step from '@runtime/Step';
import Start from '@runtime/Start';
import type Context from './Context';
import type Definition from './Definition';
import type TypeSet from './TypeSet';
import type Evaluator from '@runtime/Evaluator';
import { node, type Grammar, type Replacement } from './Node';
import NodeRef from '@locale/NodeRef';
import Glyphs from '../lore/Glyphs';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import concretize from '../locale/concretize';
import Sym from './Sym';
import Purpose from '../concepts/Purpose';
import FunctionDefinition from './FunctionDefinition';
import Names from './Names';
import TableValue from '../values/TableValue';
import type StructureValue from '../values/StructureValue';
import Evaluation from '@runtime/Evaluation';
import BoolValue from '@values/BoolValue';
import { getIteration, getIterationResult } from '../basis/Iteration';
import { DELETE_SYMBOL } from '../parser/Symbols';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import type Locales from '../locale/Locales';

type DeleteState = { index: number; list: StructureValue[]; table: TableValue };

export default class Delete extends Expression {
    readonly table: Expression;
    readonly del: Token;
    readonly query: Expression;

    constructor(table: Expression, del: Token, query: Expression) {
        super();

        this.table = table;
        this.del = del;
        this.query = query;

        this.computeChildren();
    }

    static make(table: Expression, query: Expression) {
        return new Delete(table, new Token(DELETE_SYMBOL, Sym.Delete), query);
    }

    getDescriptor() {
        return 'Delete';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'table',
                kind: node(Expression),
                label: (locales: Locales) => locales.get((l) => l.term.table),
            },
            { name: 'del', kind: node(Sym.Delete), space: true },
            {
                name: 'query',
                kind: node(Expression),
                label: (locales: Locales) => locales.get((l) => l.term.query),
                // Must be a boolean
                getType: () => BooleanType.make(),
                space: true,
            },
        ];
    }

    static getPossibleNodes(
        type: Type | undefined,
        anchor: Node,
        selected: boolean,
        context: Context,
    ) {
        const anchorType =
            anchor instanceof Expression ? anchor.getType(context) : undefined;
        const tableType =
            anchorType instanceof TableType ? anchorType : undefined;
        return anchor instanceof Expression && tableType && selected
            ? [
                  Delete.make(
                      anchor,
                      ExpressionPlaceholder.make(BooleanType.make()),
                  ),
              ]
            : [];
    }

    getPurpose() {
        return Purpose.Evaluate;
    }

    clone(replace?: Replacement) {
        return new Delete(
            this.replaceChild('table', this.table, replace),
            this.replaceChild('del', this.del, replace),
            this.replaceChild('query', this.query, replace),
        ) as this;
    }

    getScopeOfChild(child: Node, context: Context): Node | undefined {
        return child === this.query
            ? this.table.getType(context)
            : this.getParent(context);
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        const tableType = this.table.getType(context);

        // Table must be table typed.
        if (!(tableType instanceof TableType))
            conflicts.push(
                new IncompatibleInput(
                    this.table,
                    tableType,
                    TableType.make([]),
                ),
            );

        // The query must be truthy.
        const queryType = this.query.getType(context);
        if (
            this.query instanceof Expression &&
            !(queryType instanceof BooleanType)
        )
            conflicts.push(
                new IncompatibleInput(
                    this.query,
                    queryType,
                    BooleanType.make(),
                ),
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

    compile(evaluator: Evaluator, context: Context): Step[] {
        /** A derived function based on the query, used to evaluate each row of the table. */
        const query = FunctionDefinition.make(
            undefined,
            Names.make([]),
            undefined,
            [],
            this.query,
            BooleanType.make(),
        );

        return [
            new Start(this),
            ...this.table.compile(evaluator, context),
            ...getIteration<DeleteState, this>(
                this,
                // Initialize a keep list and a counter as we iterate through the rows.
                (evaluator) => {
                    const table = evaluator.peekValue();
                    return table instanceof TableValue
                        ? { index: 0, list: [], table }
                        : evaluator.getValueOrTypeException(
                              this,
                              TableType.make(),
                              table,
                          );
                },
                (evaluator, info) => {
                    if (info.index > info.table.rows.length - 1) return false;
                    else {
                        // Start a new evaluation of the query with the row as scope.
                        evaluator.startEvaluation(
                            new Evaluation(
                                evaluator,
                                this,
                                query,
                                info.table.rows[info.index],
                            ),
                        );
                        return true;
                    }
                },
                (evaluator, info) => {
                    const remove = evaluator.popValue(this, BooleanType.make());
                    if (!(remove instanceof BoolValue)) return remove;
                    // Query was false? Keep instead of deleting.
                    if (remove.bool === false)
                        info.list.push(info.table.rows[info.index]);
                    // Increment the counter.
                    info.index = info.index + 1;
                },
            ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator): Value {
        const { table, list } = getIterationResult<DeleteState>(evaluator);
        // Pop the table.
        evaluator.popValue(this);

        // Create a new table based on the kept rows
        return new TableValue(this, table.type, list);
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        if (this.table instanceof Expression)
            this.table.evaluateTypeGuards(current, guard);
        if (this.query instanceof Expression)
            this.query.evaluateTypeGuards(current, guard);
        return current;
    }

    getStart() {
        return this.del;
    }
    getFinish() {
        return this.del;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Delete);
    }

    getStartExplanations(locales: Locales, context: Context) {
        return concretize(
            locales,
            locales.get((l) => l.node.Delete.start),
            new NodeRef(this.table, locales, context),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return concretize(
            locales,
            locales.get((l) => l.node.Delete.finish),
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getGlyphs() {
        return Glyphs.Delete;
    }
}
