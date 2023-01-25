import type { Edit } from '../components/editor/util/Commands';
import Transform from './Transform';
import Node from '@nodes/Node';
import type LanguageCode from '@translation/LanguageCode';
import Refer from './Refer';
import Caret from '../components/editor/util/Caret';
import type Context from '@nodes/Context';
import type Translation from '@translation/Translation';

export default class Add<NodeType extends Node> extends Transform {
    readonly parent: Node;
    readonly position: number;
    readonly child: NodeType | Refer;
    readonly field: string;

    constructor(
        context: Context,
        position: number,
        parent: Node,
        field: string,
        child: NodeType | Refer
    ) {
        super(context);

        this.parent = parent;
        this.position = position;
        this.field = field;
        this.child = child;
    }

    getNewNode(languages: LanguageCode[]): Node {
        return this.child instanceof Node
            ? this.child
            : this.child.getNode(languages);
    }

    getEditedNode(lang: LanguageCode[]): [Node, Node] {
        const newNode = this.getNewNode(lang);
        return [newNode, this.parent.replace(this.field, newNode)];
    }

    getEdit(languages: LanguageCode[]): Edit | undefined {
        const [newNode, newParent] = this.getEditedNode(languages);

        // Split the space using the position, defaulting to the original space.
        let newSpaces = Transform.splitSpace(
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
            newNode.getFirstPlaceholder() ||
            newSource.getNodeLastPosition(newNode);

        // If we didn't find a caret position, bail. Otherwise, return the edit.
        return newCaretPosition === undefined
            ? undefined
            : [newSource, new Caret(newSource, newCaretPosition)];
    }

    getDescription(translation: Translation) {
        let node =
            this.child instanceof Refer
                ? this.child.getNode([translation.language])
                : this.getNewNode([translation.language]);
        return translation.transform.add(
            node.getDescription(translation, this.context)
        );
    }

    equals(transform: Transform) {
        return (
            transform instanceof Add &&
            this.parent === transform.parent &&
            ((this.child instanceof Node &&
                transform.child instanceof Node &&
                this.child.equals(transform.child)) ||
                (this.child instanceof Refer &&
                    transform.child instanceof Refer &&
                    this.child.equals(transform.child)))
        );
    }
}
