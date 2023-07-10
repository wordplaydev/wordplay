import type Type from './Type';
import UnknownType from './UnknownType';
import type Locale from '@locale/Locale';
import type Expression from './Expression';
import type Context from './Context';
import type { TemplateInput } from '../locale/concretize';
import NodeRef from '../locale/NodeRef';
import concretize from '../locale/concretize';

export class NotAType extends UnknownType<Expression> {
    readonly given: Type;
    readonly expected: Type;
    constructor(access: Expression, given: Type, expected: Type) {
        super(access, expected);
        this.given = given;
        this.expected = expected;
    }

    getReason(locale: Locale, context: Context) {
        return concretize(
            locale,
            locale.node.NotAType.description,
            new NodeRef(this.expected, locale, context)
        );
    }

    getDescriptionInputs(locale: Locale, context: Context): TemplateInput[] {
        return [new NodeRef(this.expected, locale, context)];
    }
}
