import type Node from "./Node";
import Token from "./Token";
import Expression from "./Expression";
import Row from "./Row";
import type Conflict from "../conflicts/Conflict";
import UnknownColumn from "../conflicts/UnknownColumn";
import IncompatibleCellType from "../conflicts/IncompatibleCellType";
import ExpectedUpdateBind from "../conflicts/ExpectedUpdateBind";
import NonBooleanQuery from "../conflicts/NonBooleanQuery";
import NotATable from "../conflicts/NotATable";
import type Type from "./Type";
import Unparsable from "./Unparsable";
import Bind from "../nodes/Bind";
import TableType from "./TableType";
import BooleanType from "./BooleanType";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Context from "./Context";
import type Definition from "./Definition";
import type { TypeSet } from "./UnionType";
import UnimplementedException from "../runtime/UnimplementedException";
import type Evaluator from "../runtime/Evaluator";
import { getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Transform from "../transforms/Transform";

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

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) {
        return new Update(
            this.cloneOrReplaceChild(pretty, [ Expression ], "table", this.table, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token ], "update", this.update, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Row ], "row", this.row, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Expression, Unparsable ], "query", this.query, original, replacement)
        ) as this; 
    }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.query; }

    computeChildren() { return [ this.table, this.update, this.row, this.query ]; }

    computeConflicts(context: Context): Conflict[] { 
        
        const conflicts: Conflict[] = [];

        const tableType = this.table.getTypeUnlessCycle(context);

        // Table must be table typed.
        if(!(tableType instanceof TableType)) {
            conflicts.push(new NotATable(this, tableType));
            return conflicts;
        }

        this.row.cells.forEach(cell => {
            // The columns in an update must be binds with expressions.
            if(!(cell.value instanceof Bind && cell.value.value !== undefined && cell.value.names.length === 1))
                conflicts.push(new ExpectedUpdateBind(cell))
            else if(tableType instanceof TableType) {
                const alias = cell.value instanceof Bind && cell.value.names.length > 0 ? cell.value.names[0] : undefined;
                const name = alias === undefined ? undefined : alias.getName();
                const columnType = name === undefined ? undefined : tableType.getColumnNamed(name);
                // The named table column must exist.
                if(columnType === undefined)
                    conflicts.push(new UnknownColumn(tableType, cell));
                // The types of the bound values must match the column types.
                else if(columnType.bind instanceof Bind) {
                    const bindType = columnType.bind.getTypeUnlessCycle(context);
                    const cellType = cell.value.getTypeUnlessCycle(context);
                    if(!bindType.accepts(cellType, context))
                        conflicts.push(new IncompatibleCellType(tableType, cell, bindType, cellType));
                }
            }
        });

        // The query must be truthy.
        const queryType = this.query.getTypeUnlessCycle(context);
        if(this.query instanceof Expression && !(queryType instanceof BooleanType))
            conflicts.push(new NonBooleanQuery(this, queryType))

        return conflicts; 
    
    }

    computeType(context: Context): Type {
        // The type of an update is the type of its table
        return this.table.getTypeUnlessCycle(context);        
    }
    
    getDefinitions(node: Node, context: Context): Definition[] {

        node;
        const type = this.table.getTypeUnlessCycle(context);
        if(type instanceof TableType)
            return type.columns.filter(col => col.bind instanceof Bind).map(col => col.bind) as Bind[];
        else
            return [];

    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            ...this.table.compile(context),
            new Finish(this)
        ];
    }

    getStartExplanations() { 
        return {
            "eng": "First we get the table, then we select values from it."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "Now that we have the table, let's create a new table with the updated values."
        }
    }

    evaluate(evaluator: Evaluator): Value {
        return new UnimplementedException(evaluator);
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.table instanceof Expression) this.table.evaluateTypeSet(bind, original, current, context);
        if(this.update instanceof Expression) this.update.evaluateTypeSet(bind, original, current, context);
        if(this.row instanceof Expression) this.row.evaluateTypeSet(bind, original, current, context);
        if(this.query instanceof Expression) this.query.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getDescriptions() {
        return {
            eng: "Update rows in a table"
        }
    }

    getReplacementChild() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

}