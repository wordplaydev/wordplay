import Node, { ListOf, type Field, type NodeKind, Empty } from '@nodes/Node';
import type Caret from './Caret';
import type Project from '../models/Project';
import type Revision from '@edit/Revision';
import type Context from '@nodes/Context';
import Replace from '@edit/Replace';
import Refer from '@edit/Refer';
import Append from '@edit/Append';
import Assign from '@edit/Assign';
import BooleanLiteral from '@nodes/BooleanLiteral';
import NumberLiteral from '../nodes/NumberLiteral';
import Token from '../nodes/Token';
import type Type from '../nodes/Type';
import Expression from '../nodes/Expression';
import NoneLiteral from '../nodes/NoneLiteral';
import ListLiteral from '../nodes/ListLiteral';
import MapLiteral from '../nodes/MapLiteral';
import SetLiteral from '../nodes/SetLiteral';
import FunctionDefinition from '../nodes/FunctionDefinition';
import Bind from '../nodes/Bind';
import Block from '../nodes/Block';
import Conditional from '../nodes/Conditional';
import Convert from '../nodes/Convert';
import BinaryEvaluate from '../nodes/BinaryEvaluate';
import UnaryEvaluate from '../nodes/UnaryEvaluate';
import Evaluate from '../nodes/Evaluate';
import Is from '../nodes/Is';
import ListAccess from '../nodes/ListAccess';
import Previous from '../nodes/Previous';
import PropertyBind from '../nodes/PropertyBind';
import PropertyReference from '../nodes/PropertyReference';
import Reaction from '../nodes/Reaction';
import Template from '../nodes/Template';
import TextLiteral from '../nodes/TextLiteral';
import ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
import StructureDefinition from '../nodes/StructureDefinition';
import ConversionDefinition from '../nodes/ConversionDefinition';
import Initial from '../nodes/Initial';
import Reference from '../nodes/Reference';
import This from '../nodes/This';
import Docs from '../nodes/Docs';
import KeyValue from '../nodes/KeyValue';
import Language from '../nodes/Language';
import Doc from '../nodes/Doc';
import TypeInputs from '../nodes/TypeInputs';
import TypeVariables from '../nodes/TypeVariables';
import FunctionType from '../nodes/FunctionType';
import TypePlaceholder from '../nodes/TypePlaceholder';
import UnionType from '../nodes/UnionType';
import Unit from '../nodes/Unit';
import MapType from '../nodes/MapType';
import NoneType from '../nodes/NoneType';
import NumberType from '../nodes/NumberType';
import SetType from '../nodes/SetType';
import TextType from '../nodes/TextType';
import ListType from '../nodes/ListType';
import BooleanType from '../nodes/BooleanType';
import Example from '../nodes/Example';
import Markup from '../nodes/Markup';
import Mention from '../nodes/Mention';
import Paragraph from '../nodes/Paragraph';
import WebLink from '../nodes/WebLink';
import Remove from './Remove';
import UnknownType from '../nodes/UnknownType';

