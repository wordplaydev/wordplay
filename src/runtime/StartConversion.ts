import type ConversionDefinition from '@nodes/ConversionDefinition';
import type Convert from '@nodes/Convert';
import type Evaluator from '@runtime/Evaluator';
import type Locales from '../locale/Locales';
import type Value from '../values/Value';
import Step from './Step';

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
        return locales.concretize((l) => l.node.Evaluate.evaluate);
    }
}
