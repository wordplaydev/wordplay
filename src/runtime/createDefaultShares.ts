import { createSceneDefinition } from '@input/Scene/Scene';
import { createAuraType } from '@output/Aura/Aura';
import { createFormType } from '@output/Output/Shape/Form';
import { createRectangleType } from '@output/Output/Shape/Rectangle';
import { createCircleType } from '@output/Output/Shape/Circle';
import { createPolygonType } from '@output/Output/Shape/Polygon';
import { createSourceType } from '@output/Output/Source';
import { createButtonDefinition } from '@input/Button/Button';
import { createCameraDefinition } from '@input/Camera/Camera';
import { createChatDefinition } from '@input/Chat/Chat';
import { createChoiceDefinition } from '@input/Choice/Choice';
import { createCollisionDefinition } from '@input/Collision/Collision';
import { createContourDefinition } from '@input/Contour/Contour';
import { createFaceDefinition } from '@input/Face/Face';
import { createKeyDefinition } from '@input/Key/Key';
import createTimeZoneAnalyzer from '@input/Moment/analyzeMomentTimeZone';
import { createMomentType, MomentTimezoneIndex } from '@input/Moment/Moment';
import { createMotionDefinition } from '@input/Motion/Motion';
import { createNowDefinition, NowTimezoneIndex } from '@input/Now/Now';
import { createPitchDefinition } from '@input/Pitch/Pitch';
import { createPlacementDefinition } from '@input/Placement/Placement';
import { createPointerDefinition } from '@input/Pointer/Pointer';
import { createRandomFunction } from '@input/Random/Random';
import { createHandDefinition } from '@input/Hand/Hand';
import { createObjectsDefinition } from '@input/Objects/Objects';
import { createSpeechDefinition } from '@input/Speech/Speech';
import { createTimeType } from '@input/Time/Time';
import { createVolumeDefinition } from '@input/Volume/Volume';
import { createWebpageDefinition } from '@input/Webpage/Webpage';
import type Locales from '@locale/Locales';
import { createArrangementType } from '@output/Arrangement/Arrangement';
import { createColorType } from '@output/Color/Color';
import { getDefaultSequences } from '@output/animation/DefaultSequences';
import { createDirectionType } from '@output/physics/Direction';
import { createExpressionType } from '@output/Expression/Expression';
import { createFreeType } from '@output/Arrangement/Free';
import { createGridType } from '@output/Arrangement/Grid';
import { createGroupType } from '@output/Output/Group';
import { createHandType } from '@output/Gesture/Hand';
import { createMatterType } from '@output/physics/Matter';
import { createOutputType } from '@output/Output/Output';
import { createPhraseType } from '@output/Output/Phrase';
import analyzePhraseEvaluate from '@output/Output/analyzePhraseEvaluate';
import { registerEvaluateAnalyzer } from '@conflicts/evaluateAnalyzers';
import { createPlaceType } from '@output/Place/Place';
import { createPoseType } from '@output/animation/Pose';
import { createReboundType } from '@output/physics/Rebound';
import { createRowType } from '@output/Arrangement/Row';
import { createSequenceType } from '@output/animation/Sequence';
import { createShapeType } from '@output/Output/Shape/Shape';
import { createSayType } from '@output/Output/Say';
import { createResultType } from '@output/Result/Result';
import { createStackType } from '@output/Arrangement/Stack';
import { createStageType } from '@output/Output/Stage';
import { createThingType } from '@output/Thing/Thing';
import { createVelocityType } from '@output/physics/Velocity';
import { createReactionDefinition } from '@values/ReactionStream';

export default function createDefaultShares(locales: Locales) {
    const OutputType = createOutputType(locales);
    const PlaceType = createPlaceType(locales);
    const VelocityType = createVelocityType(locales);
    const MatterType = createMatterType(locales);
    const ColorType = createColorType(locales);
    const DirectionType = createDirectionType(locales);
    const ReboundType = createReboundType(locales);
    const PhraseType = createPhraseType(locales);
    registerEvaluateAnalyzer(PhraseType, analyzePhraseEvaluate);
    const GroupType = createGroupType(locales);
    const ShapeType = createShapeType(locales);

    const HandType = createHandType(locales);
    const ThingType = createThingType(locales);
    const ExpressionType = createExpressionType(locales);

    const MomentType = createMomentType(locales);
    const NowType = createNowDefinition(locales, MomentType);
    // Warn (with city-matched suggestions) when a literal time zone isn't a
    // known IANA zone, via the same per-definition analyzer registry Phrase
    // uses for font checks above.
    registerEvaluateAnalyzer(
        MomentType,
        createTimeZoneAnalyzer(MomentType.inputs[MomentTimezoneIndex]),
    );
    registerEvaluateAnalyzer(
        NowType,
        createTimeZoneAnalyzer(NowType.inputs[NowTimezoneIndex]),
    );

    const OutputTypes = {
        Output: OutputType,
        Phrase: PhraseType,
        Group: GroupType,
        Shape: ShapeType,
        Stage: createStageType(locales),
        Pose: createPoseType(locales),
        Sequence: createSequenceType(locales),
        Aura: createAuraType(locales),
        Color: ColorType,
        Place: PlaceType,
        Matter: MatterType,
        Velocity: VelocityType,
        Direction: DirectionType,
        Rebound: ReboundType,
        Gesture: HandType,
        Thing: ThingType,
        Expression: ExpressionType,
        Form: createFormType(locales),
        Rectangle: createRectangleType(locales),
        Circle: createCircleType(locales),
        Polygon: createPolygonType(locales),
        Arrangement: createArrangementType(locales),
        Stack: createStackType(locales),
        Row: createRowType(locales),
        Grid: createGridType(locales),
        Free: createFreeType(locales),
        Data: createSourceType(locales),
        Say: createSayType(locales),
        Result: createResultType(locales),
    };

    const InputTypes = {
        Time: createTimeType(locales),
        Now: NowType,
        Moment: MomentType,
        Random: createRandomFunction(locales),
        Choice: createChoiceDefinition(locales),
        Motion: createMotionDefinition(locales, PlaceType, VelocityType),
        Placement: createPlacementDefinition(locales, PlaceType),
        Key: createKeyDefinition(locales),
        Button: createButtonDefinition(locales),
        Pointer: createPointerDefinition(locales, PlaceType),
        Volume: createVolumeDefinition(locales),
        Pitch: createPitchDefinition(locales),
        Speech: createSpeechDefinition(locales),
        Camera: createCameraDefinition(locales, ColorType),
        Hand: createHandDefinition(locales, HandType),
        Face: createFaceDefinition(locales, ExpressionType),
        Objects: createObjectsDefinition(locales, ThingType),
        Webpage: createWebpageDefinition(locales),
        Chat: createChatDefinition(locales),
        Contour: createContourDefinition(locales, PlaceType),
        Collision: createCollisionDefinition(locales, ReboundType),
        Scene: createSceneDefinition(locales, PhraseType, GroupType, ShapeType),
        Reaction: createReactionDefinition(locales),
    };

    const Sequences = getDefaultSequences(locales);

    return {
        all: [
            ...Object.values(InputTypes),
            ...Object.values(OutputTypes),
            ...Object.values(Sequences),
        ],
        input: InputTypes,
        output: OutputTypes,
        sequences: Sequences,
    };
}
