import type Insert from "../nodes/Insert";
import Conflict from "./Conflict";


export class MissingColumns extends Conflict {
    readonly insert: Insert;
    constructor(insert: Insert) {
        super(false);
        this.insert = insert;
    }
}
