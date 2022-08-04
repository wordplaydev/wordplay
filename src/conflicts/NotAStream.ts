import type Reaction from "../nodes/Reaction";
import Conflict from "./Conflict";


export class NotAStream extends Conflict {
    readonly stream: Reaction;
    constructor(stream: Reaction) {
        super(false);
        this.stream = stream;
    }
}
