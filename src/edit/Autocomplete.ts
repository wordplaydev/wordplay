import Append from '@edit/Append';
import Assign from '@edit/Assign';
import Refer from '@edit/Refer';
import Replace from '@edit/Replace';
import type Revision from '@edit/Revision';
import BooleanLiteral from '@nodes/BooleanLiteral';
import type Context from '@nodes/Context';
import FormattedLiteral from '@nodes/FormattedLiteral';
import Input from '@nodes/Input';
import Match from '@nodes/Match';
import Node, { Empty, ListOf, type Field, type NodeKind } from '@nodes/Node';
import Otherwise from '@nodes/Otherwise';
import SetOrMapAccess from '@nodes/SetOrMapAccess';
import Spread from '@nodes/Spread';
import TableType from '@nodes/TableType';
import type Project from '../db/projects/Project';
import type Locales from '../locale/Locales';
import BinaryEvaluate from '../nodes/BinaryEvaluate';
import Bind from '../nodes/Bind';
import Block from '../nodes/Block';
import BooleanType from '../nodes/BooleanType';
import Changed from '../nodes/Changed';
import Conditional from '../nodes/Conditional';
import ConversionDefinition from '../nodes/ConversionDefinition';
import Convert from '../nodes/Convert';
import Delete from '../nodes/Delete';
import Dimension from '../nodes/Dimension';
import Doc from '../nodes/Doc';
import Docs from '../nodes/Docs';
import Evaluate from '../nodes/Evaluate';
import Example from '../nodes/Example';
import Expression from '../nodes/Expression';
import ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
import FunctionDefinition from '../nodes/FunctionDefinition';
import FunctionType from '../nodes/FunctionType';
import Initial from '../nodes/Initial';
import Insert from '../nodes/Insert';
import Is from '../nodes/Is';
import IsLocale from '../nodes/IsLocale';
import KeyValue from '../nodes/KeyValue';
import Language from '../nodes/Language';
import ListAccess from '../nodes/ListAccess';
import ListLiteral from '../nodes/ListLiteral';
import ListType from '../nodes/ListType';
import MapLiteral from '../nodes/MapLiteral';
import MapType from '../nodes/MapType';
import Markup from '../nodes/Markup';
import Mention from '../nodes/Mention';
import NoneLiteral from '../nodes/NoneLiteral';
import NoneType from '../nodes/NoneType';
import NumberLiteral from '../nodes/NumberLiteral';
import NumberType from '../nodes/NumberType';
import Paragraph from '../nodes/Paragraph';
import Previous from '../nodes/Previous';
import Program from '../nodes/Program';
import PropertyBind from '../nodes/PropertyBind';
import PropertyReference from '../nodes/PropertyReference';
import Reaction from '../nodes/Reaction';
import Reference from '../nodes/Reference';
import Select from '../nodes/Select';
import SetLiteral from '../nodes/SetLiteral';
import SetType from '../nodes/SetType';
import StructureDefinition from '../nodes/StructureDefinition';
import { WildcardSymbols } from '../nodes/Sym';
import TableLiteral from '../nodes/TableLiteral';
import TextLiteral from '../nodes/TextLiteral';
import TextType from '../nodes/TextType';
import This from '../nodes/This';
import Token from '../nodes/Token';
import type Type from '../nodes/Type';
import TypeInputs from '../nodes/TypeInputs';
import TypePlaceholder from '../nodes/TypePlaceholder';
import TypeVariables from '../nodes/TypeVariables';
import UnaryEvaluate from '../nodes/UnaryEvaluate';
import UnionType from '../nodes/UnionType';
import Unit from '../nodes/Unit';
import UnknownType from '../nodes/UnknownType';
import UnparsableExpression from '../nodes/UnparsableExpression';
import Update from '../nodes/Update';
import WebLink from '../nodes/WebLink';
import type Caret from './Caret';
import Remove from './Remove';

/** A logging flag, helpful for analyzing the control flow of autocomplete when debugging. */
const LOG = false;
function note(message: string, level: number) {
    if (LOG) console.log(`${'  '.repeat(level)}Autocomplete: ${message}`);
}

