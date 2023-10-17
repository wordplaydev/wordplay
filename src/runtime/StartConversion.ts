import Step from './Step';
import type Evaluator from '@runtime/Evaluator';
import type Value from '../values/Value';
import type ConversionDefinition from '@nodes/ConversionDefinition';
import type Convert from '@nodes/Convert';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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

    getExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.Evaluate.evaluate)
        );
    }
}
