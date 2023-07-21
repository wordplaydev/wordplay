import Node, { ListOf, type Field, type NodeKind, Empty } from '@nodes/Node';
import type Caret from './Caret';
import type Project from '../models/Project';
import type Revision from '@edit/Revision';
import type Context from '@nodes/Context';
import Replace from '@edit/Replace';
import Refer from '@edit/Refer';
import Append from '@edit/Append';
import Add from '@edit/Add';
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
                                kind,
                                expectedType,
                                selection,
                                false,
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
                    context
                ),
            ];
        }

        // We have to special case empty Program Blocks. This is because all other sequences are
        // delimited except for program blocks, so when we're in an empty program block, there is no
        // delimiter to anchor off of.
        if (context.source.leaves().length === 1) {
            const kind =
                source.expression.expression.getFieldKind('statements');
            if (kind) {
                edits = [
                    ...edits,
                    ...kind
                        .enumerate()
                        .map((kind) =>
                            getPossibleNodes(
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
    context: Context
): Revision[] {
    let edits: Revision[] = [];

    const parent = node.getParent(context);
    const field = parent?.getFieldOfChild(node);
    if (parent === undefined || field === undefined) return [];

    // Generate possible nodes that could replace the token prior
    // (e.g., autocomplete References, create binary operations)
    // We only do this if this is before, and we're immediately after
    // a node, and the node is an expression, to ensure
    // we only generate relevant suggestions.
    if (before && adjacent && node instanceof Expression) {
        const type = node.getType(context);
        edits = [
            ...edits,
            ...field.kind
                .enumerate()
                .map((kind) =>
                    getPossibleNodes(
                        kind,
                        type instanceof UnknownType ? undefined : type,
                        node,
                        true,
                        context
                    ).map(
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
        // If the field is a list, get possible insertions for all allowable node kinds.
        if (relativeField.kind instanceof ListOf) {
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
        else if (
            relativeField.name !== field.name &&
            parent.getField(relativeField.name) !== undefined
        )
            break;
        // Otherwise, offer to set or unset this field.
        else {
            const expectedType = relativeField.getType
                ? relativeField.getType(context, undefined)
                : undefined;
            const fieldValue = parent.getField(relativeField.name);
            // We don't do this for list fields.
            if (!(relativeField.kind instanceof ListOf))
                edits = [
                    ...edits,
                    ...relativeField.kind
                        .enumerate()
                        .map((kind) =>
                            getPossibleNodes(
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
                                        new Add(
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
    kind: NodeKind,
    type: Type | undefined,
    anchor: Node,
    selected: boolean,
    context: Context
): (Node | Refer | undefined)[] {
    // Undefined? That's just undefined,
    if (kind === undefined) return [undefined];
    // Symbol? That's just a token. We use the symbol's string as the text.
    if (!(kind instanceof Function)) return [new Token(kind.toString(), kind)];
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

// /** Given a project and a caret in it, generate a set of valid transformations at that caret. */
// export function getEditsAt(project: Project, caret: Caret): Transform[] {
//     const source = caret.source;
//     const context = project.getContext(source);

//     // Is the caret on a specific token or node?
//     let position = caret.position;

//     // See if the node is inside a placeholder, and if so, choose the placeholder instead.
//     // See if the node has a placeholder ancestor, and if so, choose it.
//     if (position instanceof Node)
//         position =
//             source.root.getAncestors(position).find((a) => a.isPlaceholder()) ??
//             position;

//     // Initialize a list of transforms
//     let transforms: Transform[] = [];

//     // If the caret is a position, find out what can go before or after
//     if (typeof caret.position === 'number') {
//         // Naming here is funny: "before" means "the caret is before these nodes"
//         let { before: nodesAfter, after: nodesBefore } =
//             caret.getNodesBetween();

//         // Special case references before position
//         const reference = nodesBefore.find((n) => n instanceof Reference);

//         // Get a list of transforms before and after this position.
//         transforms =
//             reference instanceof Reference && !caret.isEmptyLine()
//                 ? getReplacements(context, reference)
//                 : [
//                       // // Get all of the replacements possible immediately before the position.
//                       ...nodesAfter.reduce(
//                           (transforms: Transform[], child) => [
//                               ...transforms,
//                               ...getEditsBefore(
//                                   context,
//                                   child,
//                                   caret.position as number
//                               ),
//                           ],
//                           []
//                       ),
//                       // Get all of the replacements possible and the ends of the nodes just before the position.
//                       ...nodesBefore.reduce(
//                           (transforms: Transform[], child) => [
//                               ...transforms,
//                               ...getEditsAfter(
//                                   context,
//                                   child,
//                                   caret.position as number
//                               ),
//                           ],
//                           []
//                       ),
//                   ];

//         // Then, for each after, see if it's parent allows the node to be an arbitrary expression, and if so,
//         // generate edits that postfix the node.
//         if (!caret.isEmptyLine())
//             for (const node of nodesBefore) {
//                 if (node instanceof Expression)
//                     transforms = [
//                         ...transforms,
//                         ...getPostfixEdits(context, node),
//                     ];
//             }
//     }
//     // If the node is a selection, offer replacements.
//     else if (position instanceof Node) {
//         // What can this be replaced with?
//         transforms = [
//             ...getReplacements(context, position),
//             ...(position instanceof Expression
//                 ? getPostfixEdits(context, position)
//                 : []),
//         ];
//     }

//     // Filter out duplicates
//     return transforms.filter(
//         (item1, index1, list) =>
//             !list.some(
//                 (item2, index2) => index2 > index1 && item1.equals(item2)
//             )
//     );
// }

// function getFieldOf(node: Node, context: Context): Field | undefined {
//     const parent = node.getParent(context);
//     if (parent === undefined) return;

//     for (const [field, value] of Object.entries(parent.getChildrenAsGrammar()))
//         if (
//             value !== undefined &&
//             (value === node || (Array.isArray(value) && value.includes(node)))
//         )
//             return parent.getGrammar().find((f) => f.name === field);

//     return undefined;
// }

// /** Walk the grammar, calling the specified visitor function at each node. */
// function traverseGrammar(
//     grammar: Field[],
//     fields: Record<string, Node | Node[] | undefined>,
//     visit: (
//         field: Field,
//         node: Node | undefined,
//         types: (undefined | Function | TokenType)[],
//         list:
//             | { list: Node[]; index: number | undefined; length: number }
//             | undefined
//     ) => boolean
// ) {
//     for (const field of grammar) {
//         const value = fields[field.name];
//         if (Array.isArray(value)) {
//             let types = field.types[0];
//             if (!Array.isArray(types))
//                 throw Error(`Found list on non-list field '${field.name}'`);
//             if (value.length === 0)
//                 visit(field, undefined, types, {
//                     list: value,
//                     index: undefined,
//                     length: 0,
//                 });
//             else {
//                 for (const [index, sibling] of value.entries()) {
//                     if (!Array.isArray(types))
//                         throw Error(
//                             `Found list on non-list field '${field.name}'`
//                         );
//                     else {
//                         if (
//                             visit(field, sibling, types, {
//                                 list: value,
//                                 index,
//                                 length: value.length,
//                             })
//                         )
//                             return;
//                     }
//                 }
//             }
//         } else if (value instanceof Node) {
//             const types = field.types;
//             if (Array.isArray(types[0]))
//                 throw Error(
//                     `Found list of nodes on field declared as a single node '${field.name}'`
//                 );
//             else if (
//                 visit(
//                     field,
//                     value,
//                     types as (undefined | Function)[],
//                     undefined
//                 )
//             )
//                 return;
//         }
//         // If this field is undefined, add the types that the field allows
//         else if (value === undefined) {
//             const types = field.types;
//             if (Array.isArray(types[0]))
//                 throw Error(
//                     `Found list of nodes on field declared as a single node '${field.name}'`
//                 );
//             visit(field, value, types as (undefined | Function)[], undefined);
//         }
//     }
// }

// /** Given a node, identify a set of possible replacements for the node */
// function getReplacements(context: Context, selection: Node): Transform[] {
//     // Find the parent of the node.
//     const parent = selection.getParent(context);
//     if (parent === undefined) return [];

//     // Traverse the parent's grammar to find out what types are allowed.
//     const transforms: Transform[] = [];
//     traverseGrammar(
//         parent.getGrammar(),
//         parent.getChildrenAsGrammar(),
//         (field, node, kinds, list) => {
//             if (node === selection) {
//                 for (const kind of kinds) {
//                     if (kind === undefined)
//                         transforms.push(
//                             new Replace(context, parent, selection, undefined)
//                         );
//                     else {
//                         // Pass the list index if the replacement is in a list.
//                         for (const possibility of getPossibleNodes(
//                             context,
//                             node,
//                             kind,
//                             field,
//                             list?.index
//                         ))
//                             transforms.push(
//                                 toPossibleEvaluation(
//                                     context,
//                                     parent instanceof PropertyReference
//                                         ? parent
//                                         : node,
//                                     possibility
//                                 ) ??
//                                     new Replace(
//                                         context,
//                                         parent,
//                                         selection,
//                                         possibility
//                                     )
//                             );
//                     }

//                     if (
//                         kind === Expression &&
//                         selection instanceof Expression
//                     ) {
//                         transforms.unshift(
//                             new Replace(
//                                 context,
//                                 parent,
//                                 selection,
//                                 Block.make([selection]),
//                                 (translation) => translation.ui.edit.wrap
//                             )
//                         );
//                         // If the selection is a block with a single statement and the
//                         // block would accepted the wrapped statement, offer to unwrap.
//                         if (selection instanceof Block) {
//                             if (
//                                 selection.statements.length === 1 &&
//                                 kinds.includes(Expression)
//                             ) {
//                                 transforms.unshift(
//                                     new Replace(
//                                         context,
//                                         parent,
//                                         selection,
//                                         selection.statements[0],
//                                         (translation) =>
//                                             translation.ui.edit.unwrap
//                                     )
//                                 );
//                             }
//                             transforms.unshift(
//                                 new Replace(
//                                     context,
//                                     parent,
//                                     selection,
//                                     Bind.make(
//                                         undefined,
//                                         Names.make(['_']),
//                                         undefined,
//                                         selection
//                                     ),
//                                     (translation) => translation.ui.edit.bind
//                                 )
//                             );
//                         }
//                     }
//                 }
//                 // Stop iterating.
//                 return true;
//             }
//             return false;
//         }
//     );

//     return transforms;
// }

// function getEditsBefore(
//     context: Context,
//     anchor: Node,
//     position: number
// ): Transform[] {
//     // Find the parent of the node.
//     const parent = anchor.getParent(context);
//     if (parent === undefined) return [];

//     // Walk the grammar, accumulating possible transforms, until we reach the node.
//     let transforms: Transform[] = [];
//     traverseGrammar(
//         parent.getGrammar(),
//         parent.getChildrenAsGrammar(),
//         (field, node, kinds, list) => {
//             // If in a list...
//             if (list !== undefined) {
//                 // Found the node, time to stop.
//                 if (node === anchor) return true;
//                 // If this is after the first item in the list, reset the possible transforms, since
//                 // the list is now defining what's eligible before.
//                 if (list.index !== undefined && list.index > 0)
//                     transforms.length = 0;

//                 // The insertion index is either at the beginning for an empty list, or after this index.
//                 const index = list.index === undefined ? 0 : list.index + 1;
//                 // If we haven't found the node, and it's possibly next, we could insert one of the types.
//                 if (
//                     field.canInsertAt === undefined ||
//                     field.canInsertAt(context, index)
//                 ) {
//                     for (const type of kinds) {
//                         if (type !== undefined) {
//                             // Pass the index after the current index, in case the anchor node is next.
//                             for (const possible of getPossibleNodes(
//                                 context,
//                                 node,
//                                 type,
//                                 field,
//                                 index
//                             ))
//                                 transforms.push(
//                                     new Append(
//                                         context,
//                                         position,
//                                         parent,
//                                         list.list,
//                                         index,
//                                         possible
//                                     )
//                                 );
//                         }
//                     }
//                 }
//             }
//             // If a standalone node, either mark found or add possible types and stop.
//             else if (node !== undefined) {
//                 if (node === anchor) return true;
//                 // If it's not the node...
//                 else {
//                     // If the node can't be undefined, then reset the transforms. Otherwise, carry forward the prior
//                     // node's possible transforms.
//                     if (!kinds.includes(undefined)) transforms.length = 0;
//                     // Add the possible types this node could be.
//                     for (const kind of kinds)
//                         if (kind !== undefined)
//                             for (const possible of getPossibleNodes(
//                                 context,
//                                 node,
//                                 kind,
//                                 field
//                             ))
//                                 transforms.push(
//                                     new Add(
//                                         context,
//                                         position,
//                                         parent,
//                                         field.name,
//                                         possible
//                                     )
//                                 );
//                     return false;
//                 }
//             }
//             // If undefined, add the possible node
//             else if (node === undefined) {
//                 for (const kind of kinds)
//                     if (kind !== undefined)
//                         for (const possible of getPossibleNodes(
//                             context,
//                             node,
//                             kind,
//                             field
//                         ))
//                             transforms.push(
//                                 new Add(
//                                     context,
//                                     position,
//                                     parent,
//                                     field.name,
//                                     possible
//                                 )
//                             );
//             }
//             return false;
//         }
//     );

//     // Generate transforms based on what's next in the grammar.
//     return transforms;
// }

// function getEditsAfter(
//     context: Context,
//     anchor: Node,
//     position: number
// ): Transform[] {
//     // Find the parent of the node.
//     const parent = anchor.getParent(context);

//     if (parent === undefined) return [];

//     // Walk the grammar, consuming matching children finding the node, finding everything that can follow the node.
//     let found = false;
//     let transforms: Transform[] = [];
//     traverseGrammar(
//         parent.getGrammar(),
//         parent.getChildrenAsGrammar(),
//         (field, node, kinds, list) => {
//             // If in a list...
//             if (list !== undefined) {
//                 if (node === anchor) {
//                     found = true;
//                 }
//                 // The insertion index is either at the beginning for an empty list, or after the found node.
//                 const index = list.index === undefined ? 0 : list.index + 1;
//                 // If we've already found the anchor, create transforms for all possible valid insertions.
//                 if (
//                     found &&
//                     (field.canInsertAt === undefined ||
//                         field.canInsertAt(context, index))
//                 ) {
//                     for (const kind of kinds)
//                         if (kind !== undefined) {
//                             // Pass the index after the current index, since we're trying to see what can be added after.
//                             for (const possible of getPossibleNodes(
//                                 context,
//                                 node,
//                                 kind,
//                                 field
//                             )) {
//                                 if (
//                                     anchor instanceof Reference &&
//                                     possible instanceof Refer
//                                 ) {
//                                     transforms.push(
//                                         toPossibleEvaluation(
//                                             context,
//                                             parent instanceof PropertyReference
//                                                 ? parent
//                                                 : anchor,
//                                             possible
//                                         ) ??
//                                             new Replace(
//                                                 context,
//                                                 parent,
//                                                 anchor,
//                                                 possible
//                                             )
//                                     );
//                                 } else {
//                                     transforms.push(
//                                         new Append(
//                                             context,
//                                             position,
//                                             parent,
//                                             list.list,
//                                             index,
//                                             possible
//                                         )
//                                     );
//                                 }
//                             }
//                         }
//                     // If the node is before the last item in the list, then nothing else can be inserted, so we stop.
//                     return (
//                         list.index === undefined || list.index < list.length - 1
//                     );
//                 }
//                 return false;
//             }
//             // If a standalone node, either mark found or add possible types and stop.
//             else if (node !== undefined) {
//                 if (node === anchor) {
//                     found = true;

//                     // If the anchor we're after is a reference, add replacement references, to enable names to be completed.
//                     if (node instanceof Reference) {
//                         for (const kind of kinds) {
//                             if (kind !== undefined)
//                                 for (const possible of getPossibleNodes(
//                                     context,
//                                     node,
//                                     kind,
//                                     field
//                                 ))
//                                     transforms.push(
//                                         toPossibleEvaluation(
//                                             context,
//                                             parent instanceof PropertyReference
//                                                 ? parent
//                                                 : node,
//                                             possible
//                                         ) ??
//                                             new Add(
//                                                 context,
//                                                 position,
//                                                 parent,
//                                                 field.name,
//                                                 possible
//                                             )
//                                     );
//                         }
//                     }
//                 }
//                 // If we've found it...
//                 else if (found) {
//                     // ... And the next node is unparsable, offer to replace.
//                     for (const kind of kinds)
//                         if (kind === undefined)
//                             transforms.push(
//                                 new Replace(context, parent, node, undefined)
//                             );
//                         else {
//                             for (const possible of getPossibleNodes(
//                                 context,
//                                 node,
//                                 kind,
//                                 field
//                             ))
//                                 transforms.push(
//                                     new Replace(context, parent, node, possible)
//                                 );
//                         }
//                     return true;
//                 }
//             }
//             // If undefined, add replacements and continue
//             else if (node === undefined) {
//                 if (found) {
//                     for (const type of kinds)
//                         if (type !== undefined)
//                             for (const possible of getPossibleNodes(
//                                 context,
//                                 node,
//                                 type,
//                                 field
//                             ))
//                                 transforms.push(
//                                     toPossibleEvaluation(
//                                         context,
//                                         parent,
//                                         possible
//                                     ) ??
//                                         new Add(
//                                             context,
//                                             position,
//                                             parent,
//                                             field.name,
//                                             possible
//                                         )
//                                 );
//                 }
//             }
//             return false;
//         }
//     );

//     // Generate transforms based on what's next in the grammar.
//     return transforms;
// }

// function getPossibleNodes(
//     context: Context,
//     node: Node | undefined,
//     kind: Function | TokenType,
//     field: Field,
//     index?: number
// ): (Node | Refer)[] {
//     const expectedType = field.getType
//         ? field.getType(context, index)
//         : undefined;
//     // Get possible definitions, using the field override if there is one, or all definitions in the node's scope at the location by default.
//     let definitions = field.getDefinitions
//         ? field.getDefinitions(context)
//         : node !== undefined
//         ? node.getDefinitionsInScope(context)
//         : [];

//     // Special case references; no need to reference binds if already referencing them, and filter by matching prefixes.
//     if (node instanceof Reference)
//         definitions = definitions.filter(
//             (def) =>
//                 (node.name === undefined ||
//                     def.names.getNameStartingWith(node.name.getText()) !==
//                         undefined) &&
//                 (!(def instanceof Bind) || !def.hasName(node.getName()))
//         );

//     switch (kind) {
//         case Bind:
//             break;
//         case Expression:
//             const possibilities = [
//                 ...definitions.map(
//                     (def) =>
//                         new Refer((name: string) => Reference.make(name), def)
//                 ),
//                 /*
//                 Block.make([ExpressionPlaceholder.make()]),
//                 BooleanLiteral.make(true),
//                 BooleanLiteral.make(false),
//                 TextLiteral.make(''),
//                 Template.make(),
//                 Conditional.make(
//                     ExpressionPlaceholder.make(),
//                     ExpressionPlaceholder.make(),
//                     ExpressionPlaceholder.make()
//                 ),
//                 ListLiteral.make([]),
//                 SetLiteral.make([]),
//                 MapLiteral.make([
//                     new KeyValue(
//                         ExpressionPlaceholder.make(),
//                         ExpressionPlaceholder.make()
//                     ),
//                 ]),
//                 FunctionDefinition.make(
//                     undefined,
//                     new Names([Name.make()]),
//                     undefined,
//                     [],
//                     ExpressionPlaceholder.make()
//                 ),
//                 StructureDefinition.make(
//                     undefined,
//                     new Names([Name.make()]),
//                     [],
//                     undefined,
//                     []
//                 ),
//                 ConversionDefinition.make(
//                     undefined,
//                     new TypePlaceholder(),
//                     new TypePlaceholder(),
//                     ExpressionPlaceholder.make()
//                 ),
//                 Reaction.make(
//                     ExpressionPlaceholder.make(),
//                     ExpressionPlaceholder.make(BooleanType.make()),
//                     ExpressionPlaceholder.make()
//                 ),
//                 */
//             ];
//             // Filter by type if we have one.
//             return expectedType
//                 ? possibilities.filter((nodeOrRef) => {
//                       const type = nodeOrRef.getType(context);
//                       return (
//                           type !== undefined &&
//                           expectedType.accepts(type, context)
//                       );
//                   })
//                 : possibilities;
//         case Type:
//             return [
//                 BooleanType.make(),
//                 ...[
//                     NumberType.make(),
//                     ...getPossibleUnits(context.project).map((u) =>
//                         NumberType.make(u)
//                     ),
//                 ],
//                 ...[
//                     TextType.make(),
//                     ...getPossibleLanguages(context.project).map((l) =>
//                         TextType.make(Language.make(l))
//                     ),
//                 ],
//                 ListType.make(new TypePlaceholder()),
//                 SetType.make(new TypePlaceholder()),
//                 MapType.make(new TypePlaceholder(), new TypePlaceholder()),
//                 // Any structure definition types that match the aren't the currently selected one.
//                 ...definitions
//                     .filter(
//                         (def): def is StructureDefinition =>
//                             def instanceof StructureDefinition
//                     )
//                     .map((s) => new NameType(s.names.getLocaleText('eng'))),
//             ];
//         case Language:
//             return getPossibleLanguages(context.project).map((lang) =>
//                 Language.make(lang)
//             );
//         case Unit:
//             return getPossibleUnits(context.project);
//         case Dimension:
//             return getPossibleDimensions(context.project).map((dim) =>
//                 Dimension.make(false, dim, 1)
//             );
//         case Docs:
//             return [new Docs([Doc.make([])])];
//         case Reference:
//             // Add references to all of the valid definitions for this reference.
//             return definitions.map(
//                 (def) => new Refer((name) => Reference.make(name), def)
//             );
//         case Token:
//             // If we know what type of token to make, make it.
//             if (field.getToken)
//                 if (definitions.length > 0)
//                     return definitions.map(
//                         (def) =>
//                             new Refer(
//                                 (name, op) =>
//                                     (field.getToken as Function)(name, op),
//                                 def
//                             )
//                     );
//                 else return [field.getToken(undefined)];
//     }

//     return [];
// }

// function getPostfixEdits(context: Context, expr: Expression): Transform[] {
//     const parent = expr.getParent(context);
//     const kind = getFieldOf(expr, context)?.types;
//     if (parent && kind && kind.allowsKind(Expression)) {
//         const type = expr.getType(context);

//         return [
//             // If the type is a boolean, offer a conditional
//             ...(type instanceof BooleanType
//                 ? [
//                       new Replace(
//                           context,
//                           parent,
//                           expr,
//                           Conditional.make(
//                               expr,
//                               ExpressionPlaceholder.make(),
//                               ExpressionPlaceholder.make()
//                           )
//                       ),
//                       new Replace(
//                           context,
//                           parent,
//                           expr,
//                           new UnaryEvaluate(
//                               new Reference(
//                                   new Token(NOT_SYMBOL, TokenType.Operator)
//                               ),
//                               expr
//                           )
//                       ),
//                   ]
//                 : []),
//             ...(type instanceof NumberType
//                 ? [
//                       new Replace(
//                           context,
//                           parent,
//                           expr,
//                           new UnaryEvaluate(
//                               new Reference(
//                                   new Token(NEGATE_SYMBOL, TokenType.Operator)
//                               ),
//                               expr
//                           )
//                       ),
//                   ]
//                 : []),
//             // If the type is a list, offer a list access
//             ...(type instanceof ListType
//                 ? [
//                       new Replace(
//                           context,
//                           parent,
//                           expr,
//                           ListAccess.make(
//                               expr,
//                               ExpressionPlaceholder.make(NumberType.make())
//                           )
//                       ),
//                   ]
//                 : []),
//             // If the type is a set or map, offer a list access
//             ...(type instanceof SetType || type instanceof MapType
//                 ? [
//                       new Replace(
//                           context,
//                           parent,
//                           expr,
//                           SetOrMapAccess.make(
//                               expr,
//                               ExpressionPlaceholder.make(SetType.make())
//                           )
//                       ),
//                   ]
//                 : []),
//             // If the type is a stream, offer a previous
//             ...(type instanceof StreamType
//                 ? [
//                       new Replace(
//                           context,
//                           parent,
//                           expr,
//                           Previous.make(
//                               expr,
//                               ExpressionPlaceholder.make(
//                                   StreamType.make(new TypePlaceholder())
//                               )
//                           )
//                       ),
//                   ]
//                 : []),
//             // Reactions
//             // ...[
//             //     new Replace(
//             //         context,
//             //         parent,
//             //         expr,
//             //         Reaction.make(
//             //             expr,
//             //             ExpressionPlaceholder.make(BooleanType.make()),
//             //             ExpressionPlaceholder.make()
//             //         )
//             //     ),
//             // ],
//             // If given a type, any binary operations that are available on the type. Wrap in a block if a BinaryEvaluate or Conditional
//             ...(type === undefined
//                 ? []
//                 : type
//                       .getDefinitionsInScope(context)
//                       .filter(
//                           (def: Definition): def is FunctionDefinition =>
//                               def instanceof FunctionDefinition &&
//                               def.isOperator()
//                       )
//                       .map(
//                           (def: FunctionDefinition) =>
//                               new Replace(
//                                   context,
//                                   parent,
//                                   expr,
//                                   new Refer(
//                                       () =>
//                                           new BinaryEvaluate(
//                                               Block.make([expr]),
//                                               Reference.make(
//                                                   def.getOperatorName() ??
//                                                       PLACEHOLDER_SYMBOL
//                                               ),
//                                               ExpressionPlaceholder.make()
//                                           ),
//                                       def
//                                   )
//                               )
//                       )),
//             // Get any conversions available
//             ...(type === undefined
//                 ? []
//                 : type
//                       .getAllConversions(context)
//                       .filter(
//                           (conversion) =>
//                               conversion.input instanceof Type &&
//                               type.accepts(conversion.input, context)
//                       )
//                       .map(
//                           (conversion) =>
//                               new Replace(
//                                   context,
//                                   parent,
//                                   expr,
//                                   Convert.make(expr, conversion.output.clone())
//                               )
//                       )),
//         ];
//     }
//     return [];
// }

// function toPossibleEvaluation(
//     context: Context,
//     ref: Node,
//     possible: Node | Refer
// ) {
//     // Replace property references with no name with full Evaluate expressions, not just the name.
//     if (
//         (ref instanceof Reference || ref instanceof PropertyReference) &&
//         possible instanceof Refer &&
//         (possible.definition instanceof FunctionDefinition ||
//             possible.definition instanceof StructureDefinition)
//     ) {
//         return toEvaluateReplacement(ref, possible.definition, context);
//     } else return undefined;
// }

// function toEvaluateReplacement(
//     ref: PropertyReference | Reference,
//     fun: FunctionDefinition | StructureDefinition,
//     context: Context
// ): Replace<Evaluate | BinaryEvaluate> | undefined {
//     const parent = context.getRoot(ref)?.getParent(ref);
//     if (parent === undefined) return;
//     const reference = Reference.make(fun.getNames()[0], fun);

//     // Use a binary op if it's binary.
//     const op = fun.names.getSymbolicName();
//     const evaluate =
//         fun.inputs.length === 1 && op !== undefined
//             ? new BinaryEvaluate(
//                   ref instanceof PropertyReference ? ref.structure : ref,
//                   Reference.make(op),
//                   ExpressionPlaceholder.make(fun.inputs[0].getType(context))
//               )
//             : Evaluate.make(
//                   ref instanceof PropertyReference
//                       ? PropertyReference.make(ref.structure, reference)
//                       : reference,
//                   fun.inputs
//                       .filter((bind) => bind.isRequired())
//                       .map((bind) => {
//                           const type = bind.getType(context);
//                           if (type instanceof FunctionType)
//                               return type.getTemplate(context);
//                           else return ExpressionPlaceholder.make(type);
//                       })
//               );

//     return new Replace(context, parent, ref, evaluate);
// }
