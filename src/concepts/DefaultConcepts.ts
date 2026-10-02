import BinaryEvaluate from '#nodes/BinaryEvaluate.ts';
import BooleanLiteral from '#nodes/BooleanLiteral.ts';
import BooleanType from '#nodes/BooleanType.ts';
import type Context from '#nodes/Context.ts';
import FunctionDefinition from '#nodes/FunctionDefinition.ts';
import ListLiteral from '#nodes/ListLiteral.ts';
import ListType from '#nodes/ListType.ts';
import MapLiteral from '#nodes/MapLiteral.ts';
import MapType from '#nodes/MapType.ts';
import NoneLiteral from '#nodes/NoneLiteral.ts';
import NoneType from '#nodes/NoneType.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import NumberType from '#nodes/NumberType.ts';
import RangeType from '#nodes/RangeType.ts';
import Reference from '#nodes/Reference.ts';
import SetLiteral from '#nodes/SetLiteral.ts';
import SetType from '#nodes/SetType.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import StructureType from '#nodes/StructureType.ts';
import TextLiteral from '#nodes/TextLiteral.ts';
import TextType from '#nodes/TextType.ts';
import TypePlaceholder from '#nodes/TypePlaceholder.ts';
import type { Basis } from '#basis/Basis.ts';
import { RANGE_SYMBOL } from '#parser/Symbols.ts';
import type Locales from '#locale/Locales.ts';
import TableLiteral from '#nodes/TableLiteral.ts';
import TableType from '#nodes/TableType.ts';
import type Concept from '#concepts/Concept.ts';
import FunctionConcept from '#concepts/FunctionConcept.ts';
import NodeConcept from '#concepts/NodeConcept.ts';
import { Purpose, type PurposeType } from '#concepts/Purpose.ts';
import StructureConcept from '#concepts/StructureConcept.ts';
import Templates from '#concepts/Templates.ts';

export function getNodeConcepts(context: Context): NodeConcept[] {
    return Templates.map((template) => {
        const typeName = template.getAffiliatedType();
        const type = typeName
            ? context.getBasis().getStructureDefinition(typeName)
            : undefined;
        return new NodeConcept(template.getPurpose(), type, template, context);
    });
}

export function getBasisConcepts(
    basis: Basis,
    locales: Locales,
    context: Context,
): StructureConcept[] {
    return [
        new StructureConcept(
            Purpose.Text,
            basis.getSimpleDefinition('text'),
            basis.getSimpleDefinition('text'),
            TextType.make(),
            [TextLiteral.make('')],
            locales,
            context,
        ),
        new StructureConcept(
            Purpose.Numbers,
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
            Purpose.Numbers,
            basis.getSimpleDefinition('range'),
            basis.getSimpleDefinition('range'),
            RangeType.make(),
            [
                new BinaryEvaluate(
                    NumberLiteral.make(1),
                    Reference.make(RANGE_SYMBOL),
                    NumberLiteral.make(10),
                ),
            ],
            locales,
            context,
        ),
        new StructureConcept(
            Purpose.Truth,
            basis.getSimpleDefinition('boolean'),
            basis.getSimpleDefinition('boolean'),
            BooleanType.make(),
            [BooleanLiteral.make(true), BooleanLiteral.make(false)],
            locales,
            context,
        ),
        new StructureConcept(
            Purpose.Lists,
            basis.getSimpleDefinition('list'),
            basis.getSimpleDefinition('list'),
            ListType.make(),
            [ListLiteral.make([])],
            locales,
            context,
        ),
        new StructureConcept(
            Purpose.Maps,
            basis.getSimpleDefinition('set'),
            basis.getSimpleDefinition('set'),
            SetType.make(),
            [SetLiteral.make([])],
            locales,
            context,
        ),
        new StructureConcept(
            Purpose.Maps,
            basis.getSimpleDefinition('map'),
            basis.getSimpleDefinition('map'),
            MapType.make(TypePlaceholder.make(), TypePlaceholder.make()),
            [MapLiteral.make([])],
            locales,
            context,
        ),
        new StructureConcept(
            Purpose.Truth,
            basis.getSimpleDefinition('none'),
            basis.getSimpleDefinition('none'),
            NoneType.make(),
            [NoneLiteral.make()],
            locales,
            context,
        ),
        new StructureConcept(
            Purpose.Tables,
            basis.getSimpleDefinition('table'),
            basis.getSimpleDefinition('table'),
            TableType.make(),
            [new TableLiteral(TableType.make(), [])],
            locales,
            context,
        ),
        new StructureConcept(
            Purpose.Types,
            basis.getSimpleDefinition('structure'),
            basis.getSimpleDefinition('structure'),
            new StructureType(basis.getSimpleDefinition('structure')),
            undefined,
            locales,
            context,
        ),
    ];
}

export function getStructureOrFunctionConcept(
    def: StructureDefinition | FunctionDefinition,
    purpose: PurposeType,
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
                def === context.project.shares.output.Output
                    ? Purpose.Hidden
                    : Purpose.Outputs,
                undefined,
                locales,
                context,
            ),
        ),
    ];
    // The predefined animations aren't listed here: they're `↑` statics on `Sequence`, so
    // `StructureConcept` already surfaces them as its sub-concepts.
}
