import type Locales from '#locale/Locales.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import NodeRef from '#locale/NodeRef.ts';
import type Context from '#nodes/Context.ts';
import type Expression from '#nodes/Expression.ts';
import type Type from '#nodes/Type.ts';
import UnknownType from '#nodes/UnknownType.ts';

export class NotAType extends UnknownType<Expression> {
    readonly given: Type;
    readonly expected: Type;
    constructor(access: Expression, given: Type, expected: Type) {
        super(access, expected);
        this.given = given;
        this.expected = expected;
    }

    getReason(locales: Locales, context: Context) {
        return locales.concretize((l) => l.node.NotAType.description, {
            type: new NodeRef(this.expected, locales, context),
        });
    }

    getDescriptionInputs(
        locales: Locales,
        context: Context,
    ): Record<string, TemplateInput> {
        return {
            type: new NodeRef(this.expected, locales, context),
        };
    }
}
