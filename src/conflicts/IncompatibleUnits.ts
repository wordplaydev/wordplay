import type BinaryOperation from "../nodes/BinaryOperation";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class IncompatibleUnits extends Conflict {
    readonly binary: BinaryOperation;
    readonly left: Type;
    readonly right: Type;
    constructor(binary: BinaryOperation, left: Type, right: Type) {
        super(false);
        this.binary = binary;
        this.left = left;
        this.right = right;
    }
    toString() {
        return `${super.toString()} ${this.binary.toWordplay()}: (${this.left.toWordplay()}) ≠ (${this.right.toWordplay()})`;
    }
}
