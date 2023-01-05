import UnknownType from './UnknownType';
import type Expression from './Expression';
import type Translation from '../translations/Translation';

export default class UnimplementedType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(translation: Translation) {
        return translation.types.NotImplementedType.description;
    }
}
