import type Previous from "../nodes/Previous";
import Conflict from "./Conflict";


export class NotAStreamIndex extends Conflict {
    readonly previous: Previous;
    constructor(access: Previous) {
        super(false);
        this.previous = access;
    }
}
