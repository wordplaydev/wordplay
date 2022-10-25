import type ColumnType from "../nodes/ColumnType";
import type Row from "../nodes/Row";
import type TableType from "../nodes/TableType";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";


export default class MissingCell extends Conflict {
    
    readonly row: Row;
    readonly type: TableType;
    readonly column: ColumnType;

    constructor(row: Row, type: TableType, column: ColumnType) {
        super(false);

        this.row = row;
        this.type = type;
        this.column = column;
    }

    getConflictingNodes() {
        return { primary: [ this.row ], secondary: [ this.column ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `This row is missing column ${this.column.toWordplay()}.`
        }
    }

}
