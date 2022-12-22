import Type from "./Type";
import type Node from "./Node";
import Bind from "../nodes/Bind";
import type Context from "./Context";
import Token from "./Token";
import TokenType from "./TokenType";
import { TABLE_CLOSE_SYMBOL, TABLE_OPEN_SYMBOL } from "../parser/Tokenizer";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import type TypeSet from "./TypeSet";
import type { NativeTypeName } from "../native/NativeConstants";
import AnyType from "./AnyType";
import type Conflict from "../conflicts/Conflict";
import ExpectedColumnType from "../conflicts/ExpectedColumnType";

export default class TableType extends Type {
    
    readonly open: Token;
    readonly columns: Bind[];
    readonly close: Token | undefined;

    constructor(open: Token, columns: Bind[], close: Token | undefined) {
        super();

        this.open = open;
        this.columns = columns;
        this.close = close;

        this.computeChildren();

    }

    static make(columns: Bind[]) {
        return new TableType(new Token(TABLE_OPEN_SYMBOL, [ TokenType.TABLE_OPEN ]), columns, new Token(TABLE_CLOSE_SYMBOL, [ TokenType.TABLE_CLOSE ]));
    }

    getGrammar() { 
        return [
            { name: "open", types: [ Token ]},
            { name: "columns", types: [[ Bind ]] },
            { name: "close", types: [ Type ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new TableType(
            this.replaceChild("open", this.open, original, replacement),
            this.replaceChild("columns", this.columns, original, replacement),
            this.replaceChild("close", this.close, original, replacement)
        ) as this; 
    }

    computeConflicts(context: Context) {

        const conflicts: Conflict[] = [];
        
        // Columns must all have types.
        this.columns.forEach(column => {
            if(column.getType(context) instanceof AnyType)
                conflicts.push(new ExpectedColumnType(column))
        });
        
        return conflicts;
        
    }

    getColumnNamed(name: string): Bind | undefined {
        return this.columns.find(c => c instanceof Bind && c.hasName(name));
    }

    acceptsAll(types: TypeSet, context: Context) {
        return types.list().every(type => {
            if(!(type instanceof TableType)) return false;
            if(this.columns.length !== type.columns.length) return false;    
            for(let i = 0; i < this.columns.length; i++)
                if(!this.columns[i].getType(context).accepts(type.columns[i].getType(context), context))
                    return false;
            return true;
        });
    }
     
    getNativeTypeName(): NativeTypeName { return "table"; }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A table type"
        }
    }

}