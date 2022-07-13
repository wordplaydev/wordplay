import type Node from "./Node";
import type Token from "./Token";
import Expression from "./Expression";
import type Program from "./Program";
import Conflict, { NonBooleanQuery, NotATable } from "./Conflict";
import type Type from "./Type";
import type Unparsable from "./Unparsable";
import BooleanType from "./BooleanType";
import TableType from "./TableType";
import type TypeVariable from "./TypeVariable";
import Bind from "./Bind";

export default class Delete extends Expression {
    
    readonly table: Expression;
    readonly del: Token;
    readonly query: Expression | Unparsable;

    constructor(table: Expression, del: Token, query: Expression | Unparsable) {
        super();

        this.table = table;
        this.del = del;
        this.query = query;

    }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.query; }

    getChildren() { return [ this.table, this.del, this.query ]; }

    getConflicts(program: Program): Conflict[] { 

        const conflicts: Conflict[] = [];
        
        const tableType = this.table.getType(program);

        // Table must be table typed.
        if(!(tableType instanceof TableType))
            conflicts.push(new NotATable(this));

        // The query must be truthy.
        if(this.query instanceof Expression && !(this.query.getType(program) instanceof BooleanType))
            conflicts.push(new NonBooleanQuery(this))

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