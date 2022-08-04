import type BinaryOperation from "../nodes/BinaryOperation";
import Conflict from "./Conflict";


export class LeftToRightOrderOfOperations extends Conflict {
    readonly binary: BinaryOperation;
    constructor(binary: BinaryOperation) {
        super(true);
        this.binary = binary;
    }
}
