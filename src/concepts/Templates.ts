import Bind from '#nodes/Bind.ts';
import Block from '#nodes/Block.ts';
import BooleanLiteral from '#nodes/BooleanLiteral.ts';
import BooleanType from '#nodes/BooleanType.ts';
import Changed from '#nodes/Changed.ts';
import Conditional from '#nodes/Conditional.ts';
import ConversionDefinition from '#nodes/ConversionDefinition.ts';
import Convert from '#nodes/Convert.ts';
import Translate from '#nodes/Translate.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import FunctionDefinition from '#nodes/FunctionDefinition.ts';
import Input from '#nodes/Input.ts';
import ListLiteral from '#nodes/ListLiteral.ts';
import ListType from '#nodes/ListType.ts';
import MapLiteral from '#nodes/MapLiteral.ts';
import MapType from '#nodes/MapType.ts';
import Match from '#nodes/Match.ts';
import Names from '#nodes/Names.ts';
import NoneLiteral from '#nodes/NoneLiteral.ts';
import NoneType from '#nodes/NoneType.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import NumberType from '#nodes/NumberType.ts';
import RangeType from '#nodes/RangeType.ts';
import Otherwise from '#nodes/Otherwise.ts';
import Reaction from '#nodes/Reaction.ts';
import SetLiteral from '#nodes/SetLiteral.ts';
import SetType from '#nodes/SetType.ts';
import Spread from '#nodes/Spread.ts';
import StreamType from '#nodes/StreamType.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import TextLiteral from '#nodes/TextLiteral.ts';
import TextType from '#nodes/TextType.ts';
import TypePlaceholder from '#nodes/TypePlaceholder.ts';
import AnyType from '#nodes/AnyType.ts';
import BinaryEvaluate from '#nodes/BinaryEvaluate.ts';
import Borrow from '#nodes/Borrow.ts';
import ConceptLink from '#nodes/ConceptLink.ts';
import ConversionType from '#nodes/ConversionType.ts';
import Delete from '#nodes/Delete.ts';
import Dimension from '#nodes/Dimension.ts';
import Doc from '#nodes/Doc.ts';
import Docs from '#nodes/Docs.ts';
import DocumentedExpression from '#nodes/DocumentedExpression.ts';
import Evaluate from '#nodes/Evaluate.ts';
import Example from '#nodes/Example.ts';
import FormattedLiteral from '#nodes/FormattedLiteral.ts';
import FormattedTranslation from '#nodes/FormattedTranslation.ts';
import FunctionType from '#nodes/FunctionType.ts';
import Initial from '#nodes/Initial.ts';
import Insert from '#nodes/Insert.ts';
import Is from '#nodes/Is.ts';
import IsLocale from '#nodes/IsLocale.ts';
import Localized from '#nodes/Localized.ts';
import KeyValue from '#nodes/KeyValue.ts';
import Language from '#nodes/Language.ts';
import ListAccess from '#nodes/ListAccess.ts';
import Name from '#nodes/Name.ts';
import NameType from '#nodes/NameType.ts';
import type Node from '#nodes/Node.ts';
import Markup from '#nodes/Markup.ts';
import Paragraph from '#nodes/Paragraph.ts';
import Previous from '#nodes/Previous.ts';
import Program from '#nodes/Program.ts';
import PropertyBind from '#nodes/PropertyBind.ts';
import PropertyReference from '#nodes/PropertyReference.ts';
import Reference from '#nodes/Reference.ts';
import Select from '#nodes/Select.ts';
import SetOrMapAccess from '#nodes/SetOrMapAccess.ts';
import Source from '#nodes/Source.ts';
import TableLiteral from '#nodes/TableLiteral.ts';
import TableType from '#nodes/TableType.ts';
import This from '#nodes/This.ts';
import Translation from '#nodes/Translation.ts';
import TypeInputs from '#nodes/TypeInputs.ts';
import TypeVariable from '#nodes/TypeVariable.ts';
import TypeVariables from '#nodes/TypeVariables.ts';
import UnaryEvaluate from '#nodes/UnaryEvaluate.ts';
import UnionType from '#nodes/UnionType.ts';
import Unit from '#nodes/Unit.ts';
import UnparsableExpression from '#nodes/UnparsableExpression.ts';
import Update from '#nodes/Update.ts';
import WebLink from '#nodes/WebLink.ts';
import Words from '#nodes/Words.ts';
import PatternNode from '#nodes/PatternNode.ts';
import PatternLiteral from '#nodes/PatternLiteral.ts';
import PatternType from '#nodes/PatternType.ts';
import { toExpression } from '#parser/parseExpression.ts';
import { PLACEHOLDER_SYMBOL } from '#parser/Symbols.ts';

