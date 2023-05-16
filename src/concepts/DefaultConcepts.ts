import {
    BoolDefinition,
    ListDefinition,
    MapDefinition,
    MeasurementDefinition,
    NoneDefinition,
    SetDefinition,
    TextDefinition,
} from '../native/NativeBindings';
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
import {
    GroupTypes,
    AppearanceTypes,
    AnimationTypes,
} from '@runtime/DefaultShares';
import type Concept from './Concept';
import NodeConcept from './NodeConcept';
import FunctionConcept from './FunctionConcept';
import StructureConcept from './StructureConcept';
import Purpose from './Purpose';
import { PhraseType } from '../output/Phrase';
import { GroupType } from '../output/Group';
import { PoseType } from '../output/Pose';
import type Node from '../nodes/Node';
import AnyType from '../nodes/AnyType';
import BinaryOperation from '../nodes/BinaryOperation';
import { PLACEHOLDER_SYMBOL, SUM_SYMBOL } from '../parser/Symbols';
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
        new Token(SUM_SYMBOL, TokenType.BinaryOperator),
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
    Bind.make(
        undefined,
        Names.make([PLACEHOLDER_SYMBOL]),
        undefined,
        ExpressionPlaceholder.make()
    ),
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
    MapType.make(),

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
    Doc.make([
        new Paragraph([
            new Words(undefined, new Token('TBD', TokenType.Words), undefined),
        ]),
    ]),
    ConceptLink.make(PLACEHOLDER_SYMBOL),
    WebLink.make('wordplay', 'http://wordplay.dev'),
    Language.make('en'),
    Example.make(Program.make()),
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
    languages: LanguageCode[],
    context: Context
): StructureConcept[] {
    return [
        new StructureConcept(
            Purpose.Store,
            BoolDefinition,
            BoolDefinition,
            BooleanType.make(),
            [BooleanLiteral.make(true), BooleanLiteral.make(false)],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.Store,
            TextDefinition,
            TextDefinition,
            TextType.make(),
            [TextLiteral.make(''), Template.make()],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.Store,
            MeasurementDefinition,
            MeasurementDefinition,
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
            ListDefinition,
            ListDefinition,
            ListType.make(),
            [ListLiteral.make([])],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.Store,
            SetDefinition,
            SetDefinition,
            SetType.make(),
            [SetLiteral.make([])],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.Store,
            MapDefinition,
            MapDefinition,
            MapType.make(),
            [MapLiteral.make([])],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.Store,
            NoneDefinition,
            NoneDefinition,
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
        ...AppearanceTypes.map((def) =>
            getStructureOrFunctionConcept(
                def,
                Purpose.Output,
                PhraseType,
                languages,
                context
            )
        ),
        ...GroupTypes.map((def) =>
            getStructureOrFunctionConcept(
                def,
                Purpose.Output,
                GroupType,
                languages,
                context
            )
        ),
        ...AnimationTypes.map((def) =>
            getStructureOrFunctionConcept(
                def,
                Purpose.Output,
                PoseType,
                languages,
                context
            )
        ),
    ];
}
