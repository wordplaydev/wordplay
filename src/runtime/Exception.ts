import ExceptionType from '../nodes/ExceptionType';
import Primitive from './Primitive';
import type Step from './Step';
import type Evaluator from './Evaluator';
import type { NativeTypeName } from '../native/NativeConstants';
import type Node from '../nodes/Node';

export default abstract class Exception extends Primitive {
    readonly evaluator: Evaluator;
    readonly step?: Step;

    constructor(evaluator: Evaluator) {
        super(evaluator.getCurrentStep()?.node ?? evaluator.getMain());

        this.evaluator = evaluator;
        this.step = evaluator.getCurrentStep();
    }

    getNodeContext(node: Node) {
        return this.evaluator.project.getNodeContext(node);
    }

    isEqualTo(): boolean {
        return false;
    }

    getType() {
        return new ExceptionType(this);
    }
    getNativeTypeName(): NativeTypeName {
        return 'exception';
    }

    toWordplay(): string {
        return '!' + this.constructor.name;
    }
}
