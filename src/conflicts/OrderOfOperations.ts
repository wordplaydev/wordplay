import type BinaryOperation from "../nodes/BinaryOperation";
import type Explanations from "../nodes/Explanations";
import Conflict from "./Conflict";

export default class OrderOfOperations extends Conflict {

    readonly operation: BinaryOperation;   
    readonly after: BinaryOperation;
    
    constructor(operation: BinaryOperation, after: BinaryOperation) { 
        super(true);

        this.operation = operation;
        this.after = after;
    }

    getConflictingNodes() {
        return { primary: [ this.operation.operator, this.after.operator ] };
    }

    getExplanations(): Explanations { 
        return {
            eng: `All operators evalute left to right, unlike math. Use parentheses to specify which order to evaluate these.`
        }
    }

}