/** Given a project and a caret, generate a set of transforms that can be applied at the location. */
export function getEditsAt(project: Project, caret: Caret): Revision[] {
    const source = caret.source;
    const context = project.getContext(source);

    const isEmptyLine = caret.isEmptyLine();

    let edits: Revision[] = [];

    // If the token is a node, find the allowable nodes to replace this node, or whether it's removable
    if (caret.position instanceof Node) {
        const selection = caret.position;
        const parent = caret.position.getParent(context);
        const field = parent?.getFieldOfChild(selection);
        if (parent && field) {
            // Match the type of the current node
            const expectedType = field.getType
                ? field.getType(context, undefined)
                : undefined;
            // Get the allowed kinds on this node and then translate them into replacement edits.
            edits = getFieldEdits(
                caret.position,
                context,
                (field, parent, node) => [
                    // Generate all the possible types
                    ...field.kind
                        .enumerate()
                        .map((kind) =>
                            getPossibleNodes(
                                field,
                                kind,
                                expectedType,
                                selection,
                                true,
                                context
                            ).map(
                                (replacement) =>
                                    new Replace(
                                        context,
                                        parent,
                                        selection,
                                        replacement
                                    )
                            )
                        )
                        .flat(),
                    // Is this node in a field? Offer to remove it, and any dependent field.
                    ...(field.kind instanceof ListOf
                        ? [new Remove(context, parent, node)]
                        : []),
                ]
            );

            // Is the field optional and set?
            if (
                field.kind.isOptional() &&
                parent.getField(field.name) !== undefined
            ) {
                edits = [
                    ...edits,
                    new Remove(
                        context,
                        parent,
                        selection,
                        ...(field.kind
                            .enumerateFieldKinds()
                            .find(
                                (kind): kind is Empty => kind instanceof Empty
                            )
                            ?.getDependencies(parent, context) ?? [])
                    ),
                ];
            }
        }
    }
    // If the token is a position rather than a node, find edits for the nodes between.
    else {
        const { before, after } = caret.getNodesBetween();
        const adjacent = caret.position === caret.tokenSpaceIndex;

        // For each node before, get edits for what can come after.
        for (const node of before) {
            edits = [
                ...edits,
                ...getRelativeFieldEdits(
                    true,
                    node,
                    caret.position,
                    adjacent,
                    isEmptyLine,
                    context
                ),
            ];
        }

        // For each node after, get edits for what can come before.
        for (const node of after) {
            edits = [
                ...edits,
                ...getRelativeFieldEdits(
                    false,
                    node,
                    caret.position,
                    adjacent,
                    isEmptyLine,
                    context
                ),
            ];
        }

        // We have to special case empty Program Blocks. This is because all other sequences are
        // delimited except for program blocks, so when we're in an empty program block, there is no
        // delimiter to anchor off of.
        if (context.source.leaves().length === 1) {
            const programField =
                source.expression.expression.getFieldNamed('statements');
            if (programField) {
                edits = [
                    ...edits,
                    ...programField.kind
                        .enumerate()
                        .map((kind) =>
                            getPossibleNodes(
                                programField,
                                kind,
                                undefined,
                                source.expression.expression,
                                false,
                                context
                            )
                                .filter(
                                    (kind): kind is Node | Refer =>
                                        kind !== undefined
                                )
                                .map(
                                    (insertion) =>
                                        new Append(
                                            context,
                                            caret.position as number,
                                            source.expression.expression,
                                            source.expression.expression.statements,
                                            0,
                                            insertion
                                        )
                                )
                        )
                        .flat(),
                ];
            }
        }
    }

    return edits.filter(
        (edit1, index1) =>
            !edits.some(
                (edit2, index2) =>
                    index2 > index1 && edit1 !== edit2 && edit1.equals(edit2)
            )
    );
}

/** Given a node, it's context, and a handler, generate a set of transforms appropriate to modify that node and its surroundings. */
function getFieldEdits(
    node: Node,
    context: Context,
    handler: (field: Field, parent: Node, node: Node) => Revision[]
): Revision[] {
    let parent = node.getParent(context);
    let current = node;
    let kinds: Revision[] = [];
    while (parent !== undefined) {
        const field = parent.getFieldOfChild(current);
        if (field) {
            // Include all types that the current node isn't already.
            kinds = [...kinds, ...handler(field, parent, current)];
            // If the current node is an only child, check it's parent
            if (parent.getChildren().length === 1) {
                current = parent;
                parent = parent.getParent(context);
            }
            // Stop searching parents.
            else parent = undefined;
        }
    }
    return kinds;
}

function getRelativeFieldEdits(
    before: boolean,
    node: Node,
    position: number,
    adjacent: boolean,
    /** True if the line the caret is on is empty */
    empty: boolean,
    context: Context
): Revision[] {
    let edits: Revision[] = [];

    const parent = node.getParent(context);
    const field = parent?.getFieldOfChild(node);
    if (parent === undefined || field === undefined) return [];

    // Generate possible nodes that could replace the token prior
    // (e.g., autocomplete References, create binary operations)
    // We only do this if this is before, and we're immediately after
    // a node, and for replacements that "complete" the existing parent.
    if (before && adjacent) {
        const type =
            node instanceof Expression ? node.getType(context) : undefined;
        edits = [
            ...edits,
            ...field.kind
                .enumerate()
                .map((kind) =>
                    getPossibleNodes(
                        field,
                        kind,
                        type instanceof UnknownType ? undefined : type,
                        node,
                        true,
                        context
                    )
                        // If not on an empty line, only include recommendations that "complete" the selection
                        .filter(
                            (replacement) =>
                                empty ||
                                (replacement !== undefined &&
                                    completes(
                                        node,
                                        replacement instanceof Node
                                            ? replacement
                                            : replacement.getNode([])
                                    ))
                        )
                        // Convert the matching nodes to replacements.
                        .map(
                            (replacement) =>
                                new Replace(context, parent, node, replacement)
                        )
                )
                .flat(),
        ];
    }

    // Scan the parent's grammar for fields before or after to the current node the caret is it.
    const grammar = parent.getGrammar();
    const fieldIndex = grammar.findIndex((f) => f.name === field.name);
    const relativeFields = before
        ? grammar.slice(fieldIndex)
        : // We reverse this so we can from most proximal to anchor to the beginning of the node.
          grammar.slice(0, fieldIndex + 1).reverse();

    for (const relativeField of relativeFields) {
        const fieldIsEmpty = parent.getField(relativeField.name) === undefined;

        // If the field is a list, and it's not a block, or we're on an empty line in a block, get possible insertions for all allowable node kinds.
        if (
            relativeField.kind instanceof ListOf &&
            (!(parent instanceof Block) || empty)
        ) {
            const list = parent.getField(relativeField.name);
            if (Array.isArray(list)) {
                // Account for empty lists.
                const index = Math.max(0, list.indexOf(node));
                if (index >= 0) {
                    const expectedType = relativeField.getType
                        ? relativeField.getType(context, index)
                        : undefined;
                    edits = [
                        ...edits,
                        ...relativeField.kind
                            .enumerate()
                            .map((kind) =>
                                getPossibleNodes(
                                    relativeField,
                                    kind,
                                    expectedType,
                                    node,
                                    false,
                                    context
                                )
                                    .filter(
                                        (kind): kind is Node | Refer =>
                                            kind !== undefined
                                    )
                                    .map(
                                        (insertion) =>
                                            new Append(
                                                context,
                                                position,
                                                parent,
                                                list,
                                                index + 1,
                                                insertion
                                            )
                                    )
                            )
                            .flat(),
                    ];
                }
            }
        }
        // If this is not a list, and it's not the field we started at, and the field is set, stop scanning for empty fields we could set.
        else if (relativeField.name !== field.name && !fieldIsEmpty) break;
        // Otherwise, offer to set or unset this field.
        else if (fieldIsEmpty) {
            const expectedType = relativeField.getType
                ? relativeField.getType(context, undefined)
                : undefined;
            const fieldValue = parent.getField(relativeField.name);
            // We don't do this for list fields and we only do it if the field isn't set.
            if (!(relativeField.kind instanceof ListOf))
                edits = [
                    ...edits,
                    ...relativeField.kind
                        .enumerate()
                        .map((kind) =>
                            getPossibleNodes(
                                relativeField,
                                kind,
                                expectedType,
                                node,
                                false,
                                context
                            )
                                // Filter out any equivalent value already set
                                .filter((node) =>
                                    node === undefined
                                        ? fieldValue !== undefined
                                        : Array.isArray(fieldValue) ||
                                          fieldValue === undefined ||
                                          node instanceof Refer ||
                                          !fieldValue.isEqualTo(node)
                                )
                                .map(
                                    (addition) =>
                                        new Assign(
                                            context,
                                            position,
                                            parent,
                                            relativeField.name,
                                            addition
                                        )
                                )
                        )
                        .flat(),
                ];
        }
    }

    // Return the edits, removing any duplicates
    return edits;
}

