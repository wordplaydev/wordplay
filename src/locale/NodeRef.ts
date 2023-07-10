import type Context from '@nodes/Context';
import type Locale from './Locale';
import type Node from '@nodes/Node';

export default class NodeRef {
    readonly node: Node;
    readonly locale: Locale;
    readonly context: Context;
    readonly description: string | undefined;

    constructor(
        node: Node,
        locale: Locale,
        context: Context,
        description?: string
    ) {
        this.node = node;
        this.locale = locale;
        this.context = context;
        this.description = description;
    }

    as(description: string) {
        return new NodeRef(this.node, this.locale, this.context, description);
    }

    getDescription(): string {
        return (
            this.description ??
            this.node.getDescription(this.locale, this.context).toString()
        );
    }

    toString(): string {
        return this.getDescription();
    }
}
