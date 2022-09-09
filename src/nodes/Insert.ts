import type Node from "./Node";
import type Token from "./Token";
import Expression from "./Expression";
import type Row from "./Row";
import type Conflict from "../conflicts/Conflict";
import { IncompatibleCellType } from "../conflicts/IncompatibleCellType";
import { MissingColumns } from "../conflicts/MissingColumns";
import { NotATable } from "../conflicts/NotATable";
import TableType from "./TableType";
import Bind from "../nodes/Bind";
import type Type from "./Type";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Table from "../runtime/Table";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Action from "../runtime/Start";
import type { ConflictContext } from "./Node";
import type Definition from "./Definition";

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

    computeChildren() { return [ this.table, this.insert, this.row ]; }

    getConflicts(context: ConflictContext): Conflict[] { 
     
        const conflicts = [];

        const tableType = this.table.getTypeUnlessCycle(context);

        // Table must be table typed.
        if(!(tableType instanceof TableType))
            conflicts.push(new NotATable(this));
        // The row must have all of the table type's columns.
        else if(tableType.columns.length !== this.row.cells.length)
            conflicts.push(new MissingColumns(this));
        // The row types must match the column types
        else {
            this.row.cells.forEach((cell, index) => {
                const expr = cell.expression;
                if(expr instanceof Expression && index < tableType.columns.length) {
                    const columnBind = tableType.columns[index].bind;
                    if(columnBind instanceof Bind && !expr.getTypeUnlessCycle(context).isCompatible(context, columnBind.getTypeUnlessCycle(context)))
                        conflicts.push(new IncompatibleCellType(tableType, cell));
                }
            });
        }

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
        return [ 
            new Action(this),
            ...this.table.compile(context), 
            ...this.row.cells.reduce((steps: Step[], cell) => [ ...steps, ...cell.expression.compile(context) ], []),
            new Finish(this) 
        ];
    }

    evaluate(evaluator: Evaluator): Value {

        // We've got a table and some cells, insert the row!
        const values: Value[] = [];
        for(let i = 0; i < this.row.cells.length; i++) {
            const value = evaluator.popValue();
            if(value === undefined) return new Exception(this, ExceptionKind.EXPECTED_VALUE);
            else values.unshift(value);
        }

        const table = evaluator.popValue();
        if(table === undefined) return new Exception(this, ExceptionKind.EXPECTED_VALUE);
        else if(!(table instanceof Table)) return new Exception(this, ExceptionKind.EXPECTED_TYPE);

        // Return a new table with the values.
        return table.insert(values);

    }

}