import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import BooleanLiteral from '@nodes/BooleanLiteral';
import BooleanType from '@nodes/BooleanType';
import Changed from '@nodes/Changed';
import Conditional from '@nodes/Conditional';
import ConversionDefinition from '@nodes/ConversionDefinition';
import Convert from '@nodes/Convert';
import Translate from '@nodes/Translate';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Input from '@nodes/Input';
import ListLiteral from '@nodes/ListLiteral';
import ListType from '@nodes/ListType';
import MapLiteral from '@nodes/MapLiteral';
import MapType from '@nodes/MapType';
import Match from '@nodes/Match';
import Names from '@nodes/Names';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import Otherwise from '@nodes/Otherwise';
import Reaction from '@nodes/Reaction';
import SetLiteral from '@nodes/SetLiteral';
import SetType from '@nodes/SetType';
import Spread from '@nodes/Spread';
import StreamType from '@nodes/StreamType';
import StructureDefinition from '@nodes/StructureDefinition';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import TypePlaceholder from '@nodes/TypePlaceholder';
import AnyType from '@nodes/AnyType';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Borrow from '@nodes/Borrow';
import ConceptLink from '@nodes/ConceptLink';
import ConversionType from '@nodes/ConversionType';
import Delete from '@nodes/Delete';
import Dimension from '@nodes/Dimension';
import Doc from '@nodes/Doc';
import Docs from '@nodes/Docs';
import DocumentedExpression from '@nodes/DocumentedExpression';
import Evaluate from '@nodes/Evaluate';
import Example from '@nodes/Example';
import FormattedLiteral from '@nodes/FormattedLiteral';
import FormattedTranslation from '@nodes/FormattedTranslation';
import FunctionType from '@nodes/FunctionType';
import Initial from '@nodes/Initial';
import Insert from '@nodes/Insert';
import Is from '@nodes/Is';
import IsLocale from '@nodes/IsLocale';
import Localized from '@nodes/Localized';
import KeyValue from '@nodes/KeyValue';
import Language from '@nodes/Language';
import ListAccess from '@nodes/ListAccess';
import Name from '@nodes/Name';
import NameType from '@nodes/NameType';
import type Node from '@nodes/Node';
import Paragraph from '@nodes/Paragraph';
import Previous from '@nodes/Previous';
import Program from '@nodes/Program';
import PropertyBind from '@nodes/PropertyBind';
import PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
import Select from '@nodes/Select';
import SetOrMapAccess from '@nodes/SetOrMapAccess';
import Source from '@nodes/Source';
import TableLiteral from '@nodes/TableLiteral';
import TableType from '@nodes/TableType';
import This from '@nodes/This';
import Translation from '@nodes/Translation';
import TypeInputs from '@nodes/TypeInputs';
import TypeVariables from '@nodes/TypeVariables';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import UnionType from '@nodes/UnionType';
import Unit from '@nodes/Unit';
import UnparsableExpression from '@nodes/UnparsableExpression';
import Update from '@nodes/Update';
import WebLink from '@nodes/WebLink';
import Words from '@nodes/Words';
import PatternNode from '@nodes/PatternNode';
import PatternLiteral from '@nodes/PatternLiteral';
import PatternType from '@nodes/PatternType';
import { toExpression } from '@parser/parseExpression';
import { PLACEHOLDER_SYMBOL } from '@parser/Symbols';

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
            if (node instanceof PatternNode && !byKind.has(node.getDescriptor()))
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
    new Paragraph([Words.make()]),
    Words.make(),

    // Types
    Is.make(ExpressionPlaceholder.make(), TypePlaceholder.make()),
    TextType.make(),
    BooleanType.make(),
    NoneType.make(),
    NumberType.make(),
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
