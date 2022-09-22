import type Node from "./Node";
import Token from "./Token";
import Expression from "./Expression";
import Row from "./Row";
import type Conflict from "../conflicts/Conflict";
import NotATable from "../conflicts/NotATable";
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
import type { TypeSet } from "./UnionType";
import { analyzeRow } from "./util";
import Halt from "../runtime/Halt";
import type Cell from "./Cell";

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
     
        let conflicts: Conflict[] = [];

        const tableType = this.table.getTypeUnlessCycle(context);

        // Table must be table typed.
        if(!(tableType instanceof TableType))
            return [ new NotATable(this, tableType) ];

        // Check the row for conflicts.
        conflicts = conflicts.concat(analyzeRow(tableType, this.row, context));

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

        const tableType = this.table.getTypeUnlessCycle(context);

        if(!(tableType instanceof TableType)) return [ new Halt(new Exception(this, ExceptionKind.EXPECTED_TYPE), this) ];

        return [ 
            new Action(this),
            ...this.table.compile(context), 
            ...(
                this.row.allExpressions() ? 
                    // It's all expresssions, compile all of them in order.
                    this.row.cells.reduce((steps: Step[], cell) => [ ...steps, ...cell.value.compile(context) ], []) :
                    // Otherwise, loop through the required columns, finding the corresponding bind, and compiling it's expression, or the default if not found.
                    tableType.columns.reduce((steps: Step[], column) => {
                        const matchingCell: Cell | undefined = this.row.cells.find(cell => column.bind instanceof Bind && cell.value instanceof Bind && column.bind.sharesName(cell.value)) as Cell | undefined;
                        if(matchingCell === undefined || !(matchingCell.value instanceof Bind) || matchingCell.value.value === undefined) return [ ... steps, new Halt(new Exception(this, ExceptionKind.EXPECTED_TYPE), this) ];
                        return [ ... steps, ...matchingCell.value.value.compile(context) ];
                    }, [])
            ),
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