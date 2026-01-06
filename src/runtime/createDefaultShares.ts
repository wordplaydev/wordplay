import { createSceneDefinition } from '@input/Scene';
import { createAuraType } from '@output/Aura';
import {
    createCircleType,
    createFormType,
    createPolygonType,
    createRectangleType,
} from '@output/Form';
import { createSourceType } from '@output/Source';
import { createButtonDefinition } from '../input/Button';
import { createCameraDefinition } from '../input/Camera';
import { createChatDefinition } from '../input/Chat';
import { createChoiceDefinition } from '../input/Choice';
import { createCollisionDefinition } from '../input/Collision';
import { createKeyDefinition } from '../input/Key';
import { createMotionDefinition } from '../input/Motion';
import { createPitchDefinition } from '../input/Pitch';
import { createPlacementDefinition } from '../input/Placement';
import { createPointerDefinition } from '../input/Pointer';
import { createRandomFunction } from '../input/Random';
import { createTimeType } from '../input/Time';
import { createVolumeDefinition } from '../input/Volume';
import { createWebpageDefinition } from '../input/Webpage';
import type Locales from '../locale/Locales';
import { createArrangementType } from '../output/Arrangement';
import { createColorType } from '../output/Color';
import { getDefaultSequences } from '../output/DefaultSequences';
import { createDirectionType } from '../output/Direction';
import { createFreeType } from '../output/Free';
import { createGridType } from '../output/Grid';
import { createGroupType } from '../output/Group';
import { createMatterType } from '../output/Matter';
import { createOutputType } from '../output/Output';
import { createPhraseType } from '../output/Phrase';
import { createPlaceType } from '../output/Place';
import { createPoseType } from '../output/Pose';
import { createReboundType } from '../output/Rebound';
import { createRowType } from '../output/Row';
import { createSequenceType } from '../output/Sequence';
import { createShapeType } from '../output/Shape';
import { createStackType } from '../output/Stack';
import { createStageType } from '../output/Stage';
import { createVelocityType } from '../output/Velocity';
import { createReactionDefinition } from '../values/ReactionStream';

export default function createDefaultShares(locales: Locales) {
    const OutputType = createOutputType(locales);
    const PlaceType = createPlaceType(locales);
    const VelocityType = createVelocityType(locales);
    const MatterType = createMatterType(locales);
    const ColorType = createColorType(locales);
    const DirectionType = createDirectionType(locales);
    const ReboundType = createReboundType(locales);
    const PhraseType = createPhraseType(locales);
    const GroupType = createGroupType(locales);
    const ShapeType = createShapeType(locales);

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
    };

    const InputTypes = {
        Time: createTimeType(locales),
        Random: createRandomFunction(locales),
        Choice: createChoiceDefinition(locales),
        Motion: createMotionDefinition(locales, PlaceType, VelocityType),
        Placement: createPlacementDefinition(locales, PlaceType),
        Key: createKeyDefinition(locales),
        Button: createButtonDefinition(locales),
        Pointer: createPointerDefinition(locales, PlaceType),
        Volume: createVolumeDefinition(locales),
        Pitch: createPitchDefinition(locales),
        Camera: createCameraDefinition(locales, ColorType),
        Webpage: createWebpageDefinition(locales),
        Chat: createChatDefinition(locales),
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
