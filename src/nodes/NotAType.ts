import type Type from './Type';
import UnknownType from './UnknownType';
import type Locale from '@locale/Locale';
import type Expression from './Expression';
import type Context from './Context';

export class NotAType extends UnknownType<Expression> {
    readonly given: Type;
    readonly expected: Type;
    constructor(access: Expression, given: Type, expected: Type) {
        super(access, expected);
        this.given = given;
        this.expected = expected;
    }

    getReason(locale: Locale, context: Context) {
        return (
            locale.node.NotAType.description(this.expected, locale, context) ??
            locale.node.NotAType.name
        );
    }
}
