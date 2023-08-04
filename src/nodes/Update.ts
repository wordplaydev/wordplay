import type Node from './Node';
import Expression from './Expression';
import Row from './Row';
import type Conflict from '@conflicts/Conflict';
import UnknownColumn from '@conflicts/UnknownColumn';
import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import ExpectedUpdateBind from '@conflicts/ExpectedUpdateBind';
import type Type from './Type';
import Bind from '@nodes/Bind';
import TableType from './TableType';
import BooleanType from './BooleanType';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
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
import Purpose from '../concepts/Purpose';
import FunctionDefinition from './FunctionDefinition';
import Names from './Names';
import { getIteration, getIterationResult } from '../basis/Iteration';
import Table from '../runtime/Table';
import Evaluation from '../runtime/Evaluation';
import Structure from '../runtime/Structure';
import InternalExpression from '../basis/InternalExpression';
import AnyType from './AnyType';
import Bool from '../runtime/Bool';
import Exception from '../runtime/Exception';
import ValueException from '../runtime/ValueException';
import type Value from '../runtime/Value';

type UpdateState = { table: Table; index: number; rows: Structure[] };

export default class Update extends Expression {
    readonly table: Expression;
    readonly row: Row;
    readonly query: Expression;

    constructor(table: Expression, row: Row, query: Expression) {
        super();

        this.table = table;
        this.row = row;
        this.query = query;

        this.computeChildren();
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'table',
                kind: node(Expression),
                label: (translation: Locale) => translation.term.table,
            },
            {
                name: 'row',
                kind: node(Row),
                label: (translation: Locale) => translation.term.row,
                space: true,
            },
            {
                name: 'query',
                kind: node(Expression),
                label: (translation: Locale) => translation.term.query,
                space: true,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Update(
            this.replaceChild('table', this.table, replace),
            this.replaceChild('row', this.row, replace),
            this.replaceChild('query', this.query, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Value;
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
        if (!(tableType instanceof TableType)) {
            conflicts.push(
                new IncompatibleInput(this, tableType, TableType.make([]))
            );
            return conflicts;
        }

        this.row.cells.forEach((cell) => {
            // The columns in an update must be binds with expressions.
            if (
                !(
                    cell instanceof Bind &&
                    cell.value !== undefined &&
                    cell.names.names.length === 1
                )
            )
                conflicts.push(new ExpectedUpdateBind(this, cell));
            else if (tableType instanceof TableType) {
                const alias =
                    cell instanceof Bind && cell.names.names.length > 0
                        ? cell.names.names[0]
                        : undefined;
                const name = alias === undefined ? undefined : alias.getName();
                const columnType =
                    name === undefined
                        ? undefined
                        : tableType.getColumnNamed(name);
                // The named table column must exist.
                if (columnType === undefined)
                    conflicts.push(new UnknownColumn(tableType, cell));
                // The types of the bound values must match the column types.
                else if (columnType instanceof Bind) {
                    const bindType = columnType.getType(context);
                    const cellType = cell.getType(context);
                    if (!bindType.accepts(cellType, context))
                        conflicts.push(
                            new IncompatibleCellType(
                                tableType,
                                cell,
                                bindType,
                                cellType
                            )
                        );
                }
            }
        });

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
        // The type of an update is the type of its table
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
        return [this.table, ...this.row.cells.map((cell) => cell), this.query];
    }

    compile(context: Context): Step[] {
        // Find the type of table and get a structure type for it's row.
        const type = this.table.getType(context);
        const structureType =
            type instanceof TableType
                ? type.definition.computeType()
                : new AnyType();

        // Get the binds
        const binds = this.row.cells;

        // Get the update steps
        const updates = binds
            .map((bind) =>
                bind instanceof Bind && bind.value
                    ? bind.value.compile(context)
                    : []
            )
            .flat();

        /** A derived function based on the query, used to evaluate each row of the table. */
        const revise = FunctionDefinition.make(
            undefined,
            Names.make([]),
            undefined,
            [],
            new InternalExpression(
                structureType,
                [
                    // 1) evaluate the query
                    ...this.query.compile(context),
                    // 2) evaluate the bind expression
                    ...updates,
                ],
                (requestor: Expression, evaluation: Evaluation) => {
                    // Get the row
                    let row = evaluation.getClosure();
                    // Not a row? Exception.
                    if (!(row instanceof Structure))
                        return new ValueException(
                            evaluation.getEvaluator(),
                            this
                        );
                    // Get the values computed
                    const values: Value[] = [];
                    for (const bind of binds) {
                        if (bind instanceof Bind && bind.value) {
                            const value = evaluation.popValue(this, undefined);
                            if (value instanceof Exception) return value;
                            values.unshift(value);
                        }
                    }
                    // Get the query result
                    const match = evaluation.popValue(
                        requestor,
                        BooleanType.make()
                    );
                    if (!(match instanceof Bool)) return match;
                    // Not a query match? Don't modify the row.
                    if (match.bool === false) return row;
                    // Otherwise, refine the row with the updtes
                    else {
                        let newRow: Structure = row;
                        for (const bind of binds) {
                            if (bind instanceof Bind && bind.value) {
                                const value = values.shift();
                                const revised: Structure | undefined = value
                                    ? newRow.withValue(
                                          this,
                                          bind.names.getNames()[0],
                                          value
                                      )
                                    : undefined;
                                if (revised === undefined)
                                    return new ValueException(
                                        evaluation.getEvaluator(),
                                        this
                                    );
                                newRow = revised;
                            }
                        }
                        return newRow;
                    }
                }
            ),
            structureType
        );

        // Evaluate the table expression then this.
        return [
            new Start(this),
            ...this.table.compile(context),
            ...getIteration<UpdateState, this>(
                this,
                // Track the table, index, and the revised rows.
                (evaluator) => {
                    const table = evaluator.popValue(this);
                    return table instanceof Table
                        ? { table, index: 0, rows: [] }
                        : evaluator.getValueOrTypeException(
                              this,
                              TableType.make(),
                              table
                          );
                },
                (evaluator, info) => {
                    // If we reached the end, stop.
                    if (info.index > info.table.rows.length - 1) return false;
                    // Otherwise, revise a row.
                    else {
                        // Start a new evaluation of the query with the row as scope.
                        evaluator.startEvaluation(
                            new Evaluation(
                                evaluator,
                                this,
                                revise,
                                info.table.rows[info.index]
                            )
                        );
                        return true;
                    }
                },
                (evaluator, info) => {
                    const row = evaluator.popValue(this);
                    if (!(row instanceof Structure)) return row;
                    // Add the revised structure.
                    info.rows.push(row);
                    // Increment the counter to the next row.
                    info.index = info.index + 1;
                }
            ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        const { table, rows } = getIterationResult<UpdateState>(evaluator);
        return new Table(this, table.type, rows);
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        if (this.table instanceof Expression)
            this.table.evaluateTypeSet(bind, original, current, context);
        if (this.row instanceof Expression)
            this.row.evaluateTypeSet(bind, original, current, context);
        if (this.query instanceof Expression)
            this.query.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getStart() {
        return this.row.open;
    }
    getFinish() {
        return this.row.close ?? this.row.open;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Update;
    }

    getStartExplanations(locale: Locale, context: Context) {
        return concretize(
            locale,
            locale.node.Update.start,
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
            locale.node.Update.finish,
            this.getValueIfDefined(locale, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Update;
    }
}
