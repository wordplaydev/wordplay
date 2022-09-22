import type Node from "./Node";
import Token from "./Token";
import Expression from "./Expression";
import Row from "./Row";
import type Conflict from "../conflicts/Conflict";
import { IncompatibleCellType } from "../conflicts/IncompatibleCellType";
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
import type Context from "./Context";
import type Definition from "./Definition";
import { MissingCells } from "../conflicts/MissingCells";
import type { TypeSet } from "./UnionType";

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

    computeConflicts(context: Context): Conflict[] { 
     
        const conflicts = [];

        const tableType = this.table.getTypeUnlessCycle(context);

        // Table must be table typed.
        if(!(tableType instanceof TableType))
            conflicts.push(new NotATable(this, tableType));
        // The row must have all of the table type's columns.
        else if(tableType.columns.length !== this.row.cells.length)
            conflicts.push(new MissingCells(tableType, this.row));
        // The row types must match the column types
        else {
            this.row.cells.forEach((cell, index) => {
                const expr = cell.expression;
                if(expr instanceof Expression && index < tableType.columns.length) {
                    const columnBind = tableType.columns[index].bind;
                    const cellType = expr.getTypeUnlessCycle(context);
                    const bindType = columnBind.getTypeUnlessCycle(context);
                    if(columnBind instanceof Bind && !cellType.isCompatible(bindType, context))
                        conflicts.push(new IncompatibleCellType(tableType, cell, bindType, cellType));
                }
            });
        }

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

    clone(original?: Node, replacement?: Node) { 
        return new Insert(
            this.table.cloneOrReplace([ Expression ], original, replacement),
            this.insert.cloneOrReplace([ Token ], original, replacement),
            this.row.cloneOrReplace([ Row ], original, replacement)
        ) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.table instanceof Expression) this.table.evaluateTypeSet(bind, original, current, context);
        if(this.row instanceof Expression) this.row.evaluateTypeSet(bind, original, current, context);
        return current;
    }

}