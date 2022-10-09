import type BinaryOperation from "../nodes/BinaryOperation";
import Evaluate from "../nodes/Evaluate";
import Conflict from "./Conflict";
import type Node from "../nodes/Node";
import type Value from "../runtime/Value";
import type Type from "../nodes/Type";
import type UnaryOperation from "../nodes/UnaryOperation";

export default class NotAFunction extends Conflict {
    readonly evaluate: Evaluate | BinaryOperation | UnaryOperation;
    readonly type: Type;
    readonly received: Node | Value | undefined;

    constructor(evaluate: Evaluate | BinaryOperation | UnaryOperation, type: Type, received: Node | Value | undefined) {
        super(false);
        this.evaluate = evaluate;
        this.type = type;
        this.received = received;
    }

    getConflictingNodes() {
        return { primary: [ this.evaluate instanceof Evaluate ? this.evaluate.func : this.evaluate.operator ] };
    }

    getExplanations() { 
        return {
            eng: `${this.evaluate instanceof Evaluate ? this.evaluate.func : this.evaluate.operator.toWordplay() } isn't a function on ${this.type.toWordplay() }`
        }
    }

}
