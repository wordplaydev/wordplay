import type BinaryOperation from '@nodes/BinaryOperation';
import type Convert from '@nodes/Convert';
import type Evaluate from '@nodes/Evaluate';
import type Token from '@nodes/Token';
import type UnaryOperation from '@nodes/UnaryOperation';
import NodeRef from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import type Evaluator from './Evaluator';
import Exception from './Exception';
import type Value from './Value';
import concretize from '../locale/concretize';
import type Expression from '../nodes/Expression';

export default class FunctionException extends Exception {
    readonly subject: Value | undefined;
    readonly node: Evaluate | BinaryOperation | UnaryOperation | Convert;
    readonly verb: Token | Expression;

    constructor(
        evaluator: Evaluator,
        node: Evaluate | BinaryOperation | UnaryOperation | Convert,
        subject: Value | undefined,
        verb: Token | Expression
    ) {
        super(node, evaluator);

        this.node = node;
        this.subject = subject;
        this.verb = verb;
    }

    getDescription(locale: Locale) {
        return concretize(
            locale,
            locale.node.Evaluate.exception.FunctionException,
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
