import type Conflict from '@conflicts/Conflict';
import type EditContext from '@edit/EditContext';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Bind from '@nodes/Bind';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Halt from '@runtime/Halt';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import ExceptionValue from '@values/ExceptionValue';
import TableValue from '@values/TableValue';
import TypeException from '@values/TypeException';
import UnimplementedException from '@values/UnimplementedException';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import IncompatibleCellType from '../conflicts/IncompatibleCellType';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import InvalidRow from '../conflicts/InvalidRow';
import MissingCell from '../conflicts/MissingCell';
import UnknownColumn from '../conflicts/UnknownColumn';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import { INSERT_SYMBOL, TABLE_CLOSE_SYMBOL } from '../parser/Symbols';
import StructureValue from '../values/StructureValue';
import type Context from './Context';
import type Definition from './Definition';
import Expression, { type GuardContext } from './Expression';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import Input from './Input';
import type Node from './Node';
import { node, type Grammar, type Replacement } from './Node';
import Row, { getRowFromValues } from './Row';
import Sym from './Sym';
import TableType from './TableType';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';

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
                label: () => (l) => l.term.table,
            },
            {
                name: 'row',
                kind: node(Row),
                label: () => (l) => l.term.row,
                space: true,
            },
        ];
    }

    static getPossibleReplacements({ node, context }: EditContext) {
        const anchorType =
            node instanceof Expression ? node.getType(context) : undefined;
        const tableType =
            anchorType instanceof TableType ? anchorType : undefined;
        return node instanceof Expression && tableType
            ? [
                  Insert.make(
                      node,
                      tableType.columns.map((c) =>
                          ExpressionPlaceholder.make(c.getType(context)),
                      ),
                  ),
              ]
            : [];
    }

    static getPossibleAppends() {
        return [Insert.make(ExpressionPlaceholder.make(TableType.make()))];
    }

    getPurpose() {
        return Purpose.Value;
    }

    clone(replace?: Replacement) {
        return new Insert(
            this.replaceChild('table', this.table, replace),
            this.replaceChild('row', this.row, replace),
        ) as this;
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
        if (!(tableType instanceof TableType))
            return [new IncompatibleInput(this, tableType, TableType.make([]))];

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
                        if (!expected.accepts(given, context))
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
                    if (!expected.accepts(given, context))
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
            return type.columns
                .filter((col) => col instanceof Bind)
                .map((col) => col) as Bind[];
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
                        const matchingCell: Expression | undefined =
                            this.row.cells.find(
                                (cell) =>
                                    column instanceof Bind &&
                                    cell instanceof Bind &&
                                    column.sharesName(cell),
                            ) as Expression | undefined;
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
        if (this.row instanceof Expression)
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

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize(
            (l) => l.node.Insert.start,
            new NodeRef(this.table, locales, context),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize(
            (l) => l.node.Insert.finish,
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getCharacter() {
        return Characters.Insert;
    }
}
