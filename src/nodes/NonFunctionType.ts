import type Locales from '#locale/Locales.ts';
import NodeRef from '#locale/NodeRef.ts';
import type Context from '#nodes/Context.ts';
import type Expression from '#nodes/Expression.ts';
import type Type from '#nodes/Type.ts';
import UnknownType from '#nodes/UnknownType.ts';

export class NonFunctionType extends UnknownType<Expression> {
    constructor(expression: Expression, given: Type) {
        super(expression, given);
    }

    getReason(locales: Locales, context: Context) {
        return locales.concretize((l) => l.node.NonFunctionType.description, {
            type: new NodeRef(this.expression, locales, context),
        });
    }
}
