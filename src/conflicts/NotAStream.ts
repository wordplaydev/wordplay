import type Previous from "../nodes/Previous";
import type Reaction from "../nodes/Reaction";
import Conflict from "./Conflict";


export class NotAStream extends Conflict {
    readonly stream: Reaction | Previous;
    constructor(stream: Reaction | Previous) {
        super(false);
        this.stream = stream;
    }
}
