import type Delete from "../nodes/Delete";
import type Select from "../nodes/Select";
import type Update from "../nodes/Update";
import Conflict from "./Conflict";


export class NonBooleanQuery extends Conflict {
    readonly op: Select | Delete | Update;
    constructor(op: Select | Delete | Update) {
        super(false);
        this.op = op;
    }
}
