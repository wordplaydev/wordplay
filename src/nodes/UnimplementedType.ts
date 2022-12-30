import type Translations from './Translations';
import { TRANSLATE } from './Translations';
import UnknownType from './UnknownType';
import type Expression from './Expression';

export default class UnimplementedType extends UnknownType<Expression> {
    constructor(expression: Expression) {
        super(expression, undefined);
    }

    getReason(): Translations {
        return {
            eng: `${this.expression.toWordplay()} is not implemented`,
            '😀': `${TRANSLATE} •🤔`,
        };
    }
}
