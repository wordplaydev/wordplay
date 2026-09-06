import type Evaluator from '@runtime/Evaluator';
import type Locales from '@locale/Locales';
import type Expression from '@nodes/Expression';
import type Value from '@values/Value';
import Step from '@runtime/Step';

/** Jumps unless the key on the top of the stack admits the subject beneath it, popping the key
 * only. Used in Match. Admission is equality for every value but a range, which admits any
 * number it holds — see Value.matches. */
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
        // The key was just evaluated, so it's on top; the subject is beneath it, peeked
        // rather than popped so later cases can compare against it too.
        const key = evaluator.popValue(this.node);
        const subject = evaluator.peekValue();
        if (subject && key && key.matches(subject)) return undefined;
        else evaluator.jump(this.steps);
        return undefined;
    }

    getExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Match.case);
    }
}
