import { createSlateType } from '#input/Scene/Slate.ts';
import { createSceneDefinition } from '#input/Scene/Scene.ts';
import { createAuraType } from '#output/Aura/Aura.ts';
import { createBubbleType } from '#output/Bubble/Bubble.ts';
import { createFormType } from '#output/Output/Shape/Form.ts';
import { createRectangleType } from '#output/Output/Shape/Rectangle.ts';
import { createCircleType } from '#output/Output/Shape/Circle.ts';
import { createPathType } from '#output/Output/Shape/Path.ts';
import { createPolygonType } from '#output/Output/Shape/Polygon.ts';
import { createSourceType } from '#output/Output/Source.ts';
import { createButtonDefinition } from '#input/Button/Button.ts';
import { createCameraDefinition } from '#input/Camera/Camera.ts';
import { createChatDefinition } from '#input/Chat/Chat.ts';
import { createChoiceDefinition } from '#input/Choice/Choice.ts';
import { createCollisionDefinition } from '#input/Collision/Collision.ts';
import { createContourDefinition } from '#input/Contour/Contour.ts';
import { createSpotlightDefinition } from '#input/Spotlight/Spotlight.ts';
import { createFaceDefinition } from '#input/Face/Face.ts';
import { createKeyDefinition } from '#input/Key/Key.ts';
import createTimeZoneAnalyzer from '#input/Moment/analyzeMomentTimeZone.ts';
import { createMomentType, MomentTimezoneIndex } from '#input/Moment/Moment.ts';
import { createMotionDefinition } from '#input/Motion/Motion.ts';
import { createNowDefinition, NowTimezoneIndex } from '#input/Now/Now.ts';
import { createPitchDefinition } from '#input/Pitch/Pitch.ts';
import { createPlacementDefinition } from '#input/Placement/Placement.ts';
import { createPointerDefinition } from '#input/Pointer/Pointer.ts';
import { createRandomFunction } from '#input/Random/Random.ts';
import { createHandDefinition } from '#input/Hand/Hand.ts';
import { createObjectsDefinition } from '#input/Objects/Objects.ts';
import { createSpeechDefinition } from '#input/Speech/Speech.ts';
import { createTimeType } from '#input/Time/Time.ts';
import { createVolumeDefinition } from '#input/Volume/Volume.ts';
import { createWebpageDefinition } from '#input/Webpage/Webpage.ts';
import type Locales from '#locale/Locales.ts';
import { createArrangementType } from '#output/Arrangement/Arrangement.ts';
import { createColorType } from '#output/Color/Color.ts';
import { createBeatDefinition } from '#input/Beat/Beat.ts';
import { createInstrumentType } from '#output/Music/Instrument.ts';
import { createMusicType } from '#output/Music/Music.ts';
import { createNoteType } from '#output/Music/Note.ts';
import { createDownbeatType } from '#output/Music/Downbeat.ts';
import { createPartType } from '#output/Music/Part.ts';
import { createTrackType } from '#output/Music/Track.ts';
import { createDirectionType } from '#output/physics/Direction.ts';
import { createExpressionType } from '#output/Expression/Expression.ts';
import { createFreeType } from '#output/Arrangement/Free.ts';
import { createGridType } from '#output/Arrangement/Grid.ts';
import { createGroupType } from '#output/Output/Group.ts';
import { createHandType } from '#output/Gesture/Hand.ts';
import { createMatterType } from '#output/physics/Matter.ts';
import { createOutputType } from '#output/Output/Output.ts';
import { createPhraseType } from '#output/Output/Phrase.ts';
import analyzePhraseEvaluate from '#output/Output/analyzePhraseEvaluate.ts';
import { registerEvaluateAnalyzer } from '#conflicts/evaluateAnalyzers.ts';
import { createPlaceType } from '#output/Place/Place.ts';
import { createPoseType } from '#output/animation/Pose.ts';
import { createReboundType } from '#output/physics/Rebound.ts';
import { createRowType } from '#output/Arrangement/Row.ts';
import { createSequenceType } from '#output/animation/Sequence.ts';
import { createImageType } from '#output/Output/Image.ts';
import { createShapeType } from '#output/Output/Shape/Shape.ts';
import { createSayType } from '#output/Output/Say.ts';
import { createResultType } from '#output/Result/Result.ts';
import { createStackType } from '#output/Arrangement/Stack.ts';
import { createStageType } from '#output/Output/Stage.ts';
import { createThingType } from '#output/Thing/Thing.ts';
import { createVelocityType } from '#output/physics/Velocity.ts';
import { createReactionDefinition } from '#values/ReactionStream.ts';
import { must } from '#util/nullable.ts';

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
    const PartType = createPartType(locales);
    const DownbeatType = createDownbeatType(locales);
    const SlateType = createSlateType(locales);

    const HandType = createHandType(locales);
    const ThingType = createThingType(locales);
    const ExpressionType = createExpressionType(locales);

    const MomentType = createMomentType(locales);
    const NowType = createNowDefinition(locales, MomentType);
    // Warn (with city-matched suggestions) when a literal time zone isn't a
    // known IANA zone, via the same per-definition analyzer registry Phrase
    // uses for font checks above.
    // Both indices name an input this file's own definitions declare.
    registerEvaluateAnalyzer(
        MomentType,
        createTimeZoneAnalyzer(
            must(
                MomentType.inputs[MomentTimezoneIndex],
                "Moment's time zone input",
            ),
        ),
    );
    registerEvaluateAnalyzer(
        NowType,
        createTimeZoneAnalyzer(
            must(NowType.inputs[NowTimezoneIndex], "Now's time zone input"),
        ),
    );

    const OutputTypes = {
        Output: OutputType,
        Phrase: PhraseType,
        Group: GroupType,
        Shape: ShapeType,
        Image: createImageType(locales),
        Stage: createStageType(locales),
        Pose: createPoseType(locales),
        Sequence: createSequenceType(locales),
        Aura: createAuraType(locales),
        Bubble: createBubbleType(locales),
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
        Path: createPathType(locales),
        Arrangement: createArrangementType(locales),
        Stack: createStackType(locales),
        Row: createRowType(locales),
        Grid: createGridType(locales),
        Free: createFreeType(locales),
        Data: createSourceType(locales),
        Say: createSayType(locales),
        Music: createMusicType(locales),
        Track: createTrackType(locales),
        Note: createNoteType(locales),
        Instrument: createInstrumentType(locales),
        Downbeat: DownbeatType,
        Part: PartType,
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
        Beat: createBeatDefinition(locales, DownbeatType),
        Scene: createSceneDefinition(locales, PhraseType, GroupType, ShapeType),
        Spotlight: createSpotlightDefinition(locales, SlateType),
        Slate: SlateType,
        Reaction: createReactionDefinition(locales),
    };

    return {
        all: [...Object.values(InputTypes), ...Object.values(OutputTypes)],
        input: InputTypes,
        output: OutputTypes,
    };
}
