import NodeRef from '#locale/NodeRef.ts';
import type Locales from '#locale/Locales.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import type Context from '#nodes/Context.ts';
import type Node from '#nodes/Node.ts';
import type Token from '#nodes/Token.ts';
import type Type from '#nodes/Type.ts';
import UnknownType from '#nodes/UnknownType.ts';

export default class UnknownNameType extends UnknownType<Node> {
    readonly name: Token | undefined;

    constructor(
        expression: Node,
        name: Token | undefined,
        why: Type | undefined,
    ) {
        super(expression, why);

        this.name = name;
    }

    getReason(locales: Locales, context: Context) {
        return locales.concretize((l) => l.node.UnknownNameType.description, {
            name: this.name
                ? new NodeRef(this.name, locales, context)
                : undefined,
        });
    }

    getDescriptionInputs(
        locales: Locales,
        context: Context,
    ): Record<string, TemplateInput> {
        return {
            name: this.name
                ? new NodeRef(this.name, locales, context)
                : undefined,
        };
    }
}