/**
 * Given two nodes, determines if some part of the original node appears in the replacement node.
 * "Appears" in this case means that one of the replacement's name tokens starts with one of the original's name tokens,
 * or that one of the non-token nodes in the replacement is equal to one of the non-token nodes in the original.
 */
function completes(original: Node, replacement: Node): boolean {
    const originalNodes = original.nodes();
    return replacement.nodes().some((n1) =>
        originalNodes.some((n2) => {
            const n1isToken = n1 instanceof Token;
            const n2isToken = n2 instanceof Token;
            const n1isName = n1isToken && n1.isName();
            const n2isName = n2isToken && n2.isName();
            return (
                (n1isToken &&
                    n1isName &&
                    n2isName &&
                    n1.getText().startsWith(n2.getText())) ||
                (!n1isToken && !n2isToken && n1.isEqualTo(n2))
            );
        })
    );
}

/** A list of node types from which we can generate replacements. */
const Nodes = [
    // Literals
    NumberLiteral,
    BooleanLiteral,
    TextLiteral,
    Template,
    NoneLiteral,
    ListLiteral,
    ListAccess,
    MapLiteral,
    KeyValue,
    SetLiteral,
    ExpressionPlaceholder,
    // Binds and blocks
    Bind,
    Block,
    Reference,
    PropertyReference,
    PropertyBind,
    Language,
    // Evaluation
    BinaryEvaluate,
    UnaryEvaluate,
    Evaluate,
    Convert,
    // Conditions
    Conditional,
    Is,
    // Define
    FunctionDefinition,
    StructureDefinition,
    ConversionDefinition,
    This,
    // Streams
    Initial,
    Previous,
    Reaction,
    // Docs,
    Doc,
    Docs,
    Example,
    Markup,
    Mention,
    Paragraph,
    WebLink,
    // Types
    TypeInputs,
    TypeVariables,
    FunctionType,
    TypePlaceholder,
    UnionType,
    Unit,
    BooleanType,
    ListType,
    MapType,
    NoneType,
    NumberType,
    SetType,
    TextType,
];

function getPossibleNodes(
    field: Field,
    kind: NodeKind,
    type: Type | undefined,
    anchor: Node,
    selected: boolean,
    context: Context
): (Node | Refer | undefined)[] {
    // Undefined? That's just undefined,
    if (kind === undefined) return [undefined];
    // Symbol? That's just a token. We use the symbol's string as the text. Don't recommend it if it's already that.
    if (!(kind instanceof Function)) {
        const newToken = new Token(kind.toString(), kind);
        return field.uncompletable || newToken.isEqualTo(anchor)
            ? []
            : [newToken];
    }
    // Otherwise, it's a non-terminal. Let's find all the nodes that we can make that satisify the node kind,
    // creating nodes or node references that are compatible with the requested kind.
    return (
        // Filter nodes my the kind provided.
        Nodes.filter(
            (possibleKind) =>
                possibleKind.prototype instanceof kind || kind === possibleKind
        )
            // Convert each node type to possible nodes. Each node implements a static function that generates possibilities
            // from the context given.
            .map((possibleKind) =>
                possibleKind.getPossibleNodes(type, anchor, selected, context)
            )
            // Flatten the list of possible nodes.
            .flat()
            // Filter out nodes that don't match the given type, if provided.
            // Filter out nodes that are equivalent to the selection node
            .filter(
                (node) =>
                    (type === undefined ||
                        !(node instanceof Expression) ||
                        type.accepts(node.getType(context), context)) &&
                    (anchor === undefined ||
                        (node instanceof Refer &&
                            (!(anchor instanceof Reference) ||
                                (anchor instanceof Reference &&
                                    node.definition !==
                                        anchor.resolve(context)))) ||
                        (node instanceof Node && !anchor.isEqualTo(node)))
            )
    );
}
