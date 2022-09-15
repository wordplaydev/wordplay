import Token from "./Token";
import Expression from "./Expression";
import Row from "./Row";
import type Conflict from "../conflicts/Conflict";
import { UnknownColumn } from "../conflicts/UnknownColumn";
import { ExpectedSelectName } from "../conflicts/ExpectedSelectName";
import { NonBooleanQuery } from "../conflicts/NonBooleanQuery";
import { NotATable } from "../conflicts/NotATable";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import Name from "./Name";
import TableType from "./TableType";
import type ColumnType from "./ColumnType";
import BooleanType from "./BooleanType";
import Bind from "../nodes/Bind";
import type Node from "./Node";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Action from "../runtime/Start";
import type { ConflictContext } from "./Node";
import type Definition from "./Definition";

export default class Select extends Expression {
    
    readonly table: Expression;
    readonly select: Token;
    readonly row: Row;
    readonly query: Expression | Unparsable;

    constructor(table: Expression, select: Token, row: Row, query: Expression | Unparsable) {
        super();

        this.table = table;
        this.select = select;
        this.row = row;
        this.query = query;

    }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.query || child === this.row; }
    
    computeChildren() { return [ this.table, this.select, this.row, this.query ]; }

    computeConflicts(context: ConflictContext): Conflict[] { 
        
        const conflicts: Conflict[] = [];

        const tableType = this.table.getTypeUnlessCycle(context);

        // Table must be table typed.
        if(!(tableType instanceof TableType))
            conflicts.push(new NotATable(this, tableType));

        // The columns in a select must be names.
        this.row.cells.forEach(cell => {
            if(!(cell.expression instanceof Name))
                conflicts.push(new ExpectedSelectName(cell))
        });

        // The columns named must be names in the table's type.
        if(tableType instanceof TableType) {
            this.row.cells.forEach(cell => {
                const cellName = cell.expression instanceof Name ? cell.expression : undefined; 
                if(!(cellName !== undefined && tableType.getColumnNamed(cellName.name.text.toString()) !== undefined))
                    conflicts.push(new UnknownColumn(tableType, cell));
            });
        }

        // The query must be truthy.
        const queryType = this.query.getTypeUnlessCycle(context);
        if(this.query instanceof Expression && !(queryType instanceof BooleanType))
            conflicts.push(new NonBooleanQuery(this, queryType))
    
        return conflicts;
    
    }

    computeType(context: ConflictContext): Type {

        // Get the table type and find the rows corresponding the selected columns.
        const tableType = this.table.getTypeUnlessCycle(context);
        if(!(tableType instanceof TableType)) return new UnknownType(this);

        // For each cell in the select row, find the corresponding column type in the table type.
        // If we can't find one, return unknown.
        const columnTypes = this.row.cells.map(cell => {
            const column = cell.expression instanceof Name ? tableType.getColumnNamed(cell.expression.name.text.toString()) : undefined; 
            return column === undefined ? undefined : column;
        });
        if(columnTypes.find(t => t === undefined)) return new UnknownType(this);

        return new TableType(columnTypes as ColumnType[]);

    }

    // Check the table's column binds.
    getDefinition(context: ConflictContext, node: Node, name: string): Definition {
        
        const type = this.table.getTypeUnlessCycle(context);
        if(type instanceof TableType) {
            const column = type.getColumnNamed(name);
            if(column !== undefined && column.bind instanceof Bind) return column.bind;
        }

        return this.getBindingEnclosureOf()?.getDefinition(context, node, name);

    }

    compile(context: ConflictContext):Step[] {
        // Evaluate the table expression then this.
        return [ 
            new Action(this),
            ...this.table.compile(context),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value {

        return new Exception(this, ExceptionKind.NOT_IMPLEMENTED);

    }

    clone(original?: Node, replacement?: Node) { 
        return new Select(
            this.table.cloneOrReplace([ Expression ], original, replacement), 
            this.select.cloneOrReplace([ Token ], original, replacement), 
            this.row.cloneOrReplace([ Row ], original, replacement), 
            this.query.cloneOrReplace([ Expression, Unparsable ], original, replacement)
        ) as this; 
    }

}