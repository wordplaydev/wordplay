import type ConversionDefinition from '#nodes/ConversionDefinition.ts';
import type Convert from '#nodes/Convert.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import type Locales from '#locale/Locales.ts';
import type Value from '#values/Value.ts';
import Step from '#runtime/Step.ts';

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
