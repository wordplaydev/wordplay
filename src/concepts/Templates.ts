import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import BooleanLiteral from '@nodes/BooleanLiteral';
import BooleanType from '@nodes/BooleanType';
import Changed from '@nodes/Changed';
import Conditional from '@nodes/Conditional';
import ConversionDefinition from '@nodes/ConversionDefinition';
import Convert from '@nodes/Convert';
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
import AnyType from '../nodes/AnyType';
import BinaryEvaluate from '../nodes/BinaryEvaluate';
import Borrow from '../nodes/Borrow';
import ConceptLink from '../nodes/ConceptLink';
import ConversionType from '../nodes/ConversionType';
import Delete from '../nodes/Delete';
import Dimension from '../nodes/Dimension';
import Doc from '../nodes/Doc';
import Docs from '../nodes/Docs';
import DocumentedExpression from '../nodes/DocumentedExpression';
import Evaluate from '../nodes/Evaluate';
import Example from '../nodes/Example';
import FormattedLiteral from '../nodes/FormattedLiteral';
import FormattedTranslation from '../nodes/FormattedTranslation';
import FunctionType from '../nodes/FunctionType';
import Initial from '../nodes/Initial';
import Insert from '../nodes/Insert';
import Is from '../nodes/Is';
import IsLocale from '../nodes/IsLocale';
import KeyValue from '../nodes/KeyValue';
import Language from '../nodes/Language';
import ListAccess from '../nodes/ListAccess';
import Name from '../nodes/Name';
import NameType from '../nodes/NameType';
import type Node from '../nodes/Node';
import Paragraph from '../nodes/Paragraph';
import Previous from '../nodes/Previous';
import Program from '../nodes/Program';
import PropertyBind from '../nodes/PropertyBind';
import PropertyReference from '../nodes/PropertyReference';
import Reference from '../nodes/Reference';
import Select from '../nodes/Select';
import SetOrMapAccess from '../nodes/SetOrMapAccess';
import Source from '../nodes/Source';
import TableLiteral from '../nodes/TableLiteral';
import TableType from '../nodes/TableType';
import This from '../nodes/This';
import Translation from '../nodes/Translation';
import TypeInputs from '../nodes/TypeInputs';
import TypeVariables from '../nodes/TypeVariables';
import UnaryEvaluate from '../nodes/UnaryEvaluate';
import UnionType from '../nodes/UnionType';
import Unit from '../nodes/Unit';
import UnparsableExpression from '../nodes/UnparsableExpression';
import Update from '../nodes/Update';
import WebLink from '../nodes/WebLink';
import Words from '../nodes/Words';
import { PLACEHOLDER_SYMBOL } from '../parser/Symbols';

/** These are ordered by appearance in the docs. */
const Templates: Node[] = [
    // Evaluation
    Evaluate.make(ExpressionPlaceholder.make(), []),
    Input.make('_', ExpressionPlaceholder.make()),

    FunctionDefinition.make(
        undefined,
        Names.make(['_']),
        undefined,
        [],
        ExpressionPlaceholder.make(),
    ),
    new BinaryEvaluate(
        ExpressionPlaceholder.make(),
        Reference.make(PLACEHOLDER_SYMBOL),
        ExpressionPlaceholder.make(),
    ),
    new UnaryEvaluate(Reference.make('-'), ExpressionPlaceholder.make()),
    Block.make([ExpressionPlaceholder.make()]),
    ExpressionPlaceholder.make(),
    Convert.make(ExpressionPlaceholder.make(), TypePlaceholder.make()),
    ConversionDefinition.make(
        undefined,
        new TypePlaceholder(),
        new TypePlaceholder(),
        ExpressionPlaceholder.make(),
    ),
    ListAccess.make(
        ExpressionPlaceholder.make(ListType.make()),
        ExpressionPlaceholder.make(),
    ),
    SetOrMapAccess.make(
        ExpressionPlaceholder.make(SetType.make()),
        ExpressionPlaceholder.make(),
    ),
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

    // Project
    Program.make([ExpressionPlaceholder.make()]),
    new Source('?', '_'),
    new Borrow(),

    // Decisions
    Conditional.make(
        ExpressionPlaceholder.make(BooleanType.make()),
        ExpressionPlaceholder.make(),
        ExpressionPlaceholder.make(),
    ),
    Is.make(ExpressionPlaceholder.make(), TypePlaceholder.make()),
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
    IsLocale.make(Language.make(undefined)),
    Initial.make(),
    Changed.make(ExpressionPlaceholder.make(StreamType.make())),
    Reaction.make(
        ExpressionPlaceholder.make(),
        ExpressionPlaceholder.make(BooleanType.make()),
        ExpressionPlaceholder.make(),
    ),
    Previous.make(
        ExpressionPlaceholder.make(StreamType.make()),
        ExpressionPlaceholder.make(NumberType.make()),
    ),

    // Bind
    Bind.make(
        undefined,
        Names.make([PLACEHOLDER_SYMBOL]),
        undefined,
        ExpressionPlaceholder.make(),
    ),
    Name.make('a'),
    Names.make(['a', 'b']),
    Reference.make('_'),
    StructureDefinition.make(
        undefined,
        Names.make(['_']),
        [],
        undefined,
        [],
        Block.make([ExpressionPlaceholder.make()]),
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

    // Types
    BooleanType.make(),
    TextType.make(),
    NumberType.make(),
    Unit.reuse(['unit']),
    ListType.make(),
    SetType.make(),
    NoneType.make(),
    MapType.make(TypePlaceholder.make(), TypePlaceholder.make()),
    UnionType.make(TypePlaceholder.make(), TypePlaceholder.make()),
    NameType.make('_'),
    TypeInputs.make([]),
    TypeVariables.make([]),
    ConversionType.make(TypePlaceholder.make(), TypePlaceholder.make()),
    Dimension.make(false, PLACEHOLDER_SYMBOL, 1),
    new AnyType(),
    FunctionType.make(undefined, [], TypePlaceholder.make()),
    StreamType.make(),
    TableType.make(),

    // Values
    KeyValue.make(ExpressionPlaceholder.make(), ExpressionPlaceholder.make()),
    new FormattedLiteral([FormattedTranslation.make([])]),
    TextLiteral.make(''),
    NumberLiteral.make(0),
    BooleanLiteral.make(true),
    NoneLiteral.make(),
    ListLiteral.make(),
    Spread.make(ExpressionPlaceholder.make()),
    SetLiteral.make(),
    MapLiteral.make(),
    TableLiteral.make(),
    Translation.make(),
    FormattedTranslation.make([]),

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
    Language.make('en'),
    Example.make(Program.make()),
    new Paragraph([Words.make()]),
    Words.make(),
    new UnparsableExpression([]),
];

export { Templates as default };
