import Row, { getRowFromValues } from './Row';
import type Conflict from '@conflicts/Conflict';
import Expression from './Expression';
import TableType from './TableType';
import Bind from './Bind';
import type Node from './Node';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import TableValue from '@values/TableValue';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Context from './Context';
import type TypeSet from './TypeSet';
import { node, type Grammar, type Replacement, list } from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import concretize from '../locale/concretize';
import StructureValue from '../values/StructureValue';
import MissingCell from '../conflicts/MissingCell';
import IncompatibleCellType from '../conflicts/IncompatibleCellType';
import ExtraCell from '../conflicts/ExtraCell';
import UnexpectedColumnBind from '../conflicts/UnexpectedColumnBind';
import type Type from './Type';

export default class TableLiteral extends Expression {
    readonly type: TableType;
    readonly rows: Row[];

    constructor(type: TableType, rows: Row[]) {
        super();

        this.type = type;
        this.rows = rows;

        this.computeChildren();
    }

    static make() {
        return new TableLiteral(TableType.make(), [Row.make()]);
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'type',
                kind: node(TableType),
                label: (translation: Locale) => translation.term.table,
            },
            { name: 'rows', kind: list(node(Row)) },
        ];
    }

    static getPossibleNodes(
        type: Type | undefined,
        anchor: Node,
        selected: boolean
    ) {
        return type === undefined && !selected ? [TableLiteral.make()] : [];
    }

    getPurpose() {
        return Purpose.Value;
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        // Validate each row.
        const type = this.getType(context);
        if (type instanceof TableType) {
            for (const row of this.rows) {
                // Copy the cells
                const cells = row.cells.slice();
                for (const column of type.columns) {
                    const cell = cells.shift();
                    // No cell?
                    if (cell === undefined)
                        conflicts.push(new MissingCell(row, type, column));
                    // Unexpected bind?
                    else if (cell instanceof Bind)
                        conflicts.push(new UnexpectedColumnBind(this, cell));
                    // Incompatible cell?
                    else {
                        const expected = column.getType(context);
                        const given = cell.getType(context);
                        if (!expected.accepts(given, context))
                            conflicts.push(
                                new IncompatibleCellType(
                                    type,
                                    cell,
                                    expected,
                                    given
                                )
                            );
                    }
                }
                // Extra cells?
                for (const extra of cells)
                    conflicts.push(new ExtraCell(extra, type));
            }
        }

        return conflicts;
    }

    computeType(): TableType {
        return this.type;
    }

    /** TableLiterals depend on all of their cells. */
    getDependencies(): Expression[] {
        const dependencies = [];
        for (const row of this.rows)
            for (const cell of row.cells) dependencies.push(cell);
        return dependencies;
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            // Compile all of the rows' cell expressions.
            ...this.rows.reduce(
                (steps: Step[], row) => [
                    ...steps,
                    ...row.cells.reduce(
                        (cells: Step[], cell) => [
                            ...cells,
                            ...cell.compile(context),
                        ],
                        []
                    ),
                ],
                []
            ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const rows: StructureValue[] = [];
        for (let r = 0; r < this.rows.length; r++) {
            // Get the values, building the list in order of appearance.
            const values: Value[] = [];
            for (let c = 0; c < this.rows[r].cells.length; c++)
                values.unshift(evaluator.popValue(this));

            const row = getRowFromValues(evaluator, this, this.type, values);
            if (row instanceof StructureValue) rows.unshift(row);
            else return row;
        }
        return new TableValue(this, this.type, rows);
    }

    clone(replace?: Replacement) {
        return new TableLiteral(
            this.replaceChild('type', this.type, replace),
            this.replaceChild('rows', this.rows, replace)
        ) as this;
    }

    /**
     * Is a binding enclosure of its columns and rows, because it defines columns.
     * */
    getScopeOfChild(child: Node, context: Context): Node | undefined {
        return this.rows.includes(child as Row)
            ? this.type
            : this.getParent(context);
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        this.rows.forEach((row) => {
            if (row instanceof Expression)
                row.evaluateTypeSet(bind, original, current, context);
        });
        return current;
    }

    getStart() {
        return this.type;
    }

    getFinish() {
        return this.rows[this.rows.length - 1] ?? this.type;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.TableLiteral;
    }

    getStartExplanations(locale: Locale) {
        return concretize(locale, locale.node.TableLiteral.start);
    }

    getFinishExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return concretize(
            locale,
            locale.node.TableLiteral.finish,
            this.getValueIfDefined(locale, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Table;
    }

    getDescriptionInputs() {
        return [this.rows.length];
    }
}
