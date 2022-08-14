import type ColumnType from "./ColumnType";
import type Conflict from "../conflicts/Conflict";
import Type from "./Type";
import Bind from "../nodes/Bind";
import type { ConflictContext } from "./Node";

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

    getConflicts(context: ConflictContext): Conflict[] { return []; }

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