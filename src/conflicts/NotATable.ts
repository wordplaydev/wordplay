import type Delete from "../nodes/Delete";
import type Insert from "../nodes/Insert";
import type Select from "../nodes/Select";
import type Type from "../nodes/Type";
import type Update from "../nodes/Update";
import Conflict from "./Conflict";


export class NotATable extends Conflict {
    readonly op: Insert | Select | Delete | Update;
    readonly received: Type;
 
    constructor(op: Insert | Select | Delete | Update, received: Type) {
        super(false);
        
        this.op = op;
        this.received = received;
        
    }

    getConflictingNodes() {
        return { primary: [ this.op.table ] };
    }

    getExplanations() { 
        return {
            eng: `Expected a table, but this is ${this.received.toWordplay()}`
        }
    }

}