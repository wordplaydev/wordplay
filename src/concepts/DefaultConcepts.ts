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
import ListLiteral from '@nodes/ListLiteral';
import ListType from '@nodes/ListType';
import MapLiteral from '@nodes/MapLiteral';
import MapType from '@nodes/MapType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import Names from '@nodes/Names';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import Reaction from '@nodes/Reaction';
import SetLiteral from '@nodes/SetLiteral';
import SetType from '@nodes/SetType';
import StreamType from '@nodes/StreamType';
import StructureDefinition from '@nodes/StructureDefinition';
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
import BinaryEvaluate from '../nodes/BinaryEvaluate';
import { CONVERT_SYMBOL, PLACEHOLDER_SYMBOL } from '../parser/Symbols';
import ConceptLink from '../nodes/ConceptLink';
import ConversionType from '../nodes/ConversionType';
import Dimension from '../nodes/Dimension';
import Doc from '../nodes/Doc';
import Paragraph from '../nodes/Paragraph';
import Words from '../nodes/Words';
import Sym from '../nodes/Sym';
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
import UnaryEvaluate from '../nodes/UnaryEvaluate';
import UnionType from '../nodes/UnionType';
import WebLink from '../nodes/WebLink';
import UnparsableExpression from '../nodes/UnparsableExpression';
import Unit from '../nodes/Unit';
import type { Basis } from '../basis/Basis';
import Docs from '../nodes/Docs';
import Name from '../nodes/Name';
import DocumentedExpression from '../nodes/DocumentedExpression';
import ListCloseToken from '../nodes/ListCloseToken';
import EvalOpenToken from '../nodes/EvalOpenToken';
import SetCloseToken from '../nodes/SetCloseToken';
import SetOrMapAccess from '../nodes/SetOrMapAccess';
import Source from '../nodes/Source';
import NameType from '../nodes/NameType';
import FormattedLiteral from '../nodes/FormattedLiteral';
import FormattedTranslation from '../nodes/FormattedTranslation';
import IsLocale from '../nodes/IsLocale';
import TableType from '../nodes/TableType';
import TableLiteral from '../nodes/TableLiteral';
import Insert from '../nodes/Insert';
import Select from '../nodes/Select';
import Update from '../nodes/Update';
import Delete from '../nodes/Delete';
import Translation from '../nodes/Translation';
import type Locales from '../locale/Locales';
import Borrow from '../nodes/Borrow';
import Otherwise from '@nodes/Otherwise';

/** These are ordered by appearance in the docs. */
const templates: Node[] = [
    // Evaluation
    Evaluate.make(ExpressionPlaceholder.make(), []),
    FunctionDefinition.make(
        undefined,
        Names.make(['_']),
        undefined,
        [],
        ExpressionPlaceholder.make()
    ),
    new BinaryEvaluate(
        ExpressionPlaceholder.make(),
        Reference.make(PLACEHOLDER_SYMBOL),
        ExpressionPlaceholder.make()
    ),
    new UnaryEvaluate(Reference.make('-'), ExpressionPlaceholder.make()),
    Block.make([ExpressionPlaceholder.make()]),
    ExpressionPlaceholder.make(),
    Convert.make(ExpressionPlaceholder.make(), TypePlaceholder.make()),
    ConversionDefinition.make(
        undefined,
        new TypePlaceholder(),
        new TypePlaceholder(),
        ExpressionPlaceholder.make()
    ),
    ListAccess.make(
        ExpressionPlaceholder.make(ListType.make()),
        ExpressionPlaceholder.make()
    ),
    SetOrMapAccess.make(
        ExpressionPlaceholder.make(SetType.make()),
        ExpressionPlaceholder.make()
    ),
    Insert.make(ExpressionPlaceholder.make(TableType.make())),
    Select.make(
        ExpressionPlaceholder.make(TableType.make()),
        ExpressionPlaceholder.make(BooleanType.make())
    ),
    Update.make(
        ExpressionPlaceholder.make(TableType.make()),
        ExpressionPlaceholder.make(BooleanType.make())
    ),
    Delete.make(
        ExpressionPlaceholder.make(TableType.make()),
        ExpressionPlaceholder.make(BooleanType.make())
    ),

    // Project
    Program.make([ExpressionPlaceholder.make()]),
    new Source('?', '_'),
    new Borrow(),

    // Decisions
    Conditional.make(
        ExpressionPlaceholder.make(BooleanType.make()),
        ExpressionPlaceholder.make(),
        ExpressionPlaceholder.make()
    ),
    Is.make(ExpressionPlaceholder.make(), TypePlaceholder.make()),
    Otherwise.make(ExpressionPlaceholder.make(), ExpressionPlaceholder.make()),
    IsLocale.make(Language.make(undefined)),
    Initial.make(),
    Changed.make(ExpressionPlaceholder.make(StreamType.make())),
    Reaction.make(
        ExpressionPlaceholder.make(),
        ExpressionPlaceholder.make(BooleanType.make()),
        ExpressionPlaceholder.make()
    ),
    Previous.make(
        ExpressionPlaceholder.make(StreamType.make()),
        ExpressionPlaceholder.make(NumberType.make())
    ),

    // Bind
    Bind.make(
        undefined,
        Names.make([PLACEHOLDER_SYMBOL]),
        undefined,
        ExpressionPlaceholder.make()
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
        Block.make([ExpressionPlaceholder.make()])
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
        ExpressionPlaceholder.make()
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
    SetLiteral.make(),
    MapLiteral.make(),
    TableLiteral.make(),
    Translation.make(),
    FormattedTranslation.make([]),

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
        new Token(CONVERT_SYMBOL, Sym.Convert),
    ]),
];

