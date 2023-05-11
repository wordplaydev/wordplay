import UnknownType from './UnknownType';
import type Expression from './Expression';
import type Locale from '@locale/Locale';

export default class UnimplementedType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(translation: Locale) {
        return translation.node.NotImplementedType.description;
    }
}
