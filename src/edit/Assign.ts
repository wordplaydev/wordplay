import type { Edit } from '../components/editor/util/Commands';
import Revision from './Revision';
import Node from '@nodes/Node';
import Refer from './Refer';
import Caret from './Caret';
import type Context from '@nodes/Context';
import type Locales from '../locale/Locales';
import getPreferredSpaces from '@parser/getPreferredSpaces';

/** Set a field on a child */
export default class Assign<NodeType extends Node> extends Revision {
    readonly parent: Node;
    readonly position: number;
    // A list of field name and value pairs to assign.
    readonly additions: { field: string; node: NodeType | Refer | undefined }[];
    constructor(
        context: Context,
        position: number,
        parent: Node,
        additions: { field: string; node: NodeType | Refer | undefined }[],
    ) {
        super(context);

        this.parent = parent;
        this.position = position;
        this.additions = additions;
    }

    isReference(): boolean {
        return this.additions.some(({ node }) => node instanceof Refer);
    }

    isRemoval(): boolean {
        return this.additions.some(({ node }) => node === undefined);
    }

    isCompletion(): boolean {
        return false;
    }

    // Return the first new node.
    getNewNode(locales: Locales) {
        return this.realize(this.additions[0].node, locales);
    }

    realize(node: NodeType | Refer | undefined, locales: Locales) {
        return node === undefined
            ? undefined
            : node instanceof Node
              ? node
              : node.getNode(locales);
    }

    getEditedNode(locales: Locales): [Node, Node] {
        let newParent = this.parent;
        let firstNewNode: Node | undefined;
        for (const { field, node } of this.additions) {
            const newNode = this.realize(node, locales);
            if (firstNewNode === undefined) firstNewNode = newNode;
            newParent = newParent.replace(field, this.realize(node, locales));
        }
        return [firstNewNode ?? newParent, newParent];
    }

    getEdit(locale: Locales): Edit | undefined {
        const [newNode, newParent] = this.getEditedNode(locale);

        const existingChild = this.parent.getField(this.additions[0].field);
        const originalPosition = existingChild
            ? this.context.source.getNodeFirstPosition(
                  Array.isArray(existingChild)
                      ? existingChild[0]
                      : existingChild,
              )
            : undefined;

        // Split the space using the position, defaulting to the original space.
        const newSpaces =
            newNode === undefined
                ? this.context.source.spaces
                : Revision.splitSpace(
                      this.context.source,
                      this.position,
                      newNode,
                  );

        let newSource = this.context.source
            .replace(this.parent, newParent)
            .withSpaces(newSpaces);

        // Ensure new child has preferred space.
        if (newParent)
            newSource = newSource.withSpaces(
                getPreferredSpaces(newParent, newSource.spaces),
            );

        // Place the caret at first placeholder or the end of the node in the source.
        const newCaretPosition =
            newNode === undefined
                ? originalPosition ?? this.position
                : newParent.getFirstPlaceholder() ??
                  newSource.getNodeLastPosition(newNode);

        // If we didn't find a caret position, bail. Otherwise, return the edit.
        return newCaretPosition === undefined
            ? undefined
            : [
                  newSource,
                  new Caret(
                      newSource,
                      newCaretPosition,
                      undefined,
                      undefined,
                      newNode,
                  ),
              ];
    }

    getDescription(locales: Locales) {
        const first = this.additions[0];
        const node =
            first.node instanceof Refer
                ? first.node.getNode(locales)
                : this.getNewNode(locales);
        return locales.concretize(
            (l) => l.ui.edit.assign,
            first.field,
            node?.getLabel(locales),
        );
    }

    equals(transform: Revision) {
        return (
            transform instanceof Assign &&
            this.parent === transform.parent &&
            this.additions.length === transform.additions.length &&
            this.additions.every(({ field, node }, index) => {
                const otherNode = transform.additions[index].node;
                return (
                    field === transform.additions[index].field &&
                    (node === undefined
                        ? otherNode === undefined
                        : node instanceof Node
                          ? otherNode instanceof Node &&
                            node.isEqualTo(otherNode)
                          : otherNode instanceof Refer &&
                            node.equals(otherNode))
                );
            })
        );
    }

    toString() {
        return `add ${this.additions[0].node?.toString()}`;
    }
}