/** Given a project and a caret, generate a set of transforms that can be applied at the location. */
export function getEditsAt(
    project: Project,
    caret: Caret,
    locales: Locales,
): Revision[] {
    const source = caret.source;
    const context = project.getContext(source);

    const isEmptyLine = caret.isEmptyLine();

    let edits: Revision[] = [];

    // If the token is a node, find the allowable nodes to replace this node, or whether it's removable
    if (caret.position instanceof Node) {
        note(
            `Getting possible field edits for node selection ${caret.position.toWordplay()}`,
            1,
        );

        edits = getNodeEdits(caret.position, context);
    }
    // If the token is a position rather than a node, find edits for the nodes between.
    else if (caret.isPosition()) {
        note(`Caret is position, finding nodes before and after.`, 0);

        // If there are no nodes between (because the caret is in the middle of a token)
        if (caret.insideToken() && caret.tokenExcludingSpace) {
            note(
                `Inside token, getting possible replacements for it ${caret.tokenExcludingSpace.toWordplay()}`,
                1,
            );

            edits = getNodeEdits(caret.tokenExcludingSpace, context);
        }

        const { before, after } = caret.getNodesBetween();
        const adjacent = caret.position === caret.tokenSpaceIndex;

        // For each node before, get edits for what can come after.
        for (const node of before) {
            note(`Getting field relative edits of ${node.toWordplay()}`, 1);
            edits = [
                ...edits,
                ...getRelativeFieldEdits(
                    true,
                    node,
                    caret.position,
                    adjacent,
                    isEmptyLine,
                    context,
                    locales,
                ),
            ];
        }

        // For each node after, get edits for what can come before.
        for (const node of after) {
            note(`Getting field relative edits of ${node.toWordplay()}`, 1);
            edits = [
                ...edits,
                ...getRelativeFieldEdits(
                    false,
                    node,
                    caret.position,
                    adjacent,
                    isEmptyLine,
                    context,
                    locales,
                ),
            ];
        }

        // We have to special case empty Program Blocks. This is because all other sequences are
        // delimited except for program blocks, so when we're in an empty program block, there is no
        // delimiter to anchor off of.
        if (context.source.leaves().length === 1) {
            note(`Getting edits for empty block`, 1);

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
                                context,
                            )
                                .filter(
                                    (kind): kind is Node | Refer =>
                                        kind !== undefined,
                                )
                                .map(
                                    (insertion) =>
                                        new Append(
                                            context,
                                            caret.position as number,
                                            source.expression.expression,
                                            source.expression.expression.statements,
                                            0,
                                            insertion,
                                        ),
                                ),
                        )
                        .flat(),
                ];
            }
        }
    }

    note(`Removing duplicates`, 0);

    return edits.filter(
        (edit1, index1) =>
            !edits.some(
                (edit2, index2) => index2 > index1 && edit1.equals(edit2),
            ),
    );
}

/** Given a node, get possible replacements */
function getNodeEdits(anchor: Node, context: Context) {
    let edits: Revision[] = [];

    // Get the allowed kinds on this node and then translate them into replacement edits.
    edits = getFieldEdits(anchor, context, (field, parent, node) => {
        // Match the type of the current node
        const expectedType = field.getType
            ? field.getType(context, undefined)
            : undefined;
        // Get the value of the field.
        const fieldValue = parent.getField(field.name);

        note(
            `Finding possible replacement nodes for "${
                field.name
            }" with type ${expectedType?.toWordplay()}`,
            2,
        );

        return [
            // Generate all the possible types
            ...field.kind
                .enumerate()
                .map((kind) =>
                    getPossibleNodes(
                        field,
                        kind,
                        expectedType,
                        node,
                        true,
                        context,
                    ).map(
                        (replacement) =>
                            new Replace(context, parent, node, replacement),
                    ),
                )
                .flat(),
            // Is this node in a list field? Offer to remove it if it can be empty or can't but has more than one element.
            ...(field.kind instanceof ListOf &&
            (field.kind.allowsEmpty ||
                (Array.isArray(fieldValue) && fieldValue.length > 1))
                ? [new Remove(context, parent, node)]
                : []),
        ];
    });

    const selection = anchor;
    const parent = anchor.getParent(context);
    const field = parent?.getFieldOfChild(selection);
    if (parent && field) {
        // Is the field optional and set?
        if (
            field.kind.isOptional() &&
            parent.getField(field.name) !== undefined
        ) {
            note(`Field is optional and set, offering removal.`, 1);
            edits = [
                ...edits,
                new Remove(
                    context,
                    parent,
                    selection,
                    // When removing this field, we also have to remove any dependencies it has,
                    // as specified by any empty fields.
                    ...(field.kind
                        .enumerateFieldKinds()
                        .find((kind): kind is Empty => kind instanceof Empty)
                        ?.getDependencies(parent, context) ?? []),
                ),
            ];
        }
    }

    return edits;
}

