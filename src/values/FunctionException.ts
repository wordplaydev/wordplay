import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Convert from '@nodes/Convert';
import type Evaluate from '@nodes/Evaluate';
import type Token from '@nodes/Token';
import type UnaryEvaluate from '@nodes/UnaryEvaluate';
import NodeRef from '@locale/NodeRef';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Value from '../values/Value';
import concretize from '../locale/concretize';
import type Expression from '../nodes/Expression';
import type Locales from '../locale/Locales';

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

    getExceptionText(locales: Locales) {
        return locales.get((l) => l.node.Evaluate.exception.FunctionException);
    }

    getExplanation(locales: Locales) {
        return concretize(
            locales,
            this.getExceptionText(locales).explanation,
            // Wrap the node containing the name in a link
            new NodeRef(
                this.verb,
                locales,
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
                      locales,
                      this.evaluator.project.getNodeContext(
                          this.subject.creator
                      )
                  )
        );
    }
}
