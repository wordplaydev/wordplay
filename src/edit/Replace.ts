import type { Edit } from '../components/editor/util/Commands';
import Revision from './Revision';
import Node from '@nodes/Node';
import Caret from './Caret';
import Refer from './Refer';
import type Context from '@nodes/Context';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';
import Markup from '../nodes/Markup';
import Reference from '../nodes/Reference';
import type Locales from '../locale/Locales';

export default class Replace<NodeType extends Node> extends Revision {
    readonly parent: Node;
    readonly node: Node;
    readonly replacement: NodeType | Refer | undefined;
    readonly description: ((translation: Locale) => string) | undefined;

    constructor(
        context: Context,
        parent: Node,
        node: Node,
        replacement: NodeType | Refer | undefined,
        /** True if this replacement completes an existing node */
        description: ((translation: Locale) => string) | undefined = undefined
    ) {
        super(context);

        this.parent = parent;
        this.node = node;
        this.replacement = replacement;
        this.description = description;
    }

    isReference(): boolean {
        return this.replacement instanceof Refer;
    }

    isRemoval(): boolean {
        return this.replacement === undefined;
    }

    /** True if the replacement node has a reference prefixed by a reference in the original node */
    isCompletion(locales: Locales): boolean {
        if (this.replacement === undefined) return false;
        const original = this.node
            .nodes()
            .filter((node): node is Reference => node instanceof Reference);
        const replacement = (
            this.replacement instanceof Node
                ? this.replacement
                : this.replacement.getNode(locales)
        )
            .nodes()
            .filter((node): node is Reference => node instanceof Reference);
        return original.some((ref1) =>
            replacement.some(
                (ref2) =>
                    ref1.getName() !== ref2.getName() &&
                    ref2.getName().startsWith(ref2.getName())
            )
        );
    }

    getEdit(locales: Locales): Edit | undefined {
        const [replacement, newParent] = this.getEditedNode(locales);

        // Get the position of the node we're replacing.
        const position = this.context.source.getNodeFirstPosition(this.node);
        if (position === undefined) return;

        // Replace the child in the parent, pretty printing it, then clone the program with the new parent, and create a new source from it.
        let newSource =
            // Make a new source with the new parent
            this.context.source
                .replace(this.parent, newParent)
                // Preserve the space before the old parent
                .withSpaces(
                    this.context.source.spaces.withReplacement(
                        this.node,
                        replacement
                    )
                );

        // Give the replacement it's preferred space to make space-sensitive parsing happy.
        if (replacement)
            newSource = newSource.withSpaces(
                newSource.spaces.withPreferredSpaceForNode(
                    newSource.root,
                    replacement
                )
            );

        const newCaretPosition =
            replacement !== undefined
                ? replacement.getFirstPlaceholder() ??
                  newSource.getNodeLastPosition(replacement)
                : position;
        if (newCaretPosition === undefined) return;

        // Return the new source and place the caret after the replacement.
        return [
            newSource,
            new Caret(
                newSource,
                newCaretPosition ?? position,
                undefined,
                undefined,
                replacement
            ),
        ];
    }

    getEditedNode(locales: Locales): [Node, Node] {
        // Get or create the replacement with the original node's space.
        const replacement = this.getNewNode(locales);
        const newParent = this.parent.replace(this.node, replacement);
        return [replacement ?? newParent, newParent];
    }

    getNewNode(locales: Locales) {
        if (this.replacement instanceof Node) return this.replacement;

        return this.replacement?.getNode(locales);
    }

    getDescription(locales: Locales) {
        if (this.description)
            return Markup.words(locales.get(this.description));
        const node =
            this.replacement instanceof Refer
                ? this.replacement.getNode(locales)
                : this.getNewNode(locales);
        return concretize(
            locales,
            locales.get((l) => l.ui.edit.replace),
            node?.getLabel(locales)
        );
    }

    equals(revision: Revision) {
        return (
            revision instanceof Replace &&
            this.node === revision.node &&
            ((this.replacement instanceof Node &&
                revision.replacement instanceof Node &&
                this.replacement.isEqualTo(revision.replacement)) ||
                (this.replacement instanceof Refer &&
                    revision.replacement instanceof Refer &&
                    this.replacement.equals(revision.replacement)))
        );
    }

    toString() {
        return `replace with ${this.replacement?.toString()}`;
    }
}
