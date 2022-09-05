import type Node from "./Node";
import type Token from "./Token";
import Expression from "./Expression";
import type Row from "./Row";
import type Conflict from "../conflicts/Conflict";
import { UnknownColumn } from "../conflicts/UnknownColumn";
import { IncompatibleCellType } from "../conflicts/IncompatibleCellType";
import { ExpectedUpdateBind } from "../conflicts/ExpectedUpdateBind";
import { NonBooleanQuery } from "../conflicts/NonBooleanQuery";
import { NotATable } from "../conflicts/NotATable";
import type Type from "./Type";
import type Unparsable from "./Unparsable";
import Bind from "../nodes/Bind";
import TableType from "./TableType";
import BooleanType from "./BooleanType";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Action from "../runtime/Start";
import type { ConflictContext } from "./Node";
import type Definition from "./Definition";

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

    getConflicts(context: ConflictContext): Conflict[] { 
        
        const conflicts: Conflict[] = [];

        const tableType = this.table.getTypeUnlessCycle(context);

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
                const alias = cell.expression instanceof Bind && cell.expression.names.length > 0 ? cell.expression.names[0] : undefined;
                const name = alias === undefined ? undefined : alias.getName();
                const columnType = name === undefined ? undefined : tableType.getColumnNamed(name);
                // The named table column must exist.
                if(columnType === undefined)
                    conflicts.push(new UnknownColumn(tableType, cell));
                // The types of the bound values must match the column types.
                else if(columnType.bind instanceof Bind) {
                    if(!columnType.bind.getTypeUnlessCycle(context).isCompatible(context, cell.expression.getTypeUnlessCycle(context)))
                        conflicts.push(new IncompatibleCellType(tableType, cell));
                }
            }
        });

        // The query must be truthy.
        if(this.query instanceof Expression && !(this.query.getTypeUnlessCycle(context) instanceof BooleanType))
            conflicts.push(new NonBooleanQuery(this))

        return conflicts; 
    
    }

    getType(context: ConflictContext): Type {
        // The type of an update is the type of its table
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
        return [
            new Action(this),
            ...this.table.compile(context),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value {
        return new Exception(this, ExceptionKind.NOT_IMPLEMENTED);
    }
}