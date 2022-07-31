import type Node from "./Node";
import type Token from "./Token";
import Expression from "./Expression";
import Conflict, { NonBooleanQuery, NotATable } from "../parser/Conflict";
import type Type from "./Type";
import type Unparsable from "./Unparsable";
import BooleanType from "./BooleanType";
import TableType from "./TableType";
import type TypeVariable from "./TypeVariable";
import Bind from "../nodes/Bind";
import Exception, { ExceptionType } from "../runtime/Exception";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import Start from "../runtime/Start";
import type { ConflictContext, Definition } from "./Node";

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

    getConflicts(context: ConflictContext): Conflict[] { 

        const conflicts: Conflict[] = [];
        
        const tableType = this.table.getType(context);

        // Table must be table typed.
        if(!(tableType instanceof TableType))
            conflicts.push(new NotATable(this));

        // The query must be truthy.
        if(this.query instanceof Expression && !(this.query.getType(context) instanceof BooleanType))
            conflicts.push(new NonBooleanQuery(this))

        return conflicts; 
        
    }

    getType(context: ConflictContext): Type {
        // The type is identical to the table's type.
        return this.table.getType(context);
    }

    // Check the table's column binds.
    getDefinition(context: ConflictContext, node: Node, name: string): Definition {
        
        const type = this.table.getType(context);
        if(type instanceof TableType) {
            const column = type.getColumnNamed(name);
            if(column !== undefined && column.bind instanceof Bind) return column.bind;
        }

        return context.program.getBindingEnclosureOf(this)?.getDefinition(context, node, name);

    }

    compile(): Step[] {
        return [ new Start(this), ...this.table.compile(), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {
        return new Exception(ExceptionType.NOT_IMPLEMENTED);
    }

}