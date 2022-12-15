import Column from "./Column";
import Row from "./Row";
import type Conflict from "../conflicts/Conflict";
import ExpectedColumnType from "../conflicts/ExpectedColumnType";
import Expression from "./Expression";
import TableType from "./TableType";
import UnknownType from "./UnknownType";
import ColumnType from "./ColumnType";
import Bind from "./Bind";
import type Node from "./Node";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Table from "../runtime/Table";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Context from "./Context";
import Token from "./Token";
import type TypeSet from "./TypeSet";
import { analyzeRow } from "./util";
import Exception from "../runtime/Exception";
import { getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Transform from "../transforms/Transform";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import { TABLE_CLOSE_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";

export default class TableLiteral extends Expression {
    
    readonly columns: Column[];
    readonly close: Token;
    readonly rows: Row[];

    constructor(columns: Column[], rows: Row[], close?: Token) {
        super();

        this.columns = columns;
        this.close = close ?? new Token(TABLE_CLOSE_SYMBOL, [ TokenType.TABLE_CLOSE ]);
        this.rows = rows;
    
        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "columns", types:[[ Column ]] },
            { name: "close", types:[ Token ] },
            { name: "rows", types:[[ Row ]] },
        ]; 
    }

    computeConflicts(context: Context): Conflict[] { 
    
        let conflicts: Conflict[] = [];

        // Columns must all have types.
        this.columns.forEach(column => {
            if(column.bind instanceof Bind && column.bind.getTypeUnlessCycle(context) instanceof UnknownType)
                conflicts.push(new ExpectedColumnType(column))
        });

        // Validate each row.
        const type = this.getType(context);
        if(type instanceof TableType) {
            for(const row of this.rows)
                conflicts = conflicts.concat(analyzeRow(type, row, context));
        }

        return conflicts; 
    
    }

    computeType(): TableType {
        const columnTypes = this.columns.map(c => new ColumnType(c.bind));
        return new TableType(columnTypes);
    }

    /** TableLiterals depend on all of their cells. */
    getDependencies(): Expression[] {
        const dependencies = [];
        for(const row of this.rows)
            for(const cell of row.cells)
                dependencies.push(cell.value);
        return dependencies;
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            // Compile all of the rows' cell expressions.
            ...this.rows.reduce(
                (steps: Step[], row) =>
                    [ ...steps, ...row.cells.reduce((cells: Step[], cell) => [ ...cells, ...cell.value.compile(context)], []) ], 
                []
            ),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        if(prior) return prior;
        
        const rows: Value[][] = [];
        for(let r = 0; r < this.rows.length; r++) {
            const row: Value[] = [];
            for(let c = 0; c < this.columns.length; c++) {
                const cell = evaluator.popValue(undefined);
                if(cell instanceof Exception) return cell;
                else row.unshift(cell);
            }
            rows.unshift(row);
        }
        return new Table(this, rows);

    }

    replace(original?: Node, replacement?: Node) { 
        return new TableLiteral(
            this.replaceChild("columns", this.columns, original, replacement), 
            this.replaceChild("rows", this.rows, original, replacement), 
            this.replaceChild("close", this.close, original, replacement)
        ) as this; 
    }

    /**
     * Is a binding enclosure of its columns and rows, because it defines columns.
     * */ 
    isBindingEnclosureOfChild(child: Node): boolean { return this.columns.includes(child as Column) || this.rows.includes(child as Row); }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        this.rows.forEach(row => { if(row instanceof Expression) row.evaluateTypeSet(bind, original, current, context); });
        return current;
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }
    getChildRemoval() { return undefined; }

    getStart() { return this.getFirstLeaf() ?? this.close; }
    getFinish() { return this.close; }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "First we evaluate all of the rows and cells."
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Now that we have all of the values, let's make the table."
        }
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A table"
        }
    }
    
}