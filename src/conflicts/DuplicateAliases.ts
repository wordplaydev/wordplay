import type Bind from "../nodes/Bind";
import Conflict from "./Conflict";


export default class DuplicateAliases extends Conflict {
    readonly bind: Bind;
    constructor(bind: Bind) {
        super(false);
        this.bind = bind;
    }
}
