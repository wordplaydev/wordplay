import type Column from "./Column";
import type Row from "./Row";
import type Program from "./Program";
import Conflict, { ExpectedColumnType, IncompatibleCellType, MissingCells } from "../parser/Conflict";
import Expression from "./Expression";
import TableType from "./TableType";
import UnknownType from "./UnknownType";
import ColumnType from "./ColumnType";
import Bind from "../nodes/Bind";

export default class Table extends Expression {
    
    readonly columns: Column[];
    readonly rows: Row[];

    constructor(columns: Column[], rows: Row[]) {
        super();

        this.columns = columns;
        this.rows = rows;
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

}