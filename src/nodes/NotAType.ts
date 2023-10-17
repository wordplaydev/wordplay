import type Type from './Type';
import UnknownType from './UnknownType';
import type Expression from './Expression';
import type Context from './Context';
import type { TemplateInput } from '../locale/concretize';
import NodeRef from '../locale/NodeRef';
import type Concretizer from './Concretizer';
import type Locales from '../locale/Locales';

export class NotAType extends UnknownType<Expression> {
    readonly given: Type;
    readonly expected: Type;
    constructor(access: Expression, given: Type, expected: Type) {
        super(access, expected);
        this.given = given;
        this.expected = expected;
    }

    getReason(concretize: Concretizer, locales: Locales, context: Context) {
        return concretize(
            locales,
            locales.get((l) => l.node.NotAType.description),
            new NodeRef(this.expected, locales, context)
        );
    }

    getDescriptionInputs(locales: Locales, context: Context): TemplateInput[] {
        return [new NodeRef(this.expected, locales, context)];
    }
}
