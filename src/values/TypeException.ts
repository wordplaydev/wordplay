import NodeRef from '#locale/NodeRef.ts';
import type Type from '#nodes/Type.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import type Value from '#values/Value.ts';
import type Locales from '#locale/Locales.ts';
import type Expression from '#nodes/Expression.ts';

export default class TypeException extends ExceptionValue {
    readonly expected: Type;
    readonly received: Value;

    constructor(
        expression: Expression,
        evaluator: Evaluator,
        expected: Type,
        received: Value,
    ) {
        super(expression, evaluator);

        this.expected = expected;
        this.received = received;
    }

    getExceptionText(locales: Locales) {
        return locales.getTextStructure(
            (l) => l.node.Is.exception.TypeException,
        );
    }

    getExplanation(locales: Locales) {
        return locales.concretize(
            (l) => l.node.Is.exception.TypeException.explanation,
            {
                expected: new NodeRef(
                    this.expected,
                    locales,
                    this.getNodeContext(this.expected),
                ),
                given: new NodeRef(
                    this.received.getType(this.evaluator.getCurrentContext()),
                    locales,
                    this.getNodeContext(this.received.creator),
                ),
            },
        );
    }
}
