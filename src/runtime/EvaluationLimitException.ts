import Exception from './Exception';
import type Evaluator from './Evaluator';
import type Translation from '../translation/Translation';
import type Node from '../nodes/Node';
import type { EvaluationNode } from './Evaluation';
import NodeLink from '../translation/NodeLink';
import FunctionDefinition from '../nodes/FunctionDefinition';
import StructureDefinition from '../nodes/StructureDefinition';

export default class EvaluationLimitException extends Exception {
    readonly node: Node;
    readonly functions: EvaluationNode[];
    constructor(evaluator: Evaluator, node: Node, functions: EvaluationNode[]) {
        super(evaluator);
        this.node = node;
        this.functions = functions;
    }

    getDescription(translation: Translation) {
        const counts = new Map<EvaluationNode, number>();
        for (const fun of this.functions)
            counts.set(fun, (counts.get(fun) ?? 0) + 1);

        const sorted = [...counts].sort((a, b) => b[1] - a[1]);
        const mostFrequent = sorted[0][0];

        return translation.exceptions.functionlimit(
            new NodeLink(
                mostFrequent,
                translation,
                this.getNodeContext(mostFrequent),
                mostFrequent instanceof FunctionDefinition ||
                mostFrequent instanceof StructureDefinition
                    ? mostFrequent.names.getTranslation([translation.language])
                    : undefined
            )
        );
    }
}
