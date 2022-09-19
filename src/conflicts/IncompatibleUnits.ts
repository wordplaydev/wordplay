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

    getConflictingNodes() {
        return { primary: [ this.binary.left, this.binary.right ] };
    }

    getExplanations() { 
        return {
            eng: `Units ${this.left.toWordplay()} and ${this.right.toWordplay()} aren't compatible.`
        }
    }

}
