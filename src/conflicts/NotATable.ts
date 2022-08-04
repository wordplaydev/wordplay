import type Delete from "../nodes/Delete";
import type Insert from "../nodes/Insert";
import type Select from "../nodes/Select";
import type Update from "../nodes/Update";
import Conflict from "./Conflict";


export class NotATable extends Conflict {
    readonly op: Insert | Select | Delete | Update;
    constructor(op: Insert | Select | Delete | Update) {
        super(false);
        this.op = op;
    }
}