/** Given a node, it's context, and a handler, generate a set of transforms appropriate to modify that node and its surroundings. */
function getFieldEdits(
    node: Node,
    context: Context,
    handler: (field: Field, parent: Node, node: Node) => Revision[],
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

/** Given an anchor node, find the field it corresponds to, and find what it might be able to be replaced with. */
function getRelativeFieldEdits(
    isAfterAnchor: boolean,
    anchorNode: Node,
    position: number,
    adjacent: boolean,
    /** True if the line the caret is on is empty */
    empty: boolean,
    context: Context,
    locales: Locales,
): Revision[] {
    let edits: Revision[] = [];

    const parent = anchorNode.getParent(context);
    // Don't replace the program block.
    if (parent instanceof Program) return [];
    const field = parent?.getFieldOfChild(anchorNode);
    if (parent === undefined || field === undefined) return [];

    // Generate possible nodes that could replace the token prior
    // (e.g., autocomplete References, create binary operations)
    // We only do this if this is before, and we're immediately after
    // a node, and for replacements that "complete" the existing parent.
    if (isAfterAnchor && adjacent) {
        // If the anchor is in a list, get it's index.
        const list = parent.getField(field.name);
        const index = Array.isArray(list)
            ? list.indexOf(anchorNode)
            : undefined;

        // Determine the expected type, which the field can tell us.
        const expectedType = field.getType
            ? field.getType(context, index)
            : undefined;

        note(
            `Getting replacements that would "complete" ${anchorNode.toWordplay()} of type ${expectedType?.toWordplay()}`,
            2,
        );

        edits = [
            ...edits,
            ...field.kind
                .enumerate()
                .map((kind) =>
                    getPossibleNodes(
                        field,
                        kind,
                        expectedType instanceof UnknownType
                            ? undefined
                            : expectedType,
                        anchorNode,
                        true,
                        context,
                    )
                        // If not on an empty line, only include recommendations that "complete" the selection
                        .filter(
                            (replacement) =>
                                empty ||
                                (replacement !== undefined &&
                                    completes(
                                        anchorNode,
                                        replacement instanceof Node
                                            ? replacement
                                            : replacement.getNode(locales),
                                    )),
                        )
                        // Convert the matching nodes to replacements.
                        .map(
                            (replacement) =>
                                new Replace(
                                    context,
                                    parent,
                                    anchorNode,
                                    replacement,
                                ),
                        ),
                )
                .flat(),
        ];
    }

    // Scan the parent's grammar for fields before or after to the current node the caret is it.
    const grammar = parent.getGrammar();
    const fieldIndex = grammar.findIndex((f) => f.name === field.name);
    const relativeFields = isAfterAnchor
        ? grammar.slice(fieldIndex)
        : // We reverse this so we can from most proximal to anchor to the beginning of the node.
          grammar.slice(0, fieldIndex + 1).reverse();

    for (const relativeField of relativeFields) {
        note(
            `Checking field "${relativeField.name}" for possible insertions or field sets`,
            2,
        );

        const fieldValue = parent.getField(relativeField.name);
        const fieldIsEmpty =
            fieldValue === undefined ||
            fieldValue instanceof ExpressionPlaceholder ||
            (fieldValue instanceof UnparsableExpression &&
                fieldValue.isEmpty()) ||
            (fieldValue instanceof Unit && fieldValue.isUnitless());

        // If the field is a list, and it's not a block, or we're on an empty line in a block, get possible insertions for all allowable node kinds.
        if (
            relativeField.kind instanceof ListOf &&
            (!(parent instanceof Block) || empty)
        ) {
            const list = parent.getField(relativeField.name);
            if (Array.isArray(list)) {
                // Account for empty lists, as the node might not be in the list, as its an opening delimiter.
                // If it's not in the list, it's either an empty list, in which we're inserting at the beginning,
                // or it's not empty, and we're before the end.
                const index =
                    list.length === 0
                        ? 0
                        : Math.max(list.length - 1, list.indexOf(anchorNode)) +
                          1;
                if (index >= 0) {
                    // Find the expected type of the position in the list.
                    // Some lists don't care, other lists do (e.g., Evaluate has very specific type expectations based on it's function definnition).
                    // If this field is before, then we do the index after. If the field we're analyzing is after, we keep the current index as the insertion point.
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
                                    anchorNode,
                                    false,
                                    context,
                                )
                                    // Some nodes will suggest removals. We filter those here.
                                    .filter(
                                        (kind): kind is Node | Refer =>
                                            kind !== undefined,
                                    )
                                    .map(
                                        (insertion) =>
                                            new Append(
                                                context,
                                                position,
                                                parent,
                                                list,
                                                index + 1,
                                                insertion,
                                            ),
                                    ),
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
                                anchorNode,
                                false,
                                context,
                            )
                                // Filter out any undefined values, since the field is already undefined.
                                .filter((node) => node !== undefined)
                                .map((addition) => {
                                    // Are there any other fields required to be set when this one is set?
                                    // Include it in the proposed assignment.
                                    const otherNodes = relativeField.kind
                                        .enumerateFieldKinds()
                                        .filter(
                                            (kind): kind is Empty =>
                                                kind instanceof Empty &&
                                                kind.dependency !== undefined &&
                                                parent.getField(
                                                    kind.dependency.name,
                                                ) === undefined,
                                        )
                                        .map((kind) => {
                                            if (kind.dependency) {
                                                return {
                                                    field: kind.dependency.name,
                                                    node: kind.dependency.createDefault(),
                                                };
                                            } else return undefined;
                                        })
                                        .filter(
                                            (addition) =>
                                                addition !== undefined,
                                        );

                                    return new Assign(
                                        context,
                                        position,
                                        parent,
                                        [
                                            {
                                                field: relativeField.name,
                                                node: addition,
                                            },
                                            ...otherNodes,
                                        ],
                                    );
                                }),
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
    // Completes if it contains a node equal to the original node
    const replacementNodes = replacement.nodes();
    if (replacementNodes.some((node) => node.isEqualTo(original))) return true;

    // Completes if there's a name in the replacement that completes the original node.
    const originalNodes = original.nodes();
    return replacementNodes.some((n1) =>
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
        }),
    );
}

/** A list of node types from which we can generate replacements. Order affects where they appear in autocomplete menus. */
const PossibleNodes = [
    // Put references first.
    Reference,
    // Literals
    NumberLiteral,
    BooleanLiteral,
    TextLiteral,
    FormattedLiteral,
    NoneLiteral,
    ListLiteral,
    ListAccess,
    Spread,
    KeyValue,
    SetLiteral,
    MapLiteral,
    SetOrMapAccess,
    ExpressionPlaceholder,
    // Define
    FunctionDefinition,
    StructureDefinition,
    ConversionDefinition,
    // Binds and blocks
    Bind,
    Block,
    PropertyReference,
    PropertyBind,
    Language,
    // Evaluation
    BinaryEvaluate,
    UnaryEvaluate,
    Evaluate,
    Input,
    Convert,
    // Conditions
    Conditional,
    Is,
    IsLocale,
    Otherwise,
    Match,
    This,
    // Streams
    Reaction,
    Initial,
    Previous,
    Changed,
    // Docs,
    Doc,
    Docs,
    Example,
    Markup,
    Mention,
    Paragraph,
    WebLink,
    // Tables
    TableLiteral,
    Insert,
    Select,
    Delete,
    Update,
    // Types
    TypeInputs,
    TypeVariables,
    FunctionType,
    TypePlaceholder,
    UnionType,
    Unit,
    Dimension,
    BooleanType,
    ListType,
    MapType,
    NoneType,
    NumberType,
    SetType,
    TextType,
    TableType,
];

function getPossibleNodes(
    field: Field,
    kind: NodeKind,
    expectedType: Type | undefined,
    anchor: Node,
    selected: boolean,
    context: Context,
): (Node | Refer | undefined)[] {
    // Undefined? That's just undefined,
    if (kind === undefined) return [undefined];
    // Symbol? That's just a token. We use the symbol's string as the text. Don't recommend it if it's already that.
    if (!(kind instanceof Function)) {
        const newToken = new Token(kind.toString(), kind);
        // Don't generate tokens on uncompletable fields, tokens that are equal to the existing token, or tokens that are numbers, text, or names.
        return field.uncompletable ||
            newToken.isEqualTo(anchor) ||
            WildcardSymbols.has(kind)
            ? []
            : [newToken];
    }

    const menuContext = { node: anchor, context, type: expectedType };

    // Otherwise, it's a non-terminal. Let's find all the nodes that we can make that satisify the node kind,
    // creating nodes or node references that are compatible with the requested kind.
    return (
        // Filter nodes by the kind provided.
        PossibleNodes.filter(
            (possibleKind) =>
                possibleKind.prototype instanceof kind || kind === possibleKind,
        )
            // Convert each node type to possible nodes. Each node implements a static function that generates possibilities
            // from the context given.
            .map((possibleKind) =>
                selected
                    ? possibleKind.getPossibleReplacements(menuContext)
                    : possibleKind.getPossibleAppends(menuContext),
            )
            // Flatten the list of possible nodes.
            .flat()
            .filter(
                (node) =>
                    // Filter out nodes that don't match the given type, if provided.
                    (expectedType === undefined ||
                        !(node instanceof Expression) ||
                        expectedType.accepts(node.getType(context), context)) &&
                    // Filter out nodes that are equivalent to the selection node
                    (anchor === undefined ||
                        (node instanceof Refer &&
                            (!(anchor instanceof Reference) ||
                                (anchor instanceof Reference &&
                                    node.definition !==
                                        anchor.resolve(context)))) ||
                        (node instanceof Node && !anchor.isEqualTo(node))),
            )
    );
}
