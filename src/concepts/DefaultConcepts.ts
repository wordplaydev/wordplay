import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import BooleanLiteral from '@nodes/BooleanLiteral';
import BooleanType from '@nodes/BooleanType';
import Changed from '@nodes/Changed';
import Conditional from '@nodes/Conditional';
import type Context from '@nodes/Context';
import ConversionDefinition from '@nodes/ConversionDefinition';
import Convert from '@nodes/Convert';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import FunctionDefinition from '@nodes/FunctionDefinition';
import type LanguageCode from '@locale/LanguageCode';
import ListLiteral from '@nodes/ListLiteral';
import ListType from '@nodes/ListType';
import MapLiteral from '@nodes/MapLiteral';
import MapType from '@nodes/MapType';
import MeasurementLiteral from '@nodes/MeasurementLiteral';
import MeasurementType from '@nodes/MeasurementType';
import Names from '@nodes/Names';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import Reaction from '@nodes/Reaction';
import SetLiteral from '@nodes/SetLiteral';
import SetType from '@nodes/SetType';
import StreamType from '@nodes/StreamType';
import StructureDefinition from '@nodes/StructureDefinition';
import Template from '@nodes/Template';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import TypePlaceholder from '@nodes/TypePlaceholder';
import type Concept from './Concept';
import NodeConcept from './NodeConcept';
import FunctionConcept from './FunctionConcept';
import StructureConcept from './StructureConcept';
import Purpose from './Purpose';
import type Node from '../nodes/Node';
import AnyType from '../nodes/AnyType';
import BinaryOperation from '../nodes/BinaryOperation';
import { CONVERT_SYMBOL, PLACEHOLDER_SYMBOL } from '../parser/Symbols';
import ConceptLink from '../nodes/ConceptLink';
import ConversionType from '../nodes/ConversionType';
import Dimension from '../nodes/Dimension';
import Doc from '../nodes/Doc';
import Paragraph from '../nodes/Paragraph';
import Words from '../nodes/Words';
import TokenType from '../nodes/TokenType';
import Token from '../nodes/Token';
import Evaluate from '../nodes/Evaluate';
import Example from '../nodes/Example';
import Program from '../nodes/Program';
import FunctionType from '../nodes/FunctionType';
import Initial from '../nodes/Initial';
import Is from '../nodes/Is';
import KeyValue from '../nodes/KeyValue';
import Language from '../nodes/Language';
import ListAccess from '../nodes/ListAccess';
import Previous from '../nodes/Previous';
import PropertyBind from '../nodes/PropertyBind';
import PropertyReference from '../nodes/PropertyReference';
import Reference from '../nodes/Reference';
import This from '../nodes/This';
import TypeInputs from '../nodes/TypeInputs';
import TypeVariables from '../nodes/TypeVariables';
import UnaryOperation from '../nodes/UnaryOperation';
import UnionType from '../nodes/UnionType';
import WebLink from '../nodes/WebLink';
import UnparsableExpression from '../nodes/UnparsableExpression';
import Unit from '../nodes/Unit';
import type { Native } from '../native/Native';
import Docs from '../nodes/Docs';
import Name from '../nodes/Name';
import DocumentedExpression from '../nodes/DocumentedExpression';
import ListCloseToken from '../nodes/ListCloseToken';
import EvalOpenToken from '../nodes/EvalOpenToken';
import SetCloseToken from '../nodes/SetCloseToken';

