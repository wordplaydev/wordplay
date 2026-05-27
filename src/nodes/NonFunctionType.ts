import type Locales from '@locale/Locales';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import UnknownType from '@nodes/UnknownType';

export class NonFunctionType extends UnknownType<Expression> {
    constructor(expression: Expression, given: Type) {
        super(expression, given);
    }

    getReason(locales: Locales, context: Context) {
        return locales.concretize(
            (l) => l.node.NonFunctionType.description,
            {
                type: new NodeRef(this.expression, locales, context),
            },
        );
    }
}
