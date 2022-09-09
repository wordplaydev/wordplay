import type Column from "./Column";
import type Row from "./Row";
import type Conflict from "../conflicts/Conflict";
import { MissingCells } from "../conflicts/MissingCells";
import { ExpectedColumnType } from "../conflicts/ExpectedColumnType";
import { IncompatibleCellType } from "../conflicts/IncompatibleCellType";
import Expression from "./Expression";
import TableType from "./TableType";
import UnknownType from "./UnknownType";
import ColumnType from "./ColumnType";
import Bind from "./Bind";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Table from "../runtime/Table";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Action from "../runtime/Start";
import type { ConflictContext } from "./Node";
import type Unparsable from "./Unparsable";
import type Token from "./Token";

export default class TableLiteral extends Expression {
    
    readonly columns: Column[];
    readonly close: Token | Unparsable;
    readonly rows: Row[];

    constructor(columns: Column[], rows: Row[], close: Token | Unparsable) {
        super();

        this.columns = columns;
        this.close = close;
        this.rows = rows;
    
    }

    computeChildren() { return [ ...this.columns, this.close, ...this.rows ]; }

    getConflicts(context: ConflictContext): Conflict[] { 
    
        const conflicts: Conflict[] = [];

        // Columns must all have types.
        this.columns.forEach(column => {
            if(column.bind instanceof Bind && column.bind.getTypeUnlessCycle(context) instanceof UnknownType)
                conflicts.push(new ExpectedColumnType(column))
        });

        // All cells in all rows must match their types.
        this.rows.forEach(row => {
            if(row.cells.length !== this.columns.length)
                conflicts.push(new MissingCells(row));
            row.cells.forEach((cell, index) => {
                if(cell.expression instanceof Expression || cell.expression instanceof Bind) {
                    if(index >= 0 && index < this.columns.length) {
                       const columnBind = this.columns[index].bind;
                        if(columnBind instanceof Bind && !columnBind.getTypeUnlessCycle(context).isCompatible(context, cell.expression.getTypeUnlessCycle(context)))
                            conflicts.push(new IncompatibleCellType(this.getType(context), cell));
                    }
                }
            });
        })

        return conflicts; 
    
    }

    computeType(context: ConflictContext): TableType {
        const columnTypes = this.columns.map(c => new ColumnType(c.bind));
        return new TableType(columnTypes);
    }

    compile(context: ConflictContext): Step[] {
        return [
            new Action(this),
            // Compile all of the row's 's cells expressions.
            ...this.rows.reduce((rows: Step[], row) =>
                row.cells.reduce((cells: Step[], cell) => [...cells, ...cell.expression.compile(context)], []), 
                []
            ),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value {
        
        const rows: Value[][] = [];
        for(let r = 0; r < this.rows.length; r++) {
            const row: Value[] = [];
            for(let c = 0; c < this.columns.length; c++) {
                const cell = evaluator.popValue();
                if(cell === undefined) return new Exception(this, ExceptionKind.EXPECTED_VALUE);
                else row.unshift(cell);
            }
            rows.unshift(row);
        }
        return new Table(this, rows);

    }

}