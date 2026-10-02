import NodeRef from '#locale/NodeRef.ts';
import FunctionDefinition from '#nodes/FunctionDefinition.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import type { DefinitionNode } from '#runtime/Evaluation.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import type Locales from '#locale/Locales.ts';
import type Program from '#nodes/Program.ts';
import StreamDefinition from '#nodes/StreamDefinition.ts';

export default class EvaluationLimitException extends ExceptionValue {
    readonly program: Program;
    readonly functions: DefinitionNode[];
    constructor(
        evaluator: Evaluator,
        node: Program,
        functions: DefinitionNode[],
    ) {
        super(node, evaluator);
        this.program = node;
        this.functions = functions;
    }

    getExceptionText(locales: Locales) {
        return locales.getTextStructure(
            (l) => l.node.Program.exception.EvaluationLimitException,
        );
    }

    getExplanation(locales: Locales) {
        const counts = new Map<DefinitionNode, number>();
        for (const fun of this.functions)
            counts.set(fun, (counts.get(fun) ?? 0) + 1);

        const sorted = [...counts].sort((a, b) => b[1] - a[1]);
        // With no functions on the stack, the program itself is what ran away.
        const mostFrequent = sorted[0]?.[0] ?? this.program;

        return locales.concretize(
            (l) =>
                l.node.Program.exception.EvaluationLimitException.explanation,
            {
                function: new NodeRef(
                    mostFrequent instanceof FunctionDefinition ||
                        mostFrequent instanceof StructureDefinition ||
                        mostFrequent instanceof StreamDefinition
                        ? (mostFrequent.names.getPreferredName(
                              locales.getLocales(),
                          ) ?? mostFrequent)
                        : mostFrequent,
                    locales,
                    this.getNodeContext(mostFrequent),
                ),
            },
        );
    }
}
