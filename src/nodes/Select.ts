import Token from './Token';
import Expression from './Expression';
import Row from './Row';
import type Conflict from '@conflicts/Conflict';
import UnknownColumn from '@conflicts/UnknownColumn';
import ExpectedSelectName from '@conflicts/ExpectedSelectName';
import NonBooleanQuery from '@conflicts/NonBooleanQuery';
import NotATable from '@conflicts/NotATable';
import type Type from './Type';
import Reference from './Reference';
import TableType from './TableType';
import BooleanType from './BooleanType';
import Bind from '@nodes/Bind';
import type Node from './Node';
import type Value from '@runtime/Value';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import type Definition from './Definition';
import type TypeSet from './TypeSet';
import UnimplementedException from '@runtime/UnimplementedException';
import type Evaluator from '@runtime/Evaluator';
import NotATableType from './NotATableType';
import UnknownNameType from './UnknownNameType';
import type { Replacement } from './Node';
import type Translation from '@translation/Translation';
import NodeLink from '@translation/NodeLink';

export default class Select extends Expression {
    readonly table: Expression;
    readonly select: Token;
    readonly row: Row;
    readonly query: Expression;

    constructor(table: Expression, select: Token, row: Row, query: Expression) {
        super();

        this.table = table;
        this.select = select;
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
            { name: 'select', types: [Token] },
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
        return new Select(
            this.replaceChild('table', this.table, replace),
            this.replaceChild('select', this.select, replace),
            this.replaceChild('row', this.row, replace),
            this.replaceChild('query', this.query, replace)
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
            conflicts.push(new NotATable(this, tableType));

        // The columns in a select must be names.
        this.row.cells.forEach((cell) => {
            if (!(cell instanceof Reference))
                conflicts.push(new ExpectedSelectName(cell));
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
            conflicts.push(new NonBooleanQuery(this, queryType));

        return conflicts;
    }

    computeType(context: Context): Type {
        // Get the table type and find the rows corresponding the selected columns.
        const tableType = this.table.getType(context);
        if (!(tableType instanceof TableType))
            return new NotATableType(this, tableType);

        // For each cell in the select row, find the corresponding column type in the table type.
        // If we can't find one, return unknown.
        const columnTypes = this.row.cells.map((cell) => {
            const column =
                cell instanceof Reference
                    ? tableType.getColumnNamed(cell.name.text.toString())
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

    compile(context: Context): Step[] {
        // Evaluate the table expression then this.
        return [
            new Start(this),
            ...this.table.compile(context),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator): Value {
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
        if (this.select instanceof Expression)
            this.select.evaluateTypeSet(bind, original, current, context);
        if (this.row instanceof Expression)
            this.row.evaluateTypeSet(bind, original, current, context);
        if (this.query instanceof Expression)
            this.query.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getStart() {
        return this.select;
    }
    getFinish() {
        return this.select;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.Select;
    }

    getStartExplanations(translation: Translation, context: Context) {
        return translation.nodes.Select.start(
            new NodeLink(this.table, translation, context)
        );
    }

    getFinishExplanations(
        translation: Translation,
        context: Context,
        evaluator: Evaluator
    ) {
        return translation.nodes.Select.finish(
            this.getValueIfDefined(translation, context, evaluator)
        );
    }
}
