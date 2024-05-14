import type { Edit } from '../components/editor/util/Commands';
import Revision from './Revision';
import Node from '@nodes/Node';
import Refer from './Refer';
import Caret from './Caret';
import type Context from '@nodes/Context';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';
import getPreferredSpaces from '@parser/getPreferredSpaces';

/** Set a field on a child */
export default class Assign<NodeType extends Node> extends Revision {
    readonly parent: Node;
    readonly position: number;
    readonly child: NodeType | Refer | undefined;
    readonly field: string;

    constructor(
        context: Context,
        position: number,
        parent: Node,
        field: string,
        child: NodeType | Refer | undefined,
    ) {
        super(context);

        this.parent = parent;
        this.position = position;
        this.field = field;
        this.child = child;
    }

    isReference(): boolean {
        return this.child instanceof Refer;
    }

    isRemoval(): boolean {
        return this.child === undefined;
    }

    isCompletion(): boolean {
        return false;
    }

    getNewNode(locales: Locales) {
        return this.child === undefined
            ? undefined
            : this.child instanceof Node
              ? this.child
              : this.child.getNode(locales);
    }

    getEditedNode(locales: Locales): [Node, Node] {
        const newNode = this.getNewNode(locales);
        const newParent = this.parent.replace(this.field, newNode);
        return [newNode ?? newParent, newParent];
    }

    getEdit(locale: Locales): Edit | undefined {
        const [newNode, newParent] = this.getEditedNode(locale);

        const existingChild = this.parent.getField(this.field);
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
        if (newNode)
            newSource = newSource.withSpaces(
                getPreferredSpaces(newNode, newSource.spaces),
            );

        // Place the caret at first placeholder or the end of the node in the source.
        const newCaretPosition =
            newNode === undefined
                ? originalPosition ?? this.position
                : newNode.getFirstPlaceholder() ??
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
        const node =
            this.child instanceof Refer
                ? this.child.getNode(locales)
                : this.getNewNode(locales);
        return concretize(
            locales,
            locales.get((l) => l.ui.edit.assign),
            this.field,
            node?.getLabel(locales),
        );
    }

    equals(transform: Revision) {
        return (
            transform instanceof Assign &&
            this.parent === transform.parent &&
            ((this.child instanceof Node &&
                transform.child instanceof Node &&
                this.child.isEqualTo(transform.child)) ||
                (this.child instanceof Refer &&
                    transform.child instanceof Refer &&
                    this.child.equals(transform.child)))
        );
    }

    toString() {
        return `add ${this.child?.toString()}`;
    }
}
