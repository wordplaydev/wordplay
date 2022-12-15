import Token from "./Token";
import Expression from "./Expression";
import Row from "./Row";
import type Conflict from "../conflicts/Conflict";
import UnknownColumn from "../conflicts/UnknownColumn";
import ExpectedSelectName from "../conflicts/ExpectedSelectName";
import NonBooleanQuery from "../conflicts/NonBooleanQuery";
import NotATable from "../conflicts/NotATable";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Reference from "./Reference";
import TableType from "./TableType";
import type ColumnType from "./ColumnType";
import BooleanType from "./BooleanType";
import Bind from "../nodes/Bind";
import type Node from "./Node";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Context from "./Context";
import type Definition from "./Definition";
import type TypeSet from "./TypeSet";
import UnimplementedException from "../runtime/UnimplementedException";
import type Evaluator from "../runtime/Evaluator";
import { getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Transform from "../transforms/Transform";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class Select extends Expression {
    
    readonly table: Expression;
    readonly select: Token;
    readonly row: Row;
    readonly query: Expression;

    constructor(table: Expression, select: Token, row: Row, query: Expression) {
        super();

        this.table = table;
        this.select = select;
        this.row = row;
        this.query = query;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "table", types:[ Expression ] },
            { name: "select", types:[ Token] },
            { name: "row", types:[ Row ] },
            { name: "query", types:[ Expression ] },
        ]; 
    }

    replace(original?: Node, replacement?: Node) { 
        return new Select(
            this.replaceChild("table", this.table, original, replacement), 
            this.replaceChild("select", this.select, original, replacement), 
            this.replaceChild("row", this.row, original, replacement), 
            this.replaceChild("query", this.query, original, replacement)
        ) as this; 
    }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.query || child === this.row; }

    computeConflicts(context: Context): Conflict[] { 
        
        const conflicts: Conflict[] = [];

        const tableType = this.table.getTypeUnlessCycle(context);

        // Table must be table typed.
        if(!(tableType instanceof TableType))
            conflicts.push(new NotATable(this, tableType));

        // The columns in a select must be names.
        this.row.cells.forEach(cell => {
            if(!(cell.value instanceof Reference))
                conflicts.push(new ExpectedSelectName(cell))
        });

        // The columns named must be names in the table's type.
        if(tableType instanceof TableType) {
            this.row.cells.forEach(cell => {
                const cellName = cell.value instanceof Reference ? cell.value : undefined; 
                if(!(cellName !== undefined && tableType.getColumnNamed(cellName.name.getText()) !== undefined))
                    conflicts.push(new UnknownColumn(tableType, cell));
            });
        }

        // The query must be boolean typed.
        const queryType = this.query.getTypeUnlessCycle(context);
        if(this.query instanceof Expression && !(queryType instanceof BooleanType))
            conflicts.push(new NonBooleanQuery(this, queryType))
    
        return conflicts;
    
    }

    computeType(context: Context): Type {

        // Get the table type and find the rows corresponding the selected columns.
        const tableType = this.table.getTypeUnlessCycle(context);
        if(!(tableType instanceof TableType)) return new UnknownType(this);

        // For each cell in the select row, find the corresponding column type in the table type.
        // If we can't find one, return unknown.
        const columnTypes = this.row.cells.map(cell => {
            const column = cell.value instanceof Reference ? tableType.getColumnNamed(cell.value.name.text.toString()) : undefined; 
            return column === undefined ? undefined : column;
        });
        if(columnTypes.find(t => t === undefined)) return new UnknownType(this);

        return new TableType(columnTypes as ColumnType[]);

    }

    getDefinitions(node: Node, context: Context): Definition[] {

        node;
        const type = this.table.getTypeUnlessCycle(context);
        if(type instanceof TableType)
            return type.columns.filter(col => col.bind instanceof Bind).map(col => col.bind) as Bind[];
        else
            return [];

    }

    getDependencies(): Expression[] {
        return [ this.table, this.query ];
    }

    compile(context: Context):Step[] {
        // Evaluate the table expression then this.
        return [ 
            new Start(this),
            ...this.table.compile(context),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value {
        return new UnimplementedException(evaluator);
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.table instanceof Expression) this.table.evaluateTypeSet(bind, original, current, context);
        if(this.select instanceof Expression) this.select.evaluateTypeSet(bind, original, current, context);
        if(this.row instanceof Expression) this.row.evaluateTypeSet(bind, original, current, context);
        if(this.query instanceof Expression) this.query.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
   
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }
    getChildRemoval() { return undefined; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Select rows from a table"
        }
    }

    getStart() { return this.select; }
    getFinish() { return this.select; }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "First we get the table, then we select values from it."
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Now that we have the table, let's get the matching values."
        }
    }

}