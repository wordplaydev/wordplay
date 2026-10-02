import type Locales from '#locale/Locales.ts';
import type Expression from '#nodes/Expression.ts';
import UnknownType from '#nodes/UnknownType.ts';

export default class NoExpressionType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(locales: Locales) {
        return locales.concretize((l) => l.node.NoExpressionType.name);
    }
}
