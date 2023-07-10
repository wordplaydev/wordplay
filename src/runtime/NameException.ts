import Exception from './Exception';
import type Evaluator from './Evaluator';
import type Locale from '@locale/Locale';
import type Token from '@nodes/Token';
import Value from './Value';
import NodeRef from '@locale/NodeRef';
import ValueLink from '@locale/ValueRef';
import concretize from '../locale/concretize';
import type Expression from '../nodes/Expression';

export default class NameException extends Exception {
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

    getDescription(locale: Locale) {
        return concretize(
            locale,
            locale.node.Reference.exception.NameException,
            this.name
                ? new NodeRef(
                      this.name,
                      locale,
                      this.getNodeContext(this.name),
                      this.name.getText()
                  )
                : undefined,
            this.scope instanceof Value
                ? new ValueLink(
                      this.scope,
                      locale,
                      this.getNodeContext(this.scope.creator)
                  )
                : undefined
        );
    }
}
