import type Translation from '@translation/Translation';
import type Expression from './Expression';
import UnknownType from './UnknownType';

export default class NoExpressionType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(translation: Translation) {
        return translation.nodes.NoExpressionType.description;
    }
}
