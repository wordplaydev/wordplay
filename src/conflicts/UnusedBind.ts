import type Bind from "../nodes/Bind";
import Conflict from "./Conflict";


export class UnusedBind extends Conflict {
    readonly bind: Bind;
    constructor(bind: Bind) {
        super(true);
        this.bind = bind;
    }
}
