import type Column from "./Column";
import type Row from "./Row";
import type Program from "./Program";
import Conflict, { ExpectedColumnType, IncompatibleCellType, MissingCells } from "../parser/Conflict";
import Expression from "./Expression";
import TableType from "./TableType";
import UnknownType from "./UnknownType";
import ColumnType from "./ColumnType";
import Bind from "./Bind";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import type Node from "./Node";
import type { Evaluable } from "../runtime/Evaluation";
import Table from "../runtime/Table";
import Exception, { ExceptionType } from "../runtime/Exception";
import type Unparsable from "./Unparsable";

export default class TableLiteral extends Expression {
    
    readonly columns: Column[];
    readonly rows: Row[];
    readonly expressions: (Expression|Unparsable|Bind)[];

    constructor(columns: Column[], rows: Row[]) {
        super();

        this.columns = columns;
        this.rows = rows;

        // A convenient representation of all cell expressions in order.
        let expressions: (Expression|Unparsable|Bind)[] = [];
        this.rows.forEach(r => r.cells.forEach(c => expressions.push(c.expression)));
        this.expressions = expressions;
    
    }

    getChildren() { return [ ...this.columns, ...this.rows ]; }

    getConflicts(program: Program): Conflict[] { 
    
        const conflicts: Conflict[] = [];

        // Columns must all have types.
        this.columns.forEach(column => {
            if(column.bind instanceof Bind && column.bind.getType(program) instanceof UnknownType)
                conflicts.push(new ExpectedColumnType(column))
        });

        // All cells in all rows must match their types.
        this.rows.forEach(row => {
            if(row.cells.length !== this.columns.length)
                conflicts.push(new MissingCells(row));
            row.cells.forEach((cell, index) => {
                if(cell.expression instanceof Expression || cell.expression instanceof Bind) {
                    if(index <= this.columns.length) {
                       const columnBind = this.columns[index].bind;
                        if(columnBind instanceof Bind && !columnBind.getType(program).isCompatible(program, cell.expression.getType(program)))
                            conflicts.push(new IncompatibleCellType(this.getType(program), cell));
                    }
                }
            });
        })

        return conflicts; 
    
    }

    getType(program: Program): TableType {
        const columnTypes = this.columns.map(c => new ColumnType(c.bind));
        return new TableType(columnTypes);
    }

    evaluate(evaluator: Evaluator): Node | Value {
        
        if(this.expressions.length === 0) return new Table([]);

        const lastExpression = evaluator.lastEvaluated();
        const index = 
            lastExpression === undefined ? -1 : 
            lastExpression instanceof Expression ? this.expressions.indexOf(lastExpression) :
            -1;

        if(index < this.expressions.length - 1) return this.expressions[index + 1];
        else {
            const values: Value[] = [];
            for(let i = 0; i < this.expressions.length; i++) values.unshift(evaluator.popValue());
            const rows: Value[][] = [];
            for(let r = 0; r < this.rows.length; r++) {
                const row: Value[] = [];
                for(let c = 0; c < this.columns.length; c++) {
                    const cell = values.shift();
                    if(cell === undefined) return new Exception(ExceptionType.EXPECTED_VALUE);
                    else row.push(cell);
                }
                rows.push(row);
            }
            return new Table(rows);
        }

    }

}