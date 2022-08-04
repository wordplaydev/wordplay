import type SetOrMapLiteral from "../nodes/SetOrMapLiteral";
import Conflict from "./Conflict";


export class NotASetOrMap extends Conflict {
    readonly set: SetOrMapLiteral;
    constructor(set: SetOrMapLiteral) {
        super(false);
        this.set = set;
    }
}
