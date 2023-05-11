import Step from './Step';
import type Value from './Value';
import type Expression from '@nodes/Expression';
import type Locale from '@translation/Locale';

export default class KeepStream extends Step {
    constructor(node: Expression) {
        super(node);
    }

    evaluate(): Value | undefined {
        return undefined;
    }

    getExplanations(translation: Locale) {
        return translation.step.stream;
    }
}
