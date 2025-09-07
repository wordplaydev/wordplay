import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import type Locales from './Locales';

export default class NodeRef {
    readonly node: Node;
    readonly locales: Locales;
    readonly context: Context;
    readonly description: string | undefined;

    constructor(
        node: Node,
        locale: Locales,
        context: Context,
        description?: string,
    ) {
        this.node = node;
        this.locales = locale;
        this.context = context;
        this.description = description;
    }

    as(description: string) {
        return new NodeRef(this.node, this.locales, this.context, description);
    }

    getDescription(): string {
        return (
            this.description ??
            this.node.getDescription(this.locales, this.context).toText()
        );
    }

    toString(): string {
        return this.getDescription();
    }

    toWordplay() {
        return this.getDescription();
    }

    toText() {
        return this.getDescription();
    }
}