/**
 * One representative of every pattern construct, harvested by parsing small
 * example patterns so each pattern node becomes a browsable, `@`-linkable
 * concept (the `@PatternLiteral` doc links each one). Parsing keeps the tokens
 * valid without hand-wiring ~20 node constructors. The literal and type aren't
 * {@link PatternNode}s, so they're seeded explicitly.
 */
function patternConcepts(): Node[] {
    const examples = [
        '⣿◌ _ # ␣ … "x"⣿', // class atoms, rest, literal text, sequence
        '⣿_/greek⣿', // property
        '⣿3–5 #⣿', // quantifier + quantified
        '⣿name:(_)⣿', // capture
        '⣿~#⣿', // complement
        '⣿{"a"–"z" #}⣿', // set + range
        '⣿(◌ | #)⣿', // group
        '⣿⊢ ⊣⣿', // anchors
        '⣿▭/en ┊/en⣿', // word + word-edge
        '⣿▸(#)⣿', // lookaround
        '⣿a:(_) a⣿', // backreference
        '⣿Aa("x")⣿', // case-fold
    ];
    const byKind = new Map<string, Node>([
        ['PatternLiteral', PatternLiteral.make()],
        ['PatternType', PatternType.make()],
    ]);
    for (const source of examples)
        for (const node of toExpression(source).nodes())
            if (
                node instanceof PatternNode &&
                !byKind.has(node.getDescriptor())
            )
                byKind.set(node.getDescriptor(), node);
    return [...byKind.values()];
}

