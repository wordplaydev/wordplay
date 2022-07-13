import Node from "./Node";
import type ColumnType from "./ColumnType";
import type Program from "./Program";
import type Conflict from "./Conflict";
import Type from "./Type";
import Bind from "./Bind";

export default class TableType extends Type {
    
    readonly columns: ColumnType[];

    constructor(columns: ColumnType[]) {
        super();

        this.columns = columns;
    }

    getColumnNamed(name: string): ColumnType | undefined {
        return this.columns.find(c => c.bind instanceof Bind && c.bind.hasName(name));
    }

    getChildren() { return [ ...this.columns ]; }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(program: Program, type: Type) {

        if(!(type instanceof TableType)) return false;
        if(this.columns.length !== type.columns.length) return false;    
        for(let i = 0; i < this.columns.length; i++)
            if(!this.columns[i].isCompatible(program, type.columns[i]))
                return false;
        return true;

    }
     
}