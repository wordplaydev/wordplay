import { createStageType } from '../output/Stage';
import { createPhraseType } from '../output/Phrase';
import { createGroupType } from '../output/Group';
import { createOutputType } from '../output/Output';
import { createPoseType } from '../output/Pose';
import { createStackType } from '../output/Stack';
import { createRowType } from '../output/Row';
import { createColorType } from '../output/Color';
import { createPlaceType } from '../output/Place';
import { createTimeType } from '../input/Time';
import { createKeyDefinition } from '../input/Key';
import { createVolumeDefinition } from '../input/Volume';
import { createMotionDefinition } from '../input/Motion';
import { createPointerDefinition } from '../input/Pointer';
import { createButtonDefinition } from '../input/Button';
import { createRandomFunction } from '../input/Random';
import { createArrangementType } from '../output/Arrangement';
import { getDefaultSequences } from '../output/DefaultSequences';
import { createChoiceDefinition } from '../input/Choice';
import { createGridType } from '../output/Grid';
import { createRectangleType, createShapeType } from '../output/Shape';
import { createFreeType } from '../output/Free';
import { createCameraDefinition } from '../input/Camera';
import { createSequenceType } from '../output/Sequence';
import { createPlacementDefinition } from '../input/Placement';
import { createPitchDefinition } from '../input/Pitch';
import { createWebpageDefinition } from '../input/Webpage';
import { createChatDefinition } from '../input/Chat';
import { createMatterType } from '../output/Matter';
import { createVelocityType } from '../output/Velocity';
import { createDirectionType } from '../output/Direction';
import { createReboundType } from '../output/Rebound';
import { createCollisionDefinition } from '../input/Collision';
import type Locales from '../locale/Locales';
import { createReactionDefinition } from '../values/ReactionStream';
import { createSceneDefinition } from '@input/Scene';
import { createAuraType } from '@output/Aura';
import { createSourceType } from '@output/Source';

export default function createDefaultShares(locales: Locales) {
    const TypeType = createOutputType(locales);
    const PlaceType = createPlaceType(locales);
    const VelocityType = createVelocityType(locales);
    const MatterType = createMatterType(locales);
    const ColorType = createColorType(locales);
    const DirectionType = createDirectionType(locales);
    const ReboundType = createReboundType(locales);
    const PhraseType = createPhraseType(locales);
    const GroupType = createGroupType(locales);

    const OutputTypes = {
        Type: TypeType,
        Phrase: PhraseType,
        Group: GroupType,
        Aura: createAuraType(locales),
        Stage: createStageType(locales),
        Shape: createShapeType(locales),
        Pose: createPoseType(locales),
        Sequence: createSequenceType(locales),
        Color: ColorType,
        Place: PlaceType,
        Matter: MatterType,
        Velocity: VelocityType,
        Direction: DirectionType,
        Rebound: ReboundType,
        Rectangle: createRectangleType(locales),
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
        Reaction: createReactionDefinition(locales),
        Scene: createSceneDefinition(locales, PhraseType, GroupType),
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
