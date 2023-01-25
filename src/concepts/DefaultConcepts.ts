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
import type LanguageCode from '@translation/LanguageCode';
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
import { GroupTypes, PhraseTypes, PoseTypes } from '@runtime/ImplicitShares';
import type Concept from './Concept';
import NodeConcept from './NodeConcept';
import FunctionConcept from './FunctionConcept';
import StructureConcept from './StructureConcept';
import Purpose from './Purpose';
import { PhraseType } from '../output/Phrase';
import { GroupType } from '../output/Group';
import { PoseType } from '../output/Pose';

export function getNodeConcepts(context: Context): NodeConcept[] {
    return [
        new NodeConcept(
            Purpose.STORE,
            undefined,
            Bind.make(
                undefined,
                Names.make(['_']),
                undefined,
                ExpressionPlaceholder.make()
            ),
            context
        ),
        new NodeConcept(
            Purpose.COMPUTE,
            undefined,
            Block.make([ExpressionPlaceholder.make()]),
            context
        ),
        new NodeConcept(
            Purpose.STORE,
            undefined,
            StructureDefinition.make(
                undefined,
                Names.make(['_']),
                [],
                undefined,
                [],
                Block.make([ExpressionPlaceholder.make()])
            ),
            context
        ),
        new NodeConcept(
            Purpose.DECIDE,
            BoolDefinition,
            Conditional.make(
                ExpressionPlaceholder.make(BooleanType.make()),
                ExpressionPlaceholder.make(),
                ExpressionPlaceholder.make()
            ),
            context
        ),
        new NodeConcept(
            Purpose.COMPUTE,
            undefined,
            FunctionDefinition.make(
                undefined,
                Names.make(['_']),
                undefined,
                [],
                ExpressionPlaceholder.make()
            ),
            context
        ),
        new NodeConcept(
            Purpose.DECIDE,
            undefined,
            Changed.make(
                ExpressionPlaceholder.make(
                    StreamType.make(new TypePlaceholder())
                )
            ),
            context
        ),
        new NodeConcept(
            Purpose.DECIDE,
            undefined,
            Reaction.make(
                ExpressionPlaceholder.make(),
                ExpressionPlaceholder.make(
                    StreamType.make(new TypePlaceholder())
                )
            ),
            context
        ),
        new NodeConcept(
            Purpose.CONVERT,
            undefined,
            ConversionDefinition.make(
                undefined,
                new TypePlaceholder(),
                new TypePlaceholder(),
                ExpressionPlaceholder.make()
            ),
            context
        ),
        new NodeConcept(
            Purpose.CONVERT,
            undefined,
            Convert.make(ExpressionPlaceholder.make(), new TypePlaceholder()),
            context
        ),
    ];
}

export function getNativeConcepts(
    languages: LanguageCode[],
    context: Context
): StructureConcept[] {
    return [
        new StructureConcept(
            Purpose.STORE,
            BoolDefinition,
            BoolDefinition,
            BooleanType.make(),
            [BooleanLiteral.make(true), BooleanLiteral.make(false)],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.STORE,
            TextDefinition,
            TextDefinition,
            TextType.make(),
            [TextLiteral.make(''), Template.make()],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.STORE,
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
            Purpose.STORE,
            ListDefinition,
            ListDefinition,
            ListType.make(),
            [ListLiteral.make([])],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.STORE,
            SetDefinition,
            SetDefinition,
            SetType.make(),
            [SetLiteral.make([])],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.STORE,
            MapDefinition,
            MapDefinition,
            MapType.make(),
            [MapLiteral.make([])],
            languages,
            context
        ),
        new StructureConcept(
            Purpose.STORE,
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
        ...PhraseTypes.map((def) =>
            getStructureOrFunctionConcept(
                def,
                Purpose.OUTPUT,
                PhraseType,
                languages,
                context
            )
        ),
        ...GroupTypes.map((def) =>
            getStructureOrFunctionConcept(
                def,
                Purpose.OUTPUT,
                GroupType,
                languages,
                context
            )
        ),
        ...PoseTypes.map((def) =>
            getStructureOrFunctionConcept(
                def,
                Purpose.OUTPUT,
                PoseType,
                languages,
                context
            )
        ),
    ];
}
