import type Column from "../nodes/Column";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";

export default class ExpectedColumnType extends Conflict {
    readonly column: Column;

    constructor(column: Column) {
        super(false);
        this.column = column;
    }

    getConflictingNodes() {
        return { primary: [ this.column.bind ?? this.column ] };
    }

    getExplanations(): Translations { 
        return {
            eng: `Table columns have to have a type.`,
            "😀": TRANSLATE
        }
    }

}