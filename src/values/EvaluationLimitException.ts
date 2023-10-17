import ExceptionValue from '@values/ExceptionValue';
import type Evaluator from '@runtime/Evaluator';
import type { DefinitionNode } from '@runtime/Evaluation';
import NodeRef from '@locale/NodeRef';
import FunctionDefinition from '@nodes/FunctionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import concretize from '../locale/concretize';
import type Program from '../nodes/Program';
import StreamDefinition from '../nodes/StreamDefinition';
import type Locales from '../locale/Locales';

export default class EvaluationLimitException extends ExceptionValue {
    readonly program: Program;
    readonly functions: DefinitionNode[];
    constructor(
        evaluator: Evaluator,
        node: Program,
        functions: DefinitionNode[]
    ) {
        super(node, evaluator);
        this.program = node;
        this.functions = functions;
    }

    getExceptionText(locales: Locales) {
        return locales.get(
            (l) => l.node.Program.exception.EvaluationLimitException
        );
    }

    getExplanation(locales: Locales) {
        const counts = new Map<DefinitionNode, number>();
        for (const fun of this.functions)
            counts.set(fun, (counts.get(fun) ?? 0) + 1);

        const sorted = [...counts].sort((a, b) => b[1] - a[1]);
        const mostFrequent = sorted[0][0];

        return concretize(
            locales,
            this.getExceptionText(locales).explanation,
            new NodeRef(
                mostFrequent instanceof FunctionDefinition ||
                mostFrequent instanceof StructureDefinition ||
                mostFrequent instanceof StreamDefinition
                    ? mostFrequent.names.getPreferredName(
                          locales.getLocales()
                      ) ?? mostFrequent
                    : mostFrequent,
                locales,
                this.getNodeContext(mostFrequent)
            )
        );
    }
}
