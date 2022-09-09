import type Bind from "../nodes/Bind";
import Conflict from "./Conflict";
import type Node from "../nodes/Node";
import type Token from "../nodes/Token";

export class UnusedBind extends Conflict {

    readonly bind: Bind;

    constructor(bind: Bind) {
        super(true);
        this.bind = bind;
    }

    getConflictingNodes(): Node[] {
        return this.bind.names.map(a => a.name).filter(n => n !== undefined) as Token[];
    }

}
