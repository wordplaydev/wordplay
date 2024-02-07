import Expression, { type GuardContext } from './Expression';
import Row from './Row';
import type Conflict from '@conflicts/Conflict';
import UnknownColumn from '@conflicts/UnknownColumn';
import ExpectedSelectName from '@conflicts/ExpectedSelectName';
import type Type from './Type';
import Reference from './Reference';
import TableType from './TableType';
import BooleanType from './BooleanType';
import Bind from '@nodes/Bind';
import type Node from './Node';
import type Value from '@values/Value';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import type Definition from './Definition';
import type TypeSet from './TypeSet';
import type Evaluator from '@runtime/Evaluator';
import UnknownNameType from './UnknownNameType';
import { node, type Grammar, type Replacement } from './Node';
import NodeRef from '@locale/NodeRef';
import Glyphs from '../lore/Glyphs';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import { NotAType } from './NotAType';
import concretize from '../locale/concretize';
import Purpose from '../concepts/Purpose';
import type StructureValue from '../values/StructureValue';
import { getIteration, getIterationResult } from '../basis/Iteration';
import TableValue from '../values/TableValue';
import FunctionDefinition from './FunctionDefinition';
import Names from './Names';
import Evaluation from '@runtime/Evaluation';
import BoolValue from '@values/BoolValue';
import { SELECT_SYMBOL, TABLE_CLOSE_SYMBOL } from '../parser/Symbols';
import Sym from './Sym';
import Token from './Token';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import type Locales from '../locale/Locales';

type SelectState = {
    table: TableValue;
    index: number;
    selected: StructureValue[];
};

export default class Select extends Expression {
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

    static make(table: Expression, query: Expression) {
        return new Select(
            table,
            new Row(
                new Token(SELECT_SYMBOL, Sym.Select),
                [],
                new Token(TABLE_CLOSE_SYMBOL, Sym.TableClose),
            ),
            query,
        );
    }

    getDescriptor() {
        return 'Select';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'table',
                kind: node(Expression),
                label: (locales: Locales) => locales.get((l) => l.term.table),
            },
            {
                name: 'row',
                kind: node(Row),
                label: (locales: Locales) => locales.get((l) => l.term.row),
                space: true,
            },
            {
                name: 'query',
                kind: node(Expression),
                label: (locales: Locales) => locales.get((l) => l.term.query),
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
                  Select.make(
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
        return new Select(
            this.replaceChild('table', this.table, replace),
            this.replaceChild('row', this.row, replace),
            this.replaceChild('query', this.query, replace),
        ) as this;
    }

    getScopeOfChild(child: Node, context: Context): Node | undefined {
        // The query and row are scoped by the table.
        return child === this.query || child === this.row
            ? this.table.getType(context)
            : this.getParent(context);
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        const tableType = this.table.getType(context);

        // Table must be table typed.
        if (!(tableType instanceof TableType))
            conflicts.push(
                new IncompatibleInput(this, tableType, TableType.make([])),
            );

        // The columns in a select must be names.
        this.row.cells.forEach((cell) => {
            if (!(cell instanceof Reference))
                conflicts.push(new ExpectedSelectName(this, cell));
        });

        // The columns named must be names in the table's type.
        if (tableType instanceof TableType) {
            this.row.cells.forEach((cell) => {
                const cellName = cell instanceof Reference ? cell : undefined;
                if (
                    !(
                        cellName !== undefined &&
                        tableType.getColumnNamed(cellName.name.getText()) !==
                            undefined
                    )
                )
                    conflicts.push(new UnknownColumn(tableType, cell));
            });
        }

        // The query must be boolean typed.
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
        // Get the table type and find the rows corresponding the selected columns.
        const tableType = this.table.getType(context);
        if (!(tableType instanceof TableType))
            return new NotAType(this, tableType, TableType.make([]));

        // For each cell in the select row, find the corresponding column type in the table type.
        // If we can't find one, return unknown.
        const columnTypes =
            this.row.cells.length === 0
                ? tableType.columns
                : this.row.cells.map((cell) => {
                      const column =
                          cell instanceof Reference
                              ? tableType.getColumnNamed(
                                    cell.name.text.toString(),
                                )
                              : undefined;
                      return column === undefined ? undefined : column;
                  });
        if (columnTypes.find((t) => t === undefined))
            return new UnknownNameType(this, undefined, undefined);

        return TableType.make(columnTypes as Bind[]);
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

        // Evaluate the table expression then this.
        return [
            new Start(this),
            ...this.table.compile(evaluator, context),
            ...getIteration<SelectState, this>(
                this,
                // Track the table, index through the rows, and a list of selected rows
                (evaluator) => {
                    const table = evaluator.peekValue();
                    return table instanceof TableValue
                        ? { table, index: 0, selected: [] }
                        : evaluator.getValueOrTypeException(
                              this,
                              TableType.make(),
                              table,
                          );
                },
                (evaluator, info) => {
                    // If we reached the end, stop.
                    if (info.index > info.table.rows.length - 1) return false;
                    // Otherwise, evaluate
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
                    const select = evaluator.popValue(this, BooleanType.make());
                    if (!(select instanceof BoolValue)) return select;
                    // Query was false? Keep instead of deleting.
                    if (select.bool)
                        info.selected.push(info.table.rows[info.index]);
                    // Increment the counter to the next row.
                    info.index = info.index + 1;
                },
            ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator): Value {
        const { table, selected } = getIterationResult<SelectState>(evaluator);

        // Pop the table.
        evaluator.popValue(this);

        // Find the valid column references, if any
        const columns = this.row.cells.filter(
            (cell): cell is Reference => cell instanceof Reference,
        );

        // Create a new table type that only has the binds selected, in the order they were selected.
        const newType =
            columns.length === 0
                ? table.type
                : table.type.withColumns(
                      this.row.cells.filter(
                          (cell): cell is Reference =>
                              cell instanceof Reference,
                      ),
                  );

        return new TableValue(this, newType, selected);
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        if (this.table instanceof Expression)
            this.table.evaluateTypeGuards(current, guard);
        if (this.row instanceof Expression)
            this.row.evaluateTypeGuards(current, guard);
        if (this.query instanceof Expression)
            this.query.evaluateTypeGuards(current, guard);
        return current;
    }

    getStart() {
        return this.row.open;
    }
    getFinish() {
        return this.row.close ?? this.row.open;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Select);
    }

    getStartExplanations(locales: Locales, context: Context) {
        return concretize(
            locales,
            locales.get((l) => l.node.Select.start),
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
            locales.get((l) => l.node.Select.finish),
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getGlyphs() {
        return Glyphs.Select;
    }
}
