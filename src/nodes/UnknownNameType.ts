import NodeRef from '@locale/NodeRef';
import type Locales from '@locale/Locales';
import type { TemplateInput } from '@locale/Locales';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import type Token from '@nodes/Token';
import type Type from '@nodes/Type';
import UnknownType from '@nodes/UnknownType';

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
        return locales.concretize(
            (l) => l.node.UnknownNameType.description,
            ...this.getDescriptionInputs(locales, context),
        );
    }

    getDescriptionInputs(locales: Locales, context: Context): TemplateInput[] {
        return [
            this.name ? new NodeRef(this.name, locales, context) : undefined,
        ];
    }
}