export function getNodeConcepts(context: Context): NodeConcept[] {
    return templates.map((node) => {
        const typeName = node.getAffiliatedType();
        const type = typeName
            ? context.getBasis().getStructureDefinition(typeName)
            : undefined;
        return new NodeConcept(node.getPurpose(), type, node, context);
    });
}

export function getBasisConcepts(
    basis: Basis,
    locales: Locales,
    context: Context
): StructureConcept[] {
    return [
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('text'),
            basis.getSimpleDefinition('text'),
            TextType.make(),
            [TextLiteral.make('')],
            locales,
            context
        ),
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('measurement'),
            basis.getSimpleDefinition('measurement'),
            NumberType.make(),
            [
                NumberLiteral.make(0),
                NumberLiteral.make('π'),
                NumberLiteral.make('∞'),
            ],
            locales,
            context
        ),
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('boolean'),
            basis.getSimpleDefinition('boolean'),
            BooleanType.make(),
            [BooleanLiteral.make(true), BooleanLiteral.make(false)],
            locales,
            context
        ),
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('list'),
            basis.getSimpleDefinition('list'),
            ListType.make(),
            [ListLiteral.make([])],
            locales,
            context
        ),
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('set'),
            basis.getSimpleDefinition('set'),
            SetType.make(),
            [SetLiteral.make([])],
            locales,
            context
        ),
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('map'),
            basis.getSimpleDefinition('map'),
            MapType.make(TypePlaceholder.make(), TypePlaceholder.make()),
            [MapLiteral.make([])],
            locales,
            context
        ),
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('none'),
            basis.getSimpleDefinition('none'),
            NoneType.make(),
            [NoneLiteral.make()],
            locales,
            context
        ),
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('table'),
            basis.getSimpleDefinition('table'),
            TableType.make(),
            [new TableLiteral(TableType.make(), [])],
            locales,
            context
        ),
    ];
}

export function getStructureOrFunctionConcept(
    def: StructureDefinition | FunctionDefinition,
    purpose: Purpose,
    affiliation: StructureDefinition | undefined,
    locales: Locales,
    context: Context
) {
    return def instanceof StructureDefinition
        ? new StructureConcept(
              purpose,
              affiliation,
              def,
              undefined,
              undefined,
              locales,
              context
          )
        : new FunctionConcept(
              purpose,
              affiliation,
              def,
              undefined,
              locales,
              context
          );
}

export function getOutputConcepts(
    locales: Locales,
    context: Context
): Concept[] {
    return [
        ...Object.values(context.project.shares.output).map((def) =>
            getStructureOrFunctionConcept(
                def,
                Purpose.Output,
                undefined,
                locales,
                context
            )
        ),
        ...Object.values(context.project.shares.sequences).map((def) =>
            getStructureOrFunctionConcept(
                def,
                Purpose.Output,
                undefined,
                locales,
                context
            )
        ),
    ];
}
