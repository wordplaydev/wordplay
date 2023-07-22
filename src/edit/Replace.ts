import type { Edit } from '../components/editor/util/Commands';
import Revision from './Revision';
import Node from '@nodes/Node';
import Caret from './Caret';
import type LanguageCode from '@locale/LanguageCode';
import Refer from './Refer';
import type Context from '@nodes/Context';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';
import Markup from '../nodes/Markup';

export default class Replace<NodeType extends Node> extends Revision {
    readonly parent: Node;
    readonly node: Node;
    readonly replacement: NodeType | Refer | undefined;
    readonly completes: boolean;
    readonly description: ((translation: Locale) => string) | undefined;

    constructor(
        context: Context,
        parent: Node,
        node: Node,
        replacement: NodeType | Refer | undefined,
        /** True if this replacement completes an existing node */
        completes: boolean,
        description: ((translation: Locale) => string) | undefined = undefined
    ) {
        super(context);

        this.parent = parent;
        this.node = node;
        this.replacement = replacement;
        this.completes = completes;
        this.description = description;
    }

    isReference(): boolean {
        return this.replacement instanceof Refer;
    }

    isRemoval(): boolean {
        return this.replacement === undefined;
    }

    isCompletion(): boolean {
        return this.completes;
    }

    getEdit(lang: LanguageCode[]): Edit | undefined {
        const [replacement, newParent] = this.getEditedNode(lang);

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
                    newSource,
                    replacement
                )
            );

        let newCaretPosition =
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

    getEditedNode(lang: LanguageCode[]): [Node, Node] {
        // Get or create the replacement with the original node's space.
        const replacement = this.getNewNode(lang);
        const newParent = this.parent.replace(this.node, replacement);
        return [replacement ?? newParent, newParent];
    }

    getNewNode(languages: LanguageCode[]) {
        if (this.replacement instanceof Node) return this.replacement;

        return this.replacement?.getNode(languages);
    }

    getDescription(locale: Locale) {
        if (this.description) return Markup.words(this.description(locale));
        let node =
            this.replacement instanceof Refer
                ? this.replacement.getNode([locale.language])
                : this.getNewNode([locale.language]);
        return concretize(
            locale,
            locale.ui.edit.replace,
            node?.getLabel(locale)
        );
    }

    equals(transform: Revision) {
        return (
            transform instanceof Replace &&
            this.node === transform.node &&
            ((this.replacement instanceof Node &&
                transform.replacement instanceof Node &&
                this.replacement.isEqualTo(transform.replacement)) ||
                (this.replacement instanceof Refer &&
                    transform.replacement instanceof Refer &&
                    this.replacement.equals(transform.replacement)))
        );
    }

    toString() {
        return `replace with ${this.replacement?.toString()}`;
    }
}
