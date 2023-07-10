import Exception from './Exception';
import type Evaluator from './Evaluator';
import type Locale from '@locale/Locale';
import type { EvaluationNode } from './Evaluation';
import NodeLink from '@locale/NodeRef';
import FunctionDefinition from '@nodes/FunctionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import concretize from '../locale/concretize';
import type Program from '../nodes/Program';

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

    getDescription(locale: Locale) {
        const counts = new Map<EvaluationNode, number>();
        for (const fun of this.functions)
            counts.set(fun, (counts.get(fun) ?? 0) + 1);

        const sorted = [...counts].sort((a, b) => b[1] - a[1]);
        const mostFrequent = sorted[0][0];

        return concretize(
            locale,
            locale.node.Program.exception.EvaluationLimitException,
            new NodeLink(
                mostFrequent,
                locale,
                this.getNodeContext(mostFrequent),
                mostFrequent instanceof FunctionDefinition ||
                mostFrequent instanceof StructureDefinition
                    ? mostFrequent.names.getLocaleText([locale.language])
                    : undefined
            )
        );
    }
}
