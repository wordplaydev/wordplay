import BooleanLiteral from '@nodes/BooleanLiteral';
import BooleanType from '@nodes/BooleanType';
import type Context from '@nodes/Context';
import FunctionDefinition from '@nodes/FunctionDefinition';
import ListLiteral from '@nodes/ListLiteral';
import ListType from '@nodes/ListType';
import MapLiteral from '@nodes/MapLiteral';
import MapType from '@nodes/MapType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import SetLiteral from '@nodes/SetLiteral';
import SetType from '@nodes/SetType';
import StructureDefinition from '@nodes/StructureDefinition';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import TypePlaceholder from '@nodes/TypePlaceholder';
import type Concept from './Concept';
import NodeConcept from './NodeConcept';
import FunctionConcept from './FunctionConcept';
import StructureConcept from './StructureConcept';
import Purpose from './Purpose';
import type { Basis } from '../basis/Basis';
import TableType from '../nodes/TableType';
import TableLiteral from '../nodes/TableLiteral';
import type Locales from '../locale/Locales';
import Templates from './Templates';

export function getNodeConcepts(context: Context): NodeConcept[] {
    return Templates.map((node) => {
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
    context: Context,
): StructureConcept[] {
    return [
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('text'),
            basis.getSimpleDefinition('text'),
            TextType.make(),
            [TextLiteral.make('')],
            locales,
            context,
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
            context,
        ),
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('boolean'),
            basis.getSimpleDefinition('boolean'),
            BooleanType.make(),
            [BooleanLiteral.make(true), BooleanLiteral.make(false)],
            locales,
            context,
        ),
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('list'),
            basis.getSimpleDefinition('list'),
            ListType.make(),
            [ListLiteral.make([])],
            locales,
            context,
        ),
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('set'),
            basis.getSimpleDefinition('set'),
            SetType.make(),
            [SetLiteral.make([])],
            locales,
            context,
        ),
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('map'),
            basis.getSimpleDefinition('map'),
            MapType.make(TypePlaceholder.make(), TypePlaceholder.make()),
            [MapLiteral.make([])],
            locales,
            context,
        ),
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('none'),
            basis.getSimpleDefinition('none'),
            NoneType.make(),
            [NoneLiteral.make()],
            locales,
            context,
        ),
        new StructureConcept(
            Purpose.Value,
            basis.getSimpleDefinition('table'),
            basis.getSimpleDefinition('table'),
            TableType.make(),
            [new TableLiteral(TableType.make(), [])],
            locales,
            context,
        ),
    ];
}

export function getStructureOrFunctionConcept(
    def: StructureDefinition | FunctionDefinition,
    purpose: Purpose,
    affiliation: StructureDefinition | undefined,
    locales: Locales,
    context: Context,
) {
    return def instanceof StructureDefinition
        ? new StructureConcept(
              purpose,
              affiliation,
              def,
              undefined,
              undefined,
              locales,
              context,
          )
        : new FunctionConcept(
              purpose,
              affiliation,
              def,
              undefined,
              locales,
              context,
          );
}

export function getOutputConcepts(
    locales: Locales,
    context: Context,
): Concept[] {
    return [
        ...Object.values(context.project.shares.output).map((def) =>
            getStructureOrFunctionConcept(
                def,
                Purpose.Output,
                undefined,
                locales,
                context,
            ),
        ),
        ...Object.values(context.project.shares.sequences).map((def) =>
            getStructureOrFunctionConcept(
                def,
                Purpose.Output,
                undefined,
                locales,
                context,
            ),
        ),
    ];
}
