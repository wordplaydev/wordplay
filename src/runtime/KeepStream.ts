import Step from './Step';
import type Value from './Value';
import type Expression from '@nodes/Expression';
import type Locale from '@locale/Locale';
import concretize from '../locale/locales/concretize';

export default class KeepStream extends Step {
    constructor(node: Expression) {
        super(node);
    }

    evaluate(): Value | undefined {
        return undefined;
    }

    getExplanations(translation: Locale) {
        return concretize(translation, translation.step.stream);
    }
}
