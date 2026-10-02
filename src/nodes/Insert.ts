import conciseRef from '#nodes/conciseRef.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import type Conflict from '#conflicts/Conflict.ts';
import getConceptName from '#locale/getConceptName.ts';
import type { ReplaceContext } from '#edit/revision/EditContext.ts';
import type Context from '#nodes/Context.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import Bind from '#nodes/Bind.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import Finish from '#runtime/Finish.ts';
import Halt from '#runtime/Halt.ts';
import Start from '#runtime/Start.ts';
import type Step from '#runtime/Step.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import TableValue from '#values/TableValue.ts';
import TypeException from '#values/TypeException.ts';
import UnimplementedException from '#values/UnimplementedException.ts';
import type Value from '#values/Value.ts';
import { Purpose } from '#concepts/Purpose.ts';
import IncompatibleCellType from '#conflicts/IncompatibleCellType.ts';
import IncompatibleInput from '#conflicts/IncompatibleInput.ts';
import InvalidRow from '#conflicts/InvalidRow.ts';
import MissingCell from '#conflicts/MissingCell.ts';
import UnknownColumn from '#conflicts/UnknownColumn.ts';
import type Locales from '#locale/Locales.ts';
import Characters from '../lore/BasisCharacters';
import { INSERT_SYMBOL, TABLE_CLOSE_SYMBOL } from '#parser/Symbols.ts';
import StructureValue from '#values/StructureValue.ts';
import type Definition from '#nodes/Definition.ts';
import Expression, { type GuardContext } from '#nodes/Expression.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import Input from '#nodes/Input.ts';
import type Node from '#nodes/Node.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import Row, { getRowFromValues } from '#nodes/Row.ts';
import { Sym } from '#nodes/Sym.ts';
import TableType from '#nodes/TableType.ts';
import Token from '#nodes/Token.ts';
import type Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';

export default class Insert extends Expression {
    readonly table: Expression;
    readonly row: Row;

    constructor(table: Expression, row: Row) {
        super();

        this.table = table;
        this.row = row;

        this.computeChildren();
    }

    static make(table: Expression, cells: Expression[] = []) {
        return new Insert(
            table,
            new Row(
                new Token(INSERT_SYMBOL, Sym.Insert),
                cells,
                new Token(TABLE_CLOSE_SYMBOL, Sym.TableClose),
            ),
        );
    }

