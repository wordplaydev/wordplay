import Row from './Row';
import type Conflict from '../conflicts/Conflict';
import Expression from './Expression';
import TableType from './TableType';
import type Bind from './Bind';
import type Node from './Node';
import type Evaluator from '../runtime/Evaluator';
import type Value from '../runtime/Value';
import Table from '../runtime/Table';
import type Step from '../runtime/Step';
import Finish from '../runtime/Finish';
import Start from '../runtime/Start';
import type Context from './Context';
import type TypeSet from './TypeSet';
import { analyzeRow } from './util';
import Exception from '../runtime/Exception';
import type { Replacement } from './Node';
import type Translation from '../translations/Translation';

export default class TableLiteral extends Expression {
    readonly type: TableType;
    readonly rows: Row[];

    constructor(type: TableType, rows: Row[]) {
        super();

        this.type = type;
        this.rows = rows;

        this.computeChildren();
    }

    getGrammar() {
        return [
            {
                name: 'type',
                types: [TableType],
                label: (translation: Translation) => translation.data.table,
            },
            { name: 'rows', types: [[Row]] },
        ];
    }

    computeConflicts(context: Context): Conflict[] {
        let conflicts: Conflict[] = [];

        // Validate each row.
        const type = this.getType(context);
        if (type instanceof TableType) {
            for (const row of this.rows)
                conflicts = conflicts.concat(analyzeRow(type, row, context));
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

        const rows: Value[][] = [];
        for (let r = 0; r < this.rows.length; r++) {
            const row: Value[] = [];
            for (let c = 0; c < this.type.columns.length; c++) {
                const cell = evaluator.popValue(undefined);
                if (cell instanceof Exception) return cell;
                else row.unshift(cell);
            }
            rows.unshift(row);
        }
        return new Table(this, rows);
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

    getDescription(translation: Translation) {
        return translation.expressions.TableLiteral.description;
    }

    getStartExplanations(translation: Translation) {
        return translation.expressions.TableLiteral.start;
    }

    getFinishExplanations(translation: Translation) {
        return translation.expressions.TableLiteral.finish;
    }
}
