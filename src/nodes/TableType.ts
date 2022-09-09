import type ColumnType from "./ColumnType";
import Type from "./Type";
import Bind from "../nodes/Bind";
import type { ConflictContext } from "./Node";
import type Unparsable from "./Unparsable";
import Token from "./Token";
import { TokenType } from "./Token";

export default class TableType extends Type {
    
    readonly columns: ColumnType[];
    readonly close: Token | Unparsable;

    constructor(columns: ColumnType[], close?: Token | Unparsable) {
        super();

        this.columns = columns;
        this.close = close ?? new Token("||", [ TokenType.TABLE_CLOSE ]);
    }

    getColumnNamed(name: string): ColumnType | undefined {
        return this.columns.find(c => c.bind instanceof Bind && c.bind.hasName(name));
    }

    computeChildren() { return [ ...this.columns, this.close ]; }

    isCompatible(context: ConflictContext, type: Type) {

        if(!(type instanceof TableType)) return false;
        if(this.columns.length !== type.columns.length) return false;    
        for(let i = 0; i < this.columns.length; i++)
            if(!this.columns[i].isCompatible(context, type.columns[i]))
                return false;
        return true;

    }
     
    getNativeTypeName(): string { return "table"; }

}