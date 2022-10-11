import type ColumnType from "./ColumnType";
import Type from "./Type";
import type Node from "./Node";
import Bind from "../nodes/Bind";
import type Context from "./Context";
import type Unparsable from "./Unparsable";
import Token from "./Token";
import TokenType from "./TokenType";
import Column from "./Column";
import { TABLE_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { TABLE_CLOSE_SYMBOL } from "../parser/Tokenizer";

export default class TableType extends Type {
    
    readonly columns: ColumnType[];
    readonly close: Token | Unparsable;

    constructor(columns: ColumnType[], close?: Token | Unparsable) {
        super();

        this.columns = columns;
        this.close = close ?? new Token(TABLE_CLOSE_SYMBOL, [ TokenType.TABLE_CLOSE ]);
    }

    computeChildren() { return [ ...this.columns, this.close ]; }
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

    clone(original?: Node, replacement?: Node) { 
        return new TableType(
            this.columns.map(c => c.cloneOrReplace([ Column ], original, replacement)), 
            this.close.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "A table type"
        }
    }

}