import type Node from './Node';
import Token from './Token';
import Expression from './Expression';
import Row from './Row';
import type Conflict from '../conflicts/Conflict';
import NotATable from '../conflicts/NotATable';
import TableType from './TableType';
import Bind from '../nodes/Bind';
import type Type from './Type';
import type Evaluator from '../runtime/Evaluator';
import type Value from '../runtime/Value';
import Table from '../runtime/Table';
import type Step from '../runtime/Step';
import Finish from '../runtime/Finish';
import Start from '../runtime/Start';
import type Context from './Context';
import type Definition from './Definition';
import type TypeSet from './TypeSet';
import { analyzeRow } from './util';
import Halt from '../runtime/Halt';
import Exception from '../runtime/Exception';
import TypeException from '../runtime/TypeException';
import type { Replacement } from './Node';
import type Translation from '../translation/Translation';
import UnimplementedException from '../runtime/UnimplementedException';
import NodeLink from '../translation/NodeLink';

export default class Insert extends Expression {
    readonly table: Expression;
    readonly insert: Token;
    readonly row: Row;

    constructor(table: Expression, insert: Token, row: Row) {
        super();

        this.table = table;
        this.insert = insert;
        this.row = row;

        this.computeChildren();
    }

    getGrammar() {
        return [
            {
                name: 'table',
                types: [Expression],
                label: (translation: Translation) => translation.data.table,
            },
            { name: 'insert', types: [Token] },
            {
                name: 'row',
                types: [Row],
                label: (translation: Translation) => translation.data.row,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Insert(
            this.replaceChild('table', this.table, replace),
            this.replaceChild('insert', this.insert, replace),
            this.replaceChild('row', this.row, replace)
        ) as this;
    }

    getScopeOfChild(child: Node, context: Context): Node | undefined {
        // The row's scope is the table (because the row's names must be defined in the table).
        return child === this.row
            ? this.getType(context)
            : this.getParent(context);
    }

    computeConflicts(context: Context): Conflict[] {
        let conflicts: Conflict[] = [];

        const tableType = this.table.getType(context);

        // Table must be table typed.
        if (!(tableType instanceof TableType))
            return [new NotATable(this, tableType)];

        // Check the row for conflicts.
        conflicts = conflicts.concat(analyzeRow(tableType, this.row, context));

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
        return [this.table, ...this.row.cells.map((cell) => cell)];
    }

    compile(context: Context): Step[] {
        const tableType = this.table.getType(context);

        return [
            new Start(this),
            ...this.table.compile(context),
            ...(!(tableType instanceof TableType)
                ? [
                      new Halt(
                          (evaluator) =>
                              new TypeException(
                                  evaluator,
                                  TableType.make([]),
                                  evaluator.popValue(this)
                              ),
                          this
                      ),
                  ]
                : this.row.allExpressions()
                ? // It's all expresssions, compile all of them in order.
                  this.row.cells.reduce(
                      (steps: Step[], cell) => [
                          ...steps,
                          ...cell.compile(context),
                      ],
                      []
                  )
                : // Otherwise, loop through the required columns, finding the corresponding bind, and compiling it's expression, or the default if not found.
                  tableType.columns.reduce((steps: Step[], column) => {
                      const matchingCell: Expression | undefined =
                          this.row.cells.find(
                              (cell) =>
                                  column instanceof Bind &&
                                  cell instanceof Bind &&
                                  column.sharesName(cell)
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
                                          this
                                      ),
                                  this
                              ),
                          ];
                      return [...steps, ...matchingCell.value.compile(context)];
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
            if (value instanceof Exception) return value;
            else values.unshift(value);
        }

        const table = evaluator.popValue(this, TableType.make([]));
        if (!(table instanceof Table)) return table;

        // Return a new table with the values.
        return table.insert(values);
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
        return current;
    }

    getStart() {
        return this.insert;
    }
    getFinish() {
        return this.insert;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.Insert;
    }

    getStartExplanations(translation: Translation, context: Context) {
        return translation.nodes.Insert.start(
            new NodeLink(this.table, translation, context)
        );
    }

    getFinishExplanations(
        translation: Translation,
        context: Context,
        evaluator: Evaluator
    ) {
        return translation.nodes.Insert.finish(
            this.getValueIfDefined(translation, context, evaluator)
        );
    }
}
