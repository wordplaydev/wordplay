import type Evaluator from '@runtime/Evaluator';
import type Locales from '../locale/Locales';
import type Expression from '../nodes/Expression';
import type Value from '../values/Value';
import Step from './Step';

/** Jumps if the two values on the top of the stack are unequal, popping the first value only. Used in Match. */
export default class JumpIfUnequal extends Step {
    readonly steps: number;

    constructor(
        requestor: Expression,
        /** The number of steps to jump */
        steps: number,
    ) {
        super(requestor);

        this.steps = steps;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        const value2 = evaluator.popValue(this.node);
        const value1 = evaluator.peekValue();
        if (value1 && value2 && value1.isEqualTo(value2)) return undefined;
        else evaluator.jump(this.steps);
        return undefined;
    }

    getExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Match.case);
    }
}
