import type Context from '@nodes/Context';
import type Locale from './Locale';
import type Node from '@nodes/Node';
import concretize from './concretize';

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
            this.node
                .getDescription(concretize, this.locale, this.context)
                .toText()
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
