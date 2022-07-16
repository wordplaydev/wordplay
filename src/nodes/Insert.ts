import type Node from "./Node";
import type Token from "./Token";
import Expression from "./Expression";
import type Row from "./Row";
import type Program from "./Program";
import Conflict, { IncompatibleCellType, MissingColumns, NotATable } from "../parser/Conflict";
import TableType from "./TableType";
import type TypeVariable from "./TypeVariable";
import Bind from "../nodes/Bind";
import type Type from "./Type";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Exception, { ExceptionType } from "../runtime/Exception";
import Table from "../runtime/Table";

export default class Insert extends Expression {
    
    readonly table: Expression;
    readonly insert: Token;
    readonly row: Row;

    constructor(table: Expression, insert: Token, row: Row) {
        super();

        this.table = table;
        this.insert = insert;
        this.row = row;

    }
    
    isBindingEnclosureOfChild(child: Node): boolean { return child === this.row; }

    getChildren() { return [ this.table, this.insert, this.row ]; }

    getConflicts(program: Program): Conflict[] { 
     
        const conflicts = [];

        const tableType = this.table.getType(program);

        // Table must be table typed.
        if(!(tableType instanceof TableType))
            conflicts.push(new NotATable(this));
        // The row must have all of the table type's columns.
        else if(tableType.columns.length !== this.row.cells.length)
            conflicts.push(new MissingColumns(this));
        // The row types must match the column types
        else {
            this.row.cells.forEach((cell, index) => {
                const expr = cell.expression;
                if(expr instanceof Expression && index < tableType.columns.length) {
                    const columnBind = tableType.columns[index].bind;
                    if(columnBind instanceof Bind && !expr.getType(program).isCompatible(program, columnBind.getType(program)))
                        conflicts.push(new IncompatibleCellType(tableType, cell));
                }
            });
        }

        return conflicts; 
    
    }

    getType(program: Program): Type {
        // The type is identical to the table's type.
        return this.table.getType(program);
    }

    // Check the table's column binds.
    getDefinition(program: Program, node: Node, name: string): Expression | TypeVariable | Bind | undefined {
    
        const type = this.table.getType(program);
        if(type instanceof TableType) {
            const column = type.getColumnNamed(name);
            if(column !== undefined && column.bind instanceof Bind) return column.bind;
        }

        return program.getBindingEnclosureOf(this)?.getDefinition(program, node, name);

    }

    evaluate(evaluator: Evaluator): Value | Node {

        const nodeLastEvaluated = evaluator.lastEvaluated();

        // Haven't started? Evaluate the table.
        if(nodeLastEvaluated !== this.table && this.row.cells.find(c => c.expression === nodeLastEvaluated) === undefined)
            return this.table;
        
        // Just finished the table? First cell's expression.
        if(nodeLastEvaluated === this.table && this.row.cells.length > 0)
            return this.row.cells[0].expression;
        
        // Next cell's expression.
        const lastCell = this.row.cells.find(c => c.expression === nodeLastEvaluated);
        if(lastCell !== undefined && lastCell.expression !== this.row.cells[this.row.cells.length - 1].expression)
            return this.row.cells[this.row.cells.indexOf(lastCell) + 1].expression;

        // We've got a table and some cells, insert the row!
        const values: Value[] = [];
        for(let i = 0; i < this.row.cells.length; i++) {
            const value = evaluator.popValue();
            if(value === undefined) return new Exception(ExceptionType.EXPECTED_VALUE);
            else values.unshift(value);
        }

        const table = evaluator.popValue();
        if(table === undefined) return new Exception(ExceptionType.EXPECTED_VALUE);
        else if(!(table instanceof Table)) return new Exception(ExceptionType.INCOMPATIBLE_TYPE);

        // Return a new table with the values.
        return table.insert(values);

    }

}