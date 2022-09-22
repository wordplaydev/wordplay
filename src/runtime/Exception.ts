import type { ConflictExplanations } from "../conflicts/Conflict";
import { EXCEPTION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import ExceptionType from "../nodes/ExceptionType";
import type Evaluator from "./Evaluator";
import Primitive from "./Primitive";
import type Step from "./Step";

export default abstract class Exception extends Primitive {

    readonly evaluator: Evaluator;
    readonly step?: Step;

    constructor(evaluator: Evaluator) {
        super();

        this.evaluator = evaluator;
        this.step = this.evaluator.getEvaluationContext()?.currentStep();

    }

    abstract getExplanations(): ConflictExplanations;

    getType() { return new ExceptionType(this); }
    getNativeTypeName(): string { return EXCEPTION_NATIVE_TYPE_NAME; }

    toString() { return `${this.getExplanations()["eng"]}`; }

}