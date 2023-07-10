import ExceptionType from '@nodes/ExceptionType';
import Primitive from './Primitive';
import type Step from './Step';
import type Evaluator from './Evaluator';
import type { NativeTypeName } from '../native/NativeConstants';
import type Node from '@nodes/Node';
import type Expression from '../nodes/Expression';

export default abstract class Exception extends Primitive {
    readonly evaluator: Evaluator;
    readonly step?: Step;

    constructor(creator: Expression, evaluator: Evaluator) {
        super(creator);

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

    getSize() {
        return 1;
    }
}
