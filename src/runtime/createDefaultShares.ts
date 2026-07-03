import { createSceneDefinition } from '@input/Scene';
import { createAuraType } from '@output/Aura';
import {
    createCircleType,
    createFormType,
    createPolygonType,
    createRectangleType,
} from '@output/Form';
import { createSourceType } from '@output/Source';
import { createButtonDefinition } from '@input/Button';
import { createCameraDefinition } from '@input/Camera';
import { createChatDefinition } from '@input/Chat';
import { createChoiceDefinition } from '@input/Choice';
import { createCollisionDefinition } from '@input/Collision';
import { createContourDefinition } from '@input/Contour';
import { createKeyDefinition } from '@input/Key';
import createTimeZoneAnalyzer from '@input/analyzeMomentTimeZone';
import { createMomentType, MomentTimezoneIndex } from '@input/Moment';
import { createMotionDefinition } from '@input/Motion';
import { createNowDefinition, NowTimezoneIndex } from '@input/Now';
import { createPitchDefinition } from '@input/Pitch';
import { createPlacementDefinition } from '@input/Placement';
import { createPointerDefinition } from '@input/Pointer';
import { createRandomFunction } from '@input/Random';
import { createHandDefinition } from '@input/Hand';
import { createSpeechDefinition } from '@input/Speech';
import { createTimeType } from '@input/Time';
import { createVolumeDefinition } from '@input/Volume';
import { createWebpageDefinition } from '@input/Webpage';
import type Locales from '@locale/Locales';
import { createArrangementType } from '@output/Arrangement';
import { createColorType } from '@output/Color';
import { getDefaultSequences } from '@output/DefaultSequences';
import { createDirectionType } from '@output/Direction';
import { createFreeType } from '@output/Free';
import { createGridType } from '@output/Grid';
import { createGroupType } from '@output/Group';
import { createHandType } from '@output/Hand';
import { createMatterType } from '@output/Matter';
import { createOutputType } from '@output/Output';
import { createPhraseType } from '@output/Phrase';
import analyzePhraseEvaluate from '@output/analyzePhraseEvaluate';
import { registerEvaluateAnalyzer } from '@conflicts/evaluateAnalyzers';
import { createPlaceType } from '@output/Place';
import { createPoseType } from '@output/Pose';
import { createReboundType } from '@output/Rebound';
import { createRowType } from '@output/Row';
import { createSequenceType } from '@output/Sequence';
import { createShapeType } from '@output/Shape';
import { createSayType } from '@output/Say';
import { createResultType } from '@output/Result';
import { createStackType } from '@output/Stack';
import { createStageType } from '@output/Stage';
import { createVelocityType } from '@output/Velocity';
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
