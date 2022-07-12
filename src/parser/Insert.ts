import type Node from "./Node";
import type { Token } from "./Token";
import Expression from "./Expression";
import type Row from "./Row";
import type Program from "./Program";
import Conflict from "./Conflict";
import Type from "./Type";
import TableType from "./TableType";
import { SemanticConflict } from "./SemanticConflict";
import type TypeVariable from "./TypeVariable";
import Bind from "./Bind";

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
            conflicts.push(new Conflict(this, SemanticConflict.NOT_A_TABLE));
        // The row must have all of the table type's columns.
        else if(tableType.columns.length !== this.row.cells.length)
            conflicts.push(new Conflict(this, SemanticConflict.INSERT_REQUIRES_ALL_COLUMNS));
        // The row types must match the column types
        else {
            this.row.cells.forEach((cell, index) => {
                const expr = cell.expression;
                if(!(expr instanceof Expression))
                    conflicts.push(new Conflict(this, SemanticConflict.INSERT_COLUMNS_MUST_BE_EXPRESSIONS));
                else if(index < tableType.columns.length) {
                    const columnType = tableType.columns[index].bind;
                    if(columnType instanceof Type && !expr.getType(program).isCompatible(program, columnType))
                        conflicts.push(new Conflict(cell, SemanticConflict.CELL_TYPE_MISMATCH));
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
    
}