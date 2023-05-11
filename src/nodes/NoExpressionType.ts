import type Locale from '@translation/Locale';
import type Expression from './Expression';
import UnknownType from './UnknownType';

export default class NoExpressionType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(translation: Locale) {
        return translation.node.NoExpressionType.description ?? '';
    }
}