    getDescriptor(): NodeDescriptor {
        return 'Insert';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'table',
                kind: node(Expression),
                label: () => (l) => getConceptName(l, 'table'),
            },
            {
                name: 'row',
                kind: node(Row),
                label: () => (l) => getConceptName(l, 'row'),
                space: true,
            },
        ];
    }

    static getPossibleReplacements({ node, context }: ReplaceContext) {
        const anchorType =
            node instanceof Expression ? node.getType(context) : undefined;
        const tableType =
            anchorType instanceof TableType ? anchorType : undefined;
        return node instanceof Expression && tableType
            ? [
                  Insert.make(
                      node,
                      // Filtered: a table type built mid-edit can hold an undefined column,
                      // and mapping over it threw rather than offering a shorter row.
                      tableType.columns
                          .filter((column) => column !== undefined)
                          .map((column) =>
                              ExpressionPlaceholder.make(
                                  column.getType(context),
                              ),
                          ),
                  ),
              ]
            : [];
    }

    static getPossibleInsertions() {
        return [Insert.make(ExpressionPlaceholder.make(TableType.make()))];
    }

    getPurpose() {
        return Purpose.Tables;
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new Insert(
                this.replaceChild('table', this.table, replace),
                this.replaceChild('row', this.row, replace),
            ),
        );
    }

    getScopeOfChild(child: Node, context: Context): Node | undefined {
        // The row's scope is the table (because the row's names must be defined in the table).
        return child === this.row
            ? this.getType(context)
            : this.getParent(context);
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        const tableType = this.table.getType(context);

        // Table must be table typed.
        if (!(tableType instanceof TableType)) {
            if (context.isUnknownDownstream(this.table)) return conflicts;
            return [new IncompatibleInput(this, tableType, TableType.make([]))];
        }

        // The row must "match" the columns, where match means that all columns without a default get a value.
        // Rows can either be all unnamed and provide values for every column or they can be selectively named,
        // but must provide a value for all non-default columns. No other format is allowed.
        // Additionally, all values must match their column's types.
        if (this.row.cells.every((c) => c instanceof Input)) {
            // Ensure every bind is a valid column.
            const matchedColumns = [];
            for (const cell of this.row.cells) {
                if (cell instanceof Input) {
                    const column = tableType.getColumnNamed(cell.getName());
                    if (column === undefined)
                        conflicts.push(new UnknownColumn(tableType, cell));
                    else {
                        matchedColumns.push(column);
                        const expected = column.getType(context);
                        const given = cell.getType(context);
                        if (
                            !context.isUnknownDownstream(cell) &&
                            !expected.accepts(given, context)
                        )
                            conflicts.push(
                                new IncompatibleCellType(
                                    tableType,
                                    cell,
                                    expected,
                                    given,
                                ),
                            );
                    }
                }
            }
            // Ensure all non-default columns were specified.
            for (const column of tableType.columns) {
                if (!matchedColumns.includes(column) && !column.hasDefault())
                    conflicts.push(
                        new MissingCell(this.row, tableType, column),
                    );
            }

            // Ensure there are no extra expressions.
        } else if (this.row.allExpressions()) {
            const cells = this.row.cells.slice();
            for (const column of tableType.columns) {
                const cell = cells.shift();
                if (cell === undefined)
                    conflicts.push(
                        new MissingCell(this.row, tableType, column),
                    );
                else {
                    const expected = column.getType(context);
                    const given = cell.getType(context);
                    if (
                        !context.isUnknownDownstream(cell) &&
                        !expected.accepts(given, context)
                    )
                        conflicts.push(
                            new IncompatibleCellType(
                                tableType,
                                cell,
                                expected,
                                given,
                            ),
                        );
                }
            }
        } else conflicts.push(new InvalidRow(this.row));

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
            return type.columns.filter(
                (col): col is Bind => col instanceof Bind,
            );
        else return [];
    }

    getDependencies(): Expression[] {
        return [
            this.table,
            ...this.row.cells.map((cell) =>
                cell instanceof Input ? cell.value : cell,
            ),
        ];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        const tableType = this.table.getType(context);

        return [
            new Start(this),
            ...this.table.compile(evaluator, context),
            ...(!(tableType instanceof TableType)
                ? [
                      new Halt(
                          (evaluator) =>
                              new TypeException(
                                  this,
                                  evaluator,
                                  TableType.make([]),
                                  evaluator.popValue(this),
                              ),
                          this,
                      ),
                  ]
                : this.row.allExpressions()
                  ? // It's all expressions, compile all of them in order.
                    this.row.cells.reduce(
                        (steps: Step[], cell) => [
                            ...steps,
                            ...(cell instanceof Input
                                ? cell.value
                                : cell
                            ).compile(evaluator, context),
                        ],
                        [],
                    )
                  : // Otherwise, loop through the required columns, finding the corresponding bind, and compiling it's expression, or the default if not found.
                    tableType.columns.reduce((steps: Step[], column) => {
                        const matchingCell = this.row.cells.find(
                            (cell) =>
                                column instanceof Bind &&
                                cell instanceof Bind &&
                                column.sharesName(cell),
                        );
                        if (
                            matchingCell === undefined ||
                            !(matchingCell instanceof Bind) ||
                            matchingCell.value === undefined
                        )
                            return [
                                ...steps,
                                new Halt(
                                    (evaluator) =>
                                        new UnimplementedException(
                                            evaluator,
                                            this,
                                        ),
                                    this,
                                ),
                            ];
                        return [
                            ...steps,
                            ...matchingCell.value.compile(evaluator, context),
                        ];
                    }, [])),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // We've got a table and some cells, insert the row!
        const values: Value[] = [];
        for (let i = 0; i < this.row.cells.length; i++) {
            const value = evaluator.popValue(this);
            if (value instanceof ExceptionValue) return value;
            else values.unshift(value);
        }

        const table = evaluator.popValue(this, TableType.make([]));
        if (!(table instanceof TableValue)) return table;

        // Return a new table with the new row.
        const row = getRowFromValues(evaluator, this, table.type, values);
        return row instanceof StructureValue ? table.insert(this, row) : row;
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        if (this.table instanceof Expression)
            this.table.evaluateTypeGuards(current, guard);
        this.row.evaluateTypeGuards(current, guard);
        return current;
    }

    getStart() {
        return this.row.open;
    }
    getFinish() {
        return this.row.close ?? this.row.open;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Insert;
    getLocalePath() {
        return Insert.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Insert.start);
    }

    getFinishExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Insert.finish);
    }

    getDescriptionInputs(
        locales: Locales,
        context: Context,
    ): Record<string, TemplateInput> {
        return {
            table: conciseRef(this.table, locales, context),
        };
    }

    getCharacter() {
        return Characters.Insert;
    }
}