/** These are ordered by appearance in the docs. */
const template: Node[] = [
    // Evaluation
    Evaluate.make(ExpressionPlaceholder.make(), []),
    FunctionDefinition.make(
        undefined,
        Names.make(['_']),
        undefined,
        [],
        ExpressionPlaceholder.make()
    ),
    new BinaryOperation(
        ExpressionPlaceholder.make(),
        new Token(PLACEHOLDER_SYMBOL, TokenType.BinaryOperator),
        ExpressionPlaceholder.make()
    ),
    new UnaryOperation(
        new Token('-', TokenType.UnaryOperator),
        ExpressionPlaceholder.make()
    ),
    Block.make([ExpressionPlaceholder.make()]),
    ConversionDefinition.make(
        undefined,
        new TypePlaceholder(),
        new TypePlaceholder(),
        ExpressionPlaceholder.make()
    ),
    ExpressionPlaceholder.make(),
    Program.make(),
    Convert.make(ExpressionPlaceholder.make(), TypePlaceholder.make()),

    // Decisions
    Conditional.make(
        ExpressionPlaceholder.make(BooleanType.make()),
        ExpressionPlaceholder.make(),
        ExpressionPlaceholder.make()
    ),
    Is.make(ExpressionPlaceholder.make(), TypePlaceholder.make()),
    Reaction.make(
        ExpressionPlaceholder.make(),
        ExpressionPlaceholder.make(BooleanType.make()),
        ExpressionPlaceholder.make()
    ),
    Initial.make(),
    Changed.make(ExpressionPlaceholder.make(StreamType.make())),

    // Bindings
    Name.make('@'),
    Names.make(['a', 'b']),
    Bind.make(
        undefined,
        Names.make([PLACEHOLDER_SYMBOL]),
        undefined,
        ExpressionPlaceholder.make()
    ),
    Reference.make('_'),
    PropertyReference.make(
        ExpressionPlaceholder.make(),
        Reference.make(PLACEHOLDER_SYMBOL)
    ),
    PropertyBind.make(
        PropertyReference.make(
            ExpressionPlaceholder.make(),
            Reference.make(PLACEHOLDER_SYMBOL)
        ),
        PLACEHOLDER_SYMBOL,
        ExpressionPlaceholder.make()
    ),

    Convert.make(ExpressionPlaceholder.make(), TypePlaceholder.make()),
    Dimension.make(false, PLACEHOLDER_SYMBOL, 1),
    new AnyType(),
    FunctionType.make(undefined, [], TypePlaceholder.make()),

    // Boolean
    BooleanType.make(),
    BooleanLiteral.make(true),

    // Measurements
    MeasurementType.make(),
    MeasurementLiteral.make(0),
    Unit.make(['unit']),

    // Text
    TextType.make(),
    TextLiteral.make(''),
    Template.make(),

    // List
    ListType.make(),
    ListLiteral.make([]),
    ListAccess.make(
        ExpressionPlaceholder.make(ListType.make()),
        ExpressionPlaceholder.make()
    ),

    // Maps
    MapLiteral.make([]),
    KeyValue.make(ExpressionPlaceholder.make(), ExpressionPlaceholder.make()),
    MapType.make(TypePlaceholder.make(), TypePlaceholder.make()),

    // Sets
    SetType.make(),
    SetLiteral.make([]),

    // None
    NoneType.make(),
    NoneLiteral.make(),

    StructureDefinition.make(
        undefined,
        Names.make(['_']),
        [],
        undefined,
        [],
        Block.make([ExpressionPlaceholder.make()])
    ),
    This.make(),

    // Streams
    StreamType.make(),
    Previous.make(
        ExpressionPlaceholder.make(StreamType.make()),
        ExpressionPlaceholder.make(MeasurementType.make())
    ),

    // Types
    TypeInputs.make([]),
    TypeVariables.make([]),
    UnionType.make(TypePlaceholder.make(), TypePlaceholder.make()),
    ConversionType.make(TypePlaceholder.make(), TypePlaceholder.make()),

    // Documentation
    Doc.make([new Paragraph([Words.make()])]),
    new DocumentedExpression(
        new Docs([Doc.make([new Paragraph([Words.make()])])]),
        ExpressionPlaceholder.make()
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
    new UnparsableExpression([
        new ListCloseToken(),
        new EvalOpenToken(),
        new SetCloseToken(),
        new Token(CONVERT_SYMBOL, TokenType.Convert),
    ]),
];

export function getNodeConcepts(context: Context): NodeConcept[] {
    return template.map((node) => {
        const typeName = node.getAffiliatedType();
        const type = typeName
            ? context.native.getStructureDefinition(typeName)
            : undefined;
        return new NodeConcept(node.getPurpose(), type, node, context);
    });
}

export function getNativeConcepts(
    native: Native,
    languages: LanguageCode[],
    context: Context
): StructureConcept[] {
    return [
        new StructureConcept(
            Purpose.Store,
            native.getPrimitiveDefinition('boolean'),
            native.getPrimitiveDefinition('boolean'),
            BooleanType.make(),
            [BooleanLiteral.make(true), BooleanLiteral.make(false)],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.Store,
            native.getPrimitiveDefinition('text'),
            native.getPrimitiveDefinition('text'),
            TextType.make(),
            [TextLiteral.make(''), Template.make()],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.Store,
            native.getPrimitiveDefinition('measurement'),
            native.getPrimitiveDefinition('measurement'),
            MeasurementType.make(),
            [
                MeasurementLiteral.make(0),
                MeasurementLiteral.make('π'),
                MeasurementLiteral.make('∞'),
            ],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.Store,
            native.getPrimitiveDefinition('list'),
            native.getPrimitiveDefinition('list'),
            ListType.make(),
            [ListLiteral.make([])],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.Store,
            native.getPrimitiveDefinition('set'),
            native.getPrimitiveDefinition('set'),
            SetType.make(),
            [SetLiteral.make([])],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.Store,
            native.getPrimitiveDefinition('map'),
            native.getPrimitiveDefinition('map'),
            MapType.make(TypePlaceholder.make(), TypePlaceholder.make()),
            [MapLiteral.make([])],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.Store,
            native.getPrimitiveDefinition('none'),
            native.getPrimitiveDefinition('none'),
            NoneType.make(),
            [NoneLiteral.make()],
            languages,
            context
        ),
    ];
}

export function getStructureOrFunctionConcept(
    def: StructureDefinition | FunctionDefinition,
    purpose: Purpose,
    affiliation: StructureDefinition | undefined,
    languages: LanguageCode[],
    context: Context
) {
    return def instanceof StructureDefinition
        ? new StructureConcept(
              purpose,
              affiliation,
              def,
              undefined,
              undefined,
              languages,
              context
          )
        : new FunctionConcept(
              purpose,
              affiliation,
              def,
              undefined,
              languages,
              context
          );
}

export function getOutputConcepts(
    languages: LanguageCode[],
    context: Context
): Concept[] {
    return [
        ...Object.values(context.project.shares.output).map((def) =>
            getStructureOrFunctionConcept(
                def,
                Purpose.Output,
                undefined,
                languages,
                context
            )
        ),
    ];
}
