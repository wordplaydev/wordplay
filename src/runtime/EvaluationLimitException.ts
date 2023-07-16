import Exception from './Exception';
import type Evaluator from './Evaluator';
import type Locale from '@locale/Locale';
import type { EvaluationNode } from './Evaluation';
import NodeRef from '@locale/NodeRef';
import FunctionDefinition from '@nodes/FunctionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import concretize from '../locale/concretize';
import type Program from '../nodes/Program';
import StreamDefinition from '../nodes/StreamDefinition';

export default class EvaluationLimitException extends Exception {
    readonly program: Program;
    readonly functions: EvaluationNode[];
    constructor(
        evaluator: Evaluator,
        node: Program,
        functions: EvaluationNode[]
    ) {
        super(node, evaluator);
        this.program = node;
        this.functions = functions;
    }

    getExceptionText(locale: Locale) {
        return locale.node.Program.exception.EvaluationLimitException;
    }

    getExplanation(locale: Locale) {
        const counts = new Map<EvaluationNode, number>();
        for (const fun of this.functions)
            counts.set(fun, (counts.get(fun) ?? 0) + 1);

        const sorted = [...counts].sort((a, b) => b[1] - a[1]);
        const mostFrequent = sorted[0][0];

        return concretize(
            locale,
            this.getExceptionText(locale).explanation,
            new NodeRef(
                mostFrequent instanceof FunctionDefinition ||
                mostFrequent instanceof StructureDefinition ||
                mostFrequent instanceof StreamDefinition
                    ? mostFrequent.names.getLocaleName(locale.language) ??
                      mostFrequent
                    : mostFrequent,
                locale,
                this.getNodeContext(mostFrequent)
            )
        );
    }
}
