import type Expression from '../nodes/Expression';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import type Evaluator from './Evaluator';
import Step from './Step';
import type Value from './Value';

export default class Jump extends Step {
    readonly count: number;

    constructor(count: number, node: Expression) {
        super(node);

        this.count = count;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        evaluator.jump(this.count);
        return undefined;
    }

    toString() {
        return super.toString() + ' ' + this.count;
    }

    getExplanations(): Translations {
        return {
            eng: `Jumping ahead.`,
            '😀': `${TRANSLATE} ⏭`,
        };
    }
}
