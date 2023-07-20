import type { Edit } from '../components/editor/util/Commands';
import Transform from './Transform';
import Node from '@nodes/Node';
import type LanguageCode from '@locale/LanguageCode';
import Refer from './Refer';
import Caret from '../components/editor/util/Caret';
import type Context from '@nodes/Context';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';

/** Set a field on a child */
export default class SetField<NodeType extends Node> extends Transform {
    readonly parent: Node;
    readonly position: number;
    readonly child: NodeType | Refer | undefined;
    readonly field: string;

    constructor(
        context: Context,
        position: number,
        parent: Node,
        field: string,
        child: NodeType | Refer | undefined
    ) {
        super(context);

        this.parent = parent;
        this.position = position;
        this.field = field;
        this.child = child;
    }

    getNewNode(languages: LanguageCode[]) {
        return this.child === undefined
            ? undefined
            : this.child instanceof Node
            ? this.child
            : this.child.getNode(languages);
    }

    getEditedNode(lang: LanguageCode[]): [Node | undefined, Node] {
        const newNode = this.getNewNode(lang);
        return [newNode, this.parent.replace(this.field, newNode)];
    }

    getEdit(languages: LanguageCode[]): Edit | undefined {
        const [newNode, newParent] = this.getEditedNode(languages);

        // Split the space using the position, defaulting to the original space.
        let newSpaces =
            newNode === undefined
                ? this.context.source.spaces
                : Transform.splitSpace(
                      this.context.source,
                      this.position,
                      newNode
                  );

        const newProgram = this.context.source.expression.replace(
            this.parent,
            newParent
        );
        const newSource = this.context.source.withProgram(
            newProgram,
            newSpaces
        );

        // Place the caret at first placeholder or the end of the node in the source.
        let newCaretPosition =
            newNode === undefined
                ? this.position
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
                      newNode
                  ),
              ];
    }

    getDescription(locale: Locale) {
        let node =
            this.child instanceof Refer
                ? this.child.getNode([locale.language])
                : this.getNewNode([locale.language]);
        return concretize(locale, locale.ui.edit.add, node?.getLabel(locale));
    }

    equals(transform: Transform) {
        return (
            transform instanceof SetField &&
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