/** These are ordered by appearance in the guide. */
const Templates: Node[] = [
    // Inputs
    Reaction.make(
        ExpressionPlaceholder.make(),
        ExpressionPlaceholder.make(BooleanType.make()),
        ExpressionPlaceholder.make(),
    ),
    Changed.make(ExpressionPlaceholder.make(StreamType.make())),
    Previous.make(
        ExpressionPlaceholder.make(StreamType.make()),
        NumberLiteral.make(1),
    ),

    // Bind
    Bind.make(
        undefined,
        Names.make([PLACEHOLDER_SYMBOL]),
        undefined,
        ExpressionPlaceholder.make(),
    ),
    Block.make([ExpressionPlaceholder.make()]),
    Evaluate.make(ExpressionPlaceholder.make(), []),
    FunctionDefinition.make(
        undefined,
        Names.make([PLACEHOLDER_SYMBOL]),
        undefined,
        [],
        ExpressionPlaceholder.make(),
    ),
    StructureDefinition.make(
        undefined,
        Names.make([PLACEHOLDER_SYMBOL]),
        [],
        undefined,
        [],
    ),
    PropertyReference.make(
        ExpressionPlaceholder.make(),
        Reference.make(PLACEHOLDER_SYMBOL),
    ),
    PropertyBind.make(
        PropertyReference.make(
            ExpressionPlaceholder.make(),
            Reference.make(PLACEHOLDER_SYMBOL),
        ),
        ExpressionPlaceholder.make(),
    ),
    This.make(),

    // Decisions
    Conditional.make(
        ExpressionPlaceholder.make(BooleanType.make()),
        ExpressionPlaceholder.make(),
        ExpressionPlaceholder.make(),
    ),
    Otherwise.make(ExpressionPlaceholder.make(), ExpressionPlaceholder.make()),
    Match.make(
        ExpressionPlaceholder.make(),
        [
            KeyValue.make(
                ExpressionPlaceholder.make(),
                ExpressionPlaceholder.make(),
            ),
        ],
        ExpressionPlaceholder.make(),
    ),

    // Numbers
    NumberLiteral.make(0),
    Dimension.make(false, PLACEHOLDER_SYMBOL, 1),
    Unit.reuse(['unit']),

    // Truth
    BooleanLiteral.make(true),
    NoneLiteral.make(),

    // Lists
    ListLiteral.make(),
    ListAccess.make(
        ExpressionPlaceholder.make(ListType.make()),
        ExpressionPlaceholder.make(),
    ),
    Spread.make(ExpressionPlaceholder.make()),

    // Sets
    SetLiteral.make(),
    MapLiteral.make(),

    // Text
    TextLiteral.make(''),
    FormattedLiteral.make([FormattedTranslation.make([])]),
    Translation.make(),
    FormattedTranslation.make([]),
    Language.make('en'),
    IsLocale.make(Language.make('en')),
    Localized.make(
        ExpressionPlaceholder.make(TextType.make()),
        Language.make('en'),
    ),

    // Sets and Maps
    KeyValue.make(ExpressionPlaceholder.make(), ExpressionPlaceholder.make()),
    SetOrMapAccess.make(
        ExpressionPlaceholder.make(SetType.make()),
        ExpressionPlaceholder.make(),
    ),

    // Tables
    TableLiteral.make(),
    Insert.make(ExpressionPlaceholder.make(TableType.make())),
    Select.make(
        ExpressionPlaceholder.make(TableType.make()),
        ExpressionPlaceholder.make(BooleanType.make()),
    ),
    Update.make(
        ExpressionPlaceholder.make(TableType.make()),
        ExpressionPlaceholder.make(BooleanType.make()),
    ),
    Delete.make(
        ExpressionPlaceholder.make(TableType.make()),
        ExpressionPlaceholder.make(BooleanType.make()),
    ),

    // Documentation
    Doc.make([new Paragraph([Words.make()])]),
    new DocumentedExpression(
        new Docs([Doc.make([new Paragraph([Words.make()])])]),
        ExpressionPlaceholder.make(),
    ),
    new Docs([
        Doc.make([new Paragraph([Words.make()])]),
        Doc.make([new Paragraph([Words.make()])]),
    ]),
    ConceptLink.make(PLACEHOLDER_SYMBOL),
    WebLink.make('🔗', 'http://wordplay.dev'),
    Example.make(Program.make([ExpressionPlaceholder.make()])),
    new Markup([new Paragraph([Words.make()])]),
    new Paragraph([Words.make()]),
    Words.make(),

    // Types
    Is.make(ExpressionPlaceholder.make(), TypePlaceholder.make()),
    TextType.make(),
    BooleanType.make(),
    NoneType.make(),
    NumberType.make(),
    RangeType.make(),
    ListType.make(),
    SetType.make(),
    MapType.make(TypePlaceholder.make(), TypePlaceholder.make()),
    TableType.make(),
    NameType.make(PLACEHOLDER_SYMBOL),
    FunctionType.make(undefined, [], TypePlaceholder.make()),
    UnionType.make(TypePlaceholder.make(), TypePlaceholder.make()),
    ConversionDefinition.make(
        undefined,
        new TypePlaceholder(),
        new TypePlaceholder(),
        ExpressionPlaceholder.make(),
    ),
    TypeInputs.make([]),
    TypeVariable.make([PLACEHOLDER_SYMBOL]),
    TypeVariables.make([]),
    new AnyType(),
    StreamType.make(),

    // Advanced
    Initial.make(),
    Input.make('_', ExpressionPlaceholder.make()),
    new BinaryEvaluate(
        ExpressionPlaceholder.make(),
        Reference.make(PLACEHOLDER_SYMBOL),
        ExpressionPlaceholder.make(),
    ),
    new UnaryEvaluate(Reference.make('-'), ExpressionPlaceholder.make()),
    ExpressionPlaceholder.make(),
    Convert.make(ExpressionPlaceholder.make(), TypePlaceholder.make()),
    Translate.make(ExpressionPlaceholder.make(), This.make()),
    Name.make(PLACEHOLDER_SYMBOL),
    Names.make([PLACEHOLDER_SYMBOL]),
    Reference.make(PLACEHOLDER_SYMBOL),
    ConversionType.make(TypePlaceholder.make(), TypePlaceholder.make()),
    new UnparsableExpression([]),
    Program.make([ExpressionPlaceholder.make()]),
    new Source('?', PLACEHOLDER_SYMBOL),
    new Borrow(),

    // Patterns — every pattern construct, so each is a browsable concept.
    ...patternConcepts(),
];

export { Templates as default };
