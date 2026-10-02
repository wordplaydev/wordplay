import NodeRef from '#locale/NodeRef.ts';
import type BinaryEvaluate from '#nodes/BinaryEvaluate.ts';
import type Convert from '#nodes/Convert.ts';
import type Evaluate from '#nodes/Evaluate.ts';
import type Token from '#nodes/Token.ts';
import type UnaryEvaluate from '#nodes/UnaryEvaluate.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import type Locales from '#locale/Locales.ts';
import type Expression from '#nodes/Expression.ts';
import type Value from '#values/Value.ts';

export default class FunctionException extends ExceptionValue {
    readonly subject: Value | undefined;
    readonly node: Evaluate | BinaryEvaluate | UnaryEvaluate | Convert;
    readonly verb: Token | Expression;

    constructor(
        evaluator: Evaluator,
        node: Evaluate | BinaryEvaluate | UnaryEvaluate | Convert,
        subject: Value | undefined,
        verb: Token | Expression,
    ) {
        super(node, evaluator);

        this.node = node;
        this.subject = subject;
        this.verb = verb;
    }

    getExceptionText(locales: Locales) {
        return locales.getTextStructure(
            (l) => l.node.Evaluate.exception.FunctionException,
        );
    }

    getExplanation(locales: Locales) {
        return locales.concretize(
            (l) => l.node.Evaluate.exception.FunctionException.explanation,
            {
                name: new NodeRef(
                    this.verb,
                    locales,
                    this.evaluator.project.getNodeContext(this.node),
                ),
                scope:
                    this.subject === undefined
                        ? undefined
                        : new NodeRef(
                              this.subject.getType(
                                  this.evaluator.project.getNodeContext(
                                      this.subject.creator,
                                  ),
                              ),
                              locales,
                              this.evaluator.project.getNodeContext(
                                  this.subject.creator,
                              ),
                          ),
            },
        );
    }
}
