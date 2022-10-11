import type Node from "./Node";
import Token from "./Token";
import Expression from "./Expression";
import type Conflict from "../conflicts/Conflict";
import NonBooleanQuery from "../conflicts/NonBooleanQuery";
import NotATable from "../conflicts/NotATable";
import type Type from "./Type";
import Unparsable from "./Unparsable";
import BooleanType from "./BooleanType";
import TableType from "./TableType";
import Bind from "../nodes/Bind";
import type Value from "../runtime/Value";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import Start from "../runtime/Start";
import type Context from "./Context";
import type Definition from "./Definition";
import type { TypeSet } from "./UnionType";
import UnimplementedException from "../runtime/UnimplementedException";
import type Evaluator from "../runtime/Evaluator";

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

    computeConflicts(context: Context): Conflict[] { 

        const conflicts: Conflict[] = [];
        
        const tableType = this.table.getTypeUnlessCycle(context);

        // Table must be table typed.
        if(!(tableType instanceof TableType))
            conflicts.push(new NotATable(this, tableType));

        // The query must be truthy.
        const queryType = this.query.getTypeUnlessCycle(context);
        if(this.query instanceof Expression && !(queryType instanceof BooleanType))
            conflicts.push(new NonBooleanQuery(this, queryType))

        return conflicts; 
        
    }

    computeType(context: Context): Type {
        // The type is identical to the table's type.
        return this.table.getTypeUnlessCycle(context);
    }

    // Check the table's column binds.
    getDefinition(name: string, context: Context, node: Node): Definition {
        
        const type = this.table.getTypeUnlessCycle(context);
        if(type instanceof TableType) {
            const column = type.getColumnNamed(name);
            if(column !== undefined && column.bind instanceof Bind) return column.bind;
        }

        return this.getBindingEnclosureOf()?.getDefinition(name, context, node);

    }

    compile(context: Context):Step[] {
        return [ new Start(this), ...this.table.compile(context), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {
        return new UnimplementedException(evaluator);
    }

    getStartExplanations() { 
        return {
            "eng": "First evaluate the table."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "Now make a table without the matching rows."
        }
    }

    clone(original?: Node, replacement?: Node) { 
        return new Delete(
            this.table.cloneOrReplace([ Expression ], original, replacement), 
            this.del.cloneOrReplace([ Token ], original, replacement), 
            this.query.cloneOrReplace([ Expression, Unparsable ], original, replacement)
        ) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.table instanceof Expression) this.table.evaluateTypeSet(bind, original, current, context);
        if(this.query instanceof Expression) this.query.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getDescriptions() {
        return {
            eng: "Delete a row from a table"
        }
    }

}