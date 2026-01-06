import Caret from '@edit/caret/Caret';
import type Context from '@nodes/Context';
import Node from '@nodes/Node';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import type { Edit } from '../../components/editor/commands/Commands';
import type Locales from '../../locale/Locales';
import Refer from './Refer';
import Revision from './Revision';

type Addition = { field: string; node: Node | Refer };

/** Set a field on a child */
export default class Assign extends Revision {
    /** The source index where the assignment occurs */
    readonly position: number;
    /** A list of field name and value pairs to assign. */
    readonly additions: [Addition, ...Addition[]];

    constructor(
        context: Context,
        position: number,
        parent: Node,
        additions: [Addition, ...Addition[]],
    ) {
        super(parent, context);

        this.position = position;
        this.additions = additions;
    }

    isReference(): boolean {
        return this.additions.some(({ node }) => node instanceof Refer);
    }

    isRemoval(): boolean {
        return false;
    }

    getRemoved(): Node[] {
        return this.additions
            .filter(({ node }) => node === undefined)
            .map(({ field }) => this.parent.getField(field))
            .flat()
            .filter((node): node is Node => node instanceof Node);
    }

    isCompletion(): boolean {
        return false;
    }

    // Return the first new node.
    getNewNode(locales: Locales) {
        return this.realize(this.additions[0].node, locales);
    }

    realize(node: Node | Refer | undefined, locales: Locales) {
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
            newParent = newParent.replace(field, newNode);
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
                ? (originalPosition ?? this.position)
                : (newParent.getFirstPlaceholder() ??
                  newSource.getNodeLastPosition(newNode));

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
                    (node instanceof Node
                        ? otherNode instanceof Node && node.isEqualTo(otherNode)
                        : otherNode instanceof Refer && node.equals(otherNode))
                );
            })
        );
    }

    toString() {
        return `add ${this.additions[0].node?.toString()}`;
    }
}
