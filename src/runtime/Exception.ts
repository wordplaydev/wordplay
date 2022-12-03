import type Translations from "../nodes/Translations";
import { EXCEPTION_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import ExceptionType from "../nodes/ExceptionType";
import Primitive from "./Primitive";
import type Step from "./Step";
import type Evaluator from "./Evaluator";

export default abstract class Exception extends Primitive {

    readonly step?: Step;

    constructor(evaluator: Evaluator) {
        super(evaluator.getCurrentStep()?.node ?? evaluator.getMain());

        this.step = evaluator.getCurrentStep();

    }

    isEqualTo(): boolean { return false; }

    abstract getExplanations(): Translations;

    getType() { return new ExceptionType(this); }
    getNativeTypeName(): string { return EXCEPTION_NATIVE_TYPE_NAME; }

    toString() { return `${this.getExplanations().eng}`; }

}