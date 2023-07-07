import BinaryOperation from '@nodes/BinaryOperation';
import type Convert from '@nodes/Convert';
import Evaluate from '@nodes/Evaluate';
import PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
import Token from '@nodes/Token';
import UnaryOperation from '@nodes/UnaryOperation';
import NodeLink from '@locale/NodeLink';
import type Locale from '@locale/Locale';
import type Evaluator from './Evaluator';
import Exception from './Exception';
import type Value from './Value';
import concretize from '../locale/locales/concretize';

export default class FunctionException extends Exception {
    readonly subject: Value | undefined;
    readonly node: Evaluate | BinaryOperation | UnaryOperation | Convert;
    readonly verb: string;

    constructor(
        evaluator: Evaluator,
        node: Evaluate | BinaryOperation | UnaryOperation | Convert,
        subject: Value | undefined,
        verb: string
    ) {
        super(evaluator);

        this.node = node;
        this.subject = subject;
        this.verb = verb;
    }

    getDescription(locale: Locale) {
        // What's the node that has the name?
        const name =
            this.node instanceof Evaluate
                ? this.node.func instanceof PropertyReference
                    ? this.node.func.name ?? this.node.func
                    : this.node.func
                : this.node instanceof BinaryOperation
                ? this.node.operator
                : this.node instanceof UnaryOperation
                ? this.node.operator
                : this.node.type;

        return concretize(
            locale,
            locale.exceptions.function,
            // Wrap the node containing the name in a link
            new NodeLink(
                name,
                locale,
                this.evaluator.project.getNodeContext(this.node),
                name instanceof Reference
                    ? name.getName()
                    : name instanceof Token
                    ? name.getText()
                    : undefined
            ),
            // Wrap the type, if there is one
            this.subject === undefined
                ? undefined
                : new NodeLink(
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
