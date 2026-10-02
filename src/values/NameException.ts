import NodeRef from '#locale/NodeRef.ts';
import ValueRef from '#locale/ValueRef.ts';
import type Token from '#nodes/Token.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import type Locales from '#locale/Locales.ts';
import type Expression from '#nodes/Expression.ts';
import Value from '#values/Value.ts';

export default class NameException extends ExceptionValue {
    readonly name: Token | undefined;
    readonly scope: Value | undefined;

    constructor(
        reference: Expression,
        name: Token | undefined,
        scope: Value | undefined,
        evaluator: Evaluator,
    ) {
        super(reference, evaluator);

        this.name = name;
        this.scope = scope;
    }

    getExceptionText(locales: Locales) {
        return locales.getTextStructure(
            (l) => l.node.Reference.exception.NameException,
        );
    }

    getExplanation(locales: Locales) {
        return locales.concretize(
            (l) => l.node.Reference.exception.NameException.explanation,
            {
                name: this.name
                    ? new NodeRef(
                          this.name,
                          locales,
                          this.getNodeContext(this.name),
                          this.name.getText(),
                      )
                    : undefined,
                scope:
                    this.scope instanceof Value
                        ? new ValueRef(
                              this.scope,
                              locales,
                              this.getNodeContext(this.scope.creator),
                          )
                        : undefined,
            },
        );
    }
}
