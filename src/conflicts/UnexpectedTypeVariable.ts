import type Name from "../nodes/Name";
import Conflict from "./Conflict";


export class UnexpectedTypeVariable extends Conflict {
    readonly name: Name;
    constructor(name: Name) {
        super(false);
        this.name = name;
    }
}
