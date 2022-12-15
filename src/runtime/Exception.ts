import type Translations from "../nodes/Translations";
import ExceptionType from "../nodes/ExceptionType";
import Primitive from "./Primitive";
import type Step from "./Step";
import type Evaluator from "./Evaluator";
import type { NativeTypeName } from "../native/NativeConstants";

export default abstract class Exception extends Primitive {

    readonly step?: Step;

    constructor(evaluator: Evaluator) {
        super(evaluator.getCurrentStep()?.node ?? evaluator.getMain());

        this.step = evaluator.getCurrentStep();

    }

    isEqualTo(): boolean { return false; }

    abstract getExplanations(): Translations;

    getType() { return new ExceptionType(this); }
    getNativeTypeName(): NativeTypeName { return "exception"; }

    toWordplay(): string { return "!"; }

}