import Exception from './Exception';
import type Evaluator from './Evaluator';
import type Translation from '../translations/Translation';
import type Token from '../nodes/Token';
import Value from './Value';
import NodeLink from '../translations/NodeLink';
import ValueLink from '../translations/ValueLink';

export default class NameException extends Exception {
    readonly name: Token;
    readonly scope: Value | undefined;

    constructor(name: Token, scope: Value | undefined, evaluator: Evaluator) {
        super(evaluator);

        this.name = name;
        this.scope = scope;
    }

    getDescription(translation: Translation) {
        return translation.exceptions.name(
            new NodeLink(
                this.name,
                translation,
                this.getNodeContext(this.name),
                this.name.getText()
            ),
            this.scope instanceof Value
                ? new ValueLink(
                      this.scope,
                      translation,
                      this.getNodeContext(this.scope.creator)
                  )
                : undefined
        );
    }
}
