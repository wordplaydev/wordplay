import Step from './Step';
import type Evaluator from './Evaluator';
import type Value from './Value';
import type Locale from '@locale/Locale';
import type ConversionDefinition from '@nodes/ConversionDefinition';
import type Convert from '@nodes/Convert';
import concretize from '../locale/locales/concretize';

export default class StartConversion extends Step {
    readonly convert: Convert;
    readonly conversion: ConversionDefinition;

    constructor(node: Convert, conversion: ConversionDefinition) {
        super(node);
        this.convert = node;
        this.conversion = conversion;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        return this.convert.startEvaluation(evaluator, this.conversion);
    }

    getExplanations(locale: Locale) {
        return concretize(locale, locale.step.evaluate);
    }
}
