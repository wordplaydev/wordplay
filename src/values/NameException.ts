import ExceptionValue from '@values/ExceptionValue';
import type Evaluator from '@runtime/Evaluator';
import type Token from '@nodes/Token';
import Value from '../values/Value';
import NodeRef from '@locale/NodeRef';
import ValueRef from '@locale/ValueRef';
import concretize from '../locale/concretize';
import type Expression from '../nodes/Expression';
import type Locales from '../locale/Locales';

export default class NameException extends ExceptionValue {
    readonly name: Token | undefined;
    readonly scope: Value | undefined;

    constructor(
        reference: Expression,
        name: Token | undefined,
        scope: Value | undefined,
        evaluator: Evaluator
    ) {
        super(reference, evaluator);

        this.name = name;
        this.scope = scope;
    }

    getExceptionText(locales: Locales) {
        return locales.get((l) => l.node.Reference.exception.NameException);
    }

    getExplanation(locales: Locales) {
        return concretize(
            locales,
            this.getExceptionText(locales).explanation,
            this.name
                ? new NodeRef(
                      this.name,
                      locales,
                      this.getNodeContext(this.name),
                      this.name.getText()
                  )
                : undefined,
            this.scope instanceof Value
                ? new ValueRef(
                      this.scope,
                      locales,
                      this.getNodeContext(this.scope.creator)
                  )
                : undefined
        );
    }
}
