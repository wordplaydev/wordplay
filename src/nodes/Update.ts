import type Node from './Node';
import type Token from './Token';
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
import type Value from '@runtime/Value';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import type Definition from './Definition';
import type TypeSet from './TypeSet';
import UnimplementedException from '@runtime/UnimplementedException';
import type Evaluator from '@runtime/Evaluator';
import { node, type Grammar, type Replacement } from './Node';
import type Locale from '@locale/Locale';
import NodeRef from '@locale/NodeRef';
import Glyphs from '../lore/Glyphs';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import concretize from '../locale/concretize';
import Symbol from './Symbol';
import Purpose from '../concepts/Purpose';

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

    getGrammar(): Grammar {
        return [
            {
                name: 'table',
                kind: node(Expression),
                label: (translation: Locale) => translation.term.table,
            },
            { name: 'update', kind: node(Symbol.Update) },
            {
                name: 'row',
                kind: node(Row),
                label: (translation: Locale) => translation.term.row,
            },
            {
                name: 'query',
                kind: node(Expression),
                label: (translation: Locale) => translation.term.query,
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
