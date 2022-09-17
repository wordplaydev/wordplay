import Column from "./Column";
import Row from "./Row";
import type Conflict from "../conflicts/Conflict";
import { MissingCells } from "../conflicts/MissingCells";
import { ExpectedColumnType } from "../conflicts/ExpectedColumnType";
import { IncompatibleCellType } from "../conflicts/IncompatibleCellType";
import Expression from "./Expression";
import TableType from "./TableType";
import UnknownType from "./UnknownType";
import ColumnType from "./ColumnType";
import Bind from "./Bind";
import type Node from "./Node";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Table from "../runtime/Table";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Action from "../runtime/Start";
import type Context from "./Context";
import type Unparsable from "./Unparsable";
import Token from "./Token";

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

    computeConflicts(context: Context): Conflict[] { 
    
        const conflicts: Conflict[] = [];

        // Columns must all have types.
        this.columns.forEach(column => {
            if(column.bind instanceof Bind && column.bind.getTypeUnlessCycle(context) instanceof UnknownType)
                conflicts.push(new ExpectedColumnType(column))
        });

        // All cells in all rows must match their types.
        this.rows.forEach(row => {
            if(row.cells.length !== this.columns.length)
                conflicts.push(new MissingCells(this.computeType(), row));
            row.cells.forEach((cell, index) => {
                if(cell.expression instanceof Expression || cell.expression instanceof Bind) {
                    if(index >= 0 && index < this.columns.length) {
                       const columnBind = this.columns[index].bind;
                       const bindType = columnBind.getTypeUnlessCycle(context);
                       const cellType = cell.expression.getTypeUnlessCycle(context);
                        if(columnBind instanceof Bind && !cellType.isCompatible(bindType, context))
                            conflicts.push(new IncompatibleCellType(this.computeType(), cell, bindType, cellType));
                    }
                }
            });
        })

        return conflicts; 
    
    }

    computeType(): TableType {
        const columnTypes = this.columns.map(c => new ColumnType(c.bind));
        return new TableType(columnTypes);
    }

    compile(context: Context): Step[] {
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

    clone(original?: Node, replacement?: Node) { 
        return new TableLiteral(
            this.columns.map(c => c.cloneOrReplace([ Column ], original, replacement)), 
            this.rows.map(r => r.cloneOrReplace([ Row ], original, replacement)), 
            this.close.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

}