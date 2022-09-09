import type Node from "./Node";
import type Token from "./Token";
import Expression from "./Expression";
import type Conflict from "../conflicts/Conflict";
import { NonBooleanQuery } from "../conflicts/NonBooleanQuery";
import { NotATable } from "../conflicts/NotATable";
import type Type from "./Type";
import type Unparsable from "./Unparsable";
import BooleanType from "./BooleanType";
import TableType from "./TableType";
import Bind from "../nodes/Bind";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import Action from "../runtime/Start";
import type { ConflictContext } from "./Node";
import type Definition from "./Definition";

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

    computeChildren() { return [ this.table, this.del, this.query ]; }

    getConflicts(context: ConflictContext): Conflict[] { 

        const conflicts: Conflict[] = [];
        
        const tableType = this.table.getTypeUnlessCycle(context);

        // Table must be table typed.
        if(!(tableType instanceof TableType))
            conflicts.push(new NotATable(this));

        // The query must be truthy.
        if(this.query instanceof Expression && !(this.query.getTypeUnlessCycle(context) instanceof BooleanType))
            conflicts.push(new NonBooleanQuery(this))

        return conflicts; 
        
    }

    computeType(context: ConflictContext): Type {
        // The type is identical to the table's type.
        return this.table.getTypeUnlessCycle(context);
    }

    // Check the table's column binds.
    getDefinition(context: ConflictContext, node: Node, name: string): Definition {
        
        const type = this.table.getTypeUnlessCycle(context);
        if(type instanceof TableType) {
            const column = type.getColumnNamed(name);
            if(column !== undefined && column.bind instanceof Bind) return column.bind;
        }

        return context.program.getBindingEnclosureOf(this)?.getDefinition(context, node, name);

    }

    compile(context: ConflictContext):Step[] {
        return [ new Action(this), ...this.table.compile(context), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {
        return new Exception(this, ExceptionKind.NOT_IMPLEMENTED);
    }

}