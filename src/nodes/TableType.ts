import ColumnType from "./ColumnType";
import Type from "./Type";
import type Node from "./Node";
import Bind from "../nodes/Bind";
import type Context from "./Context";
import Unparsable from "./Unparsable";
import Token from "./Token";
import TokenType from "./TokenType";
import { TABLE_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { TABLE_CLOSE_SYMBOL } from "../parser/Tokenizer";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class TableType extends Type {
    
    readonly columns: ColumnType[];
    readonly close: Token | Unparsable;

    constructor(columns: ColumnType[], close?: Token | Unparsable) {
        super();

        this.columns = columns;
        this.close = close ?? new Token(TABLE_CLOSE_SYMBOL, TokenType.TABLE_CLOSE);

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "columns", types:[[ ColumnType ]] },
            { name: "close", types:[ Type, Unparsable ] },
        ];
    }

    clone(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new TableType(
            this.cloneOrReplaceChild(pretty, "columns", this.columns, original, replacement),
            this.cloneOrReplaceChild(pretty, "close", this.close, original, replacement)
        ) as this; 
    }

    computeConflicts() {}

    getColumnNamed(name: string): ColumnType | undefined {
        return this.columns.find(c => c.bind instanceof Bind && c.bind.hasName(name));
    }

    accepts(type: Type, context: Context) {

        if(!(type instanceof TableType)) return false;
        if(this.columns.length !== type.columns.length) return false;    
        for(let i = 0; i < this.columns.length; i++)
            if(!this.columns[i].accepts(type.columns[i], context))
                return false;
        return true;

    }
     
    getNativeTypeName(): string { return TABLE_NATIVE_TYPE_NAME; }

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