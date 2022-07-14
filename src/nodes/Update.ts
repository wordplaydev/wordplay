import type Node from "./Node";
import type Token from "./Token";
import Expression from "./Expression";
import type Row from "./Row";
import type Program from "./Program";
import Conflict, { ExpectedUpdateBind, IncompatibleCellType, NonBooleanQuery, NotATable, UnknownColumn } from "../parser/Conflict";
import type Type from "./Type";
import type Unparsable from "./Unparsable";
import Bind from "../nodes/Bind";
import TableType from "./TableType";
import BooleanType from "./BooleanType";
import type TypeVariable from "./TypeVariable";

export default class Update extends Expression {
    
    readonly table: Expression;
    readonly update: Token;
    readonly row: Row;
    readonly query: Expression | Unparsable;

    constructor(table: Expression, update: Token, row: Row, query: Expression | Unparsable) {
        super();

        this.table = table;
        this.update = update;
        this.row = row;
        this.query = query;

    }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.query; }

    getChildren() { return [ this.table, this.update, this.row, this.query ]; }

    getConflicts(program: Program): Conflict[] { 
        
        const conflicts: Conflict[] = [];

        const tableType = this.table.getType(program);

        // Table must be table typed.
        if(!(tableType instanceof TableType)) {
            conflicts.push(new NotATable(this));
            return conflicts;
        }

        this.row.cells.forEach(cell => {
            // The columns in an update must be binds with expressions.
            if(!(cell.expression instanceof Bind && cell.expression.value !== undefined && cell.expression.names.length === 1))
                conflicts.push(new ExpectedUpdateBind(cell))
            else if(tableType instanceof TableType) {
                const columnType = tableType.getColumnNamed(cell.expression.names[0].name.text);
                // The named table column must exist.
                if(columnType === undefined)
                    conflicts.push(new UnknownColumn(tableType, cell));
                // The types of the bound values must match the column types.
                else if(columnType.bind instanceof Bind) {
                    if(!columnType.bind.getType(program).isCompatible(program, cell.expression.getType(program)))
                        conflicts.push(new IncompatibleCellType(tableType, cell));
                }
            }
        });

        // The query must be truthy.
        if(this.query instanceof Expression && !(this.query.getType(program) instanceof BooleanType))
            conflicts.push(new NonBooleanQuery(this))

        return conflicts; 
    
    }

    getType(program: Program): Type {
        // The type of an update is the type of its table
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