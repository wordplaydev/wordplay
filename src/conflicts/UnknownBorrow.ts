import type Borrow from "../nodes/Borrow";
import Conflict from "./Conflict";


export class UnknownBorrow extends Conflict {
    readonly borrow: Borrow;
    constructor(borrow: Borrow) {
        super(false);
        this.borrow = borrow;
    }
    toString() {
        return super.toString() + " " + this.borrow.name.text.toString();
    }
}
