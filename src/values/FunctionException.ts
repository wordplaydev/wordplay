import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Convert from '@nodes/Convert';
import type Evaluate from '@nodes/Evaluate';
import type Token from '@nodes/Token';
import type UnaryEvaluate from '@nodes/UnaryEvaluate';
import NodeRef from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Value from '../values/Value';
import concretize from '../locale/concretize';
import type Expression from '../nodes/Expression';

export default class FunctionException extends ExceptionValue {
    readonly subject: Value | undefined;
    readonly node: Evaluate | BinaryEvaluate | UnaryEvaluate | Convert;
    readonly verb: Token | Expression;

    constructor(
        evaluator: Evaluator,
        node: Evaluate | BinaryEvaluate | UnaryEvaluate | Convert,
        subject: Value | undefined,
        verb: Token | Expression
    ) {
        super(node, evaluator);

        this.node = node;
        this.subject = subject;
        this.verb = verb;
    }

    getExceptionText(locale: Locale) {
        return locale.node.Evaluate.exception.FunctionException;
    }

    getExplanation(locale: Locale) {
        return concretize(
            locale,
            this.getExceptionText(locale).explanation,
            // Wrap the node containing the name in a link
            new NodeRef(
                this.verb,
                locale,
                this.evaluator.project.getNodeContext(this.node)
            ),
            // Wrap the type, if there is one
            this.subject === undefined
                ? undefined
                : new NodeRef(
                      this.subject.getType(
                          this.evaluator.project.getNodeContext(
                              this.subject.creator
                          )
                      ),
                      locale,
                      this.evaluator.project.getNodeContext(
                          this.subject.creator
                      )
                  )
        );
    }
}
