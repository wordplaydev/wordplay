import type Context from '@nodes/Context';
import type Locale from './Locale';
import type Node from '@nodes/Node';

export default class NodeLink {
    readonly node: Node;
    readonly translation: Locale;
    readonly context: Context;
    readonly description: string | undefined;

    constructor(
        node: Node,
        translation: Locale,
        context: Context,
        description?: string
    ) {
        this.node = node;
        this.translation = translation;
        this.context = context;
        this.description = description;
    }

    as(description: string) {
        return new NodeLink(
            this.node,
            this.translation,
            this.context,
            description
        );
    }

    getDescription() {
        return (
            this.description ??
            this.node.getDescription(this.translation, this.context)
        );
    }
}
