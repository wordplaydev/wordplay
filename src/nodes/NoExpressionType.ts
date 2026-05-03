import type Locales from '@locale/Locales';
import type Expression from '@nodes/Expression';
import UnknownType from '@nodes/UnknownType';

export default class NoExpressionType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(locales: Locales) {
        return locales.concretize((l) => l.node.NoExpressionType.name);
    }
}
