import type Reaction from "../nodes/Reaction";
import Conflict from "./Conflict";


export class IncompatibleStreamValues extends Conflict {
    readonly stream: Reaction;
    constructor(stream: Reaction) {
        super(false);
        this.stream = stream;
    }
}
