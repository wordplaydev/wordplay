import type Context from "../nodes/Context";
import type Expression from "../nodes/Expression";
import type TableType from "../nodes/TableType";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Type from "../nodes/Type";
import Conflict from "./Conflict";

export default class IncompatibleCellType extends Conflict {

    readonly type: TableType;
    readonly cell: Expression;
    readonly expected: Type;
    readonly received: Type;

    constructor(type: TableType, cell: Expression, expected: Type, received: Type) {
        super(false);

        this.type = type;
        this.cell = cell;
        this.expected = expected;
        this.received = received;

    }

    getConflictingNodes() {
        return { primary:  [this.cell ], secondary: [ this.type ] };
    }

    getExplanations(context: Context): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `Expected ${this.expected.toWordplay()}, received ${this.received.getDescriptions(context).eng}`
        }
    }

}
