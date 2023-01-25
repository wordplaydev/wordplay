import type Node from './Node';
import Token from './Token';
import Expression from './Expression';
import Row from './Row';
import type Conflict from '@conflicts/Conflict';
import UnknownColumn from '@conflicts/UnknownColumn';
import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import ExpectedUpdateBind from '@conflicts/ExpectedUpdateBind';
import NonBooleanQuery from '@conflicts/NonBooleanQuery';
import NotATable from '@conflicts/NotATable';
import type Type from './Type';
import Bind from '@nodes/Bind';
import TableType from './TableType';
import BooleanType from './BooleanType';
import type Value from '@runtime/Value';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import type Definition from './Definition';
import type TypeSet from './TypeSet';
import UnimplementedException from '@runtime/UnimplementedException';
import type Evaluator from '@runtime/Evaluator';
import type { Replacement } from './Node';
import type Translation from '@translation/Translation';
import NodeLink from '@translation/NodeLink';

export default class Update extends Expression {
    readonly table: Expression;
    readonly update: Token;
    readonly row: Row;
    readonly query: Expression;

    constructor(table: Expression, update: Token, row: Row, query: Expression) {
        super();

        this.table = table;
        this.update = update;
        this.row = row;
        this.query = query;

        this.computeChildren();
    }

    getGrammar() {
        return [
            {
                name: 'table',
                types: [Expression],
                label: (translation: Translation) => translation.data.table,
            },
            { name: 'update', types: [Token] },
            {
                name: 'row',
                types: [Row],
                label: (translation: Translation) => translation.data.row,
            },
            {
                name: 'query',
                types: [Expression],
                label: (translation: Translation) => translation.data.query,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Update(
            this.replaceChild('table', this.table, replace),
            this.replaceChild('update', this.update, replace),
            this.replaceChild('row', this.row, replace),
            this.replaceChild('query', this.query, replace)
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
        if (!(tableType instanceof TableType)) {
            conflicts.push(new NotATable(this, tableType));
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
                conflicts.push(new ExpectedUpdateBind(cell));
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
            conflicts.push(new NonBooleanQuery(this, queryType));

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
        return [
            new Start(this),
            ...this.table.compile(context),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;
        return new UnimplementedException(evaluator, this);
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        if (this.table instanceof Expression)
            this.table.evaluateTypeSet(bind, original, current, context);
        if (this.update instanceof Expression)
            this.update.evaluateTypeSet(bind, original, current, context);
        if (this.row instanceof Expression)
            this.row.evaluateTypeSet(bind, original, current, context);
        if (this.query instanceof Expression)
            this.query.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getStart() {
        return this.update;
    }
    getFinish() {
        return this.update;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.Update;
    }

    getStartExplanations(translation: Translation, context: Context) {
        return translation.nodes.Update.start(
            new NodeLink(this.table, translation, context)
        );
    }

    getFinishExplanations(
        translation: Translation,
        context: Context,
        evaluator: Evaluator
    ) {
        return translation.nodes.Update.finish(
            this.getValueIfDefined(translation, context, evaluator)
        );
    }
}
