import type Cell from "../nodes/Cell";
import type TableType from "../nodes/TableType";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";

export class IncompatibleCellType extends Conflict {

    readonly type: TableType;
    readonly cell: Cell;
    readonly expected: Type;
    readonly received: Type;

    constructor(type: TableType, cell: Cell, expected: Type, received: Type) {
        super(false);

        this.type = type;
        this.cell = cell;
        this.expected = expected;
        this.received = received;

    }

    getConflictingNodes() {
        return { primary:  [this.cell ], secondary: [ this.type ] };
    }

    getExplanations() { 
        return {
            eng: `Expected ${this.expected.toWordplay()}, received ${this.received.toWordplay()}`
        }
    }

}
