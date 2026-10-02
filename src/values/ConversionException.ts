import NodeRef from '#locale/NodeRef.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import type Locales from '#locale/Locales.ts';
import ValueRef from '#locale/ValueRef.ts';
import type Expression from '#nodes/Expression.ts';
import type Type from '#nodes/Type.ts';
import type Value from '#values/Value.ts';

export default class ConversionException extends ExceptionValue {
    readonly from: Value;
    readonly to: Type;

    constructor(evaluator: Evaluator, node: Expression, from: Value, to: Type) {
        super(node, evaluator);

        this.from = from;
        this.to = to;
    }

    getExceptionText(locales: Locales) {
        return locales.getTextStructure(
            (l) => l.node.Convert.exception.ConversionException,
        );
    }

    getExplanation(locales: Locales) {
        return locales.concretize(
            (l) => l.node.Convert.exception.ConversionException.explanation,
            {
                from: new ValueRef(
                    this.from,
                    locales,
                    this.evaluator.project.getNodeContext(this.creator),
                ),
                to: new NodeRef(
                    this.to,
                    locales,
                    this.evaluator.project.getNodeContext(this.creator),
                ),
            },
        );
    }
}
