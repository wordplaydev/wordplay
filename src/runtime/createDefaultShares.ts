import { createStageType } from '../output/Stage';
import { createPhraseType } from '../output/Phrase';
import { createGroupType } from '../output/Group';
import { createTypeType } from '../output/TypeOutput';
import { createPoseType } from '../output/Pose';
import { createStackType } from '../output/Stack';
import { createRowType } from '../output/Row';
import { createColorType } from '../output/Color';
import { createPlaceType } from '../output/Place';
import { createTimeDefinition as createTimeType } from '../input/Time';
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
import { createRectangleType, createShapeType } from '../output/Shapes';
import { createFreeType } from '../output/Free';
import type Locale from '../locale/Locale';
import { createCameraDefinition } from '../input/Camera';
import { createSequenceType } from '../output/Sequence';
import { createPlacementDefinition } from '../input/Placement';
import { createPitchDefinition } from '../input/Pitch';

export default function createDefaultShares(locales: Locale[]) {
    const PlaceType = createPlaceType(locales);
    const ColorType = createColorType(locales);

    const OutputTypes = {
        Type: createTypeType(locales),
        Phrase: createPhraseType(locales),
        Group: createGroupType(locales),
        Stage: createStageType(locales),
        Pose: createPoseType(locales),
        Sequence: createSequenceType(locales),
        Color: ColorType,
        Place: PlaceType,
        Shape: createShapeType(locales),
        Rectangle: createRectangleType(locales),
        Arrangement: createArrangementType(locales),
        Stack: createStackType(locales),
        Row: createRowType(locales),
        Grid: createGridType(locales),
        Free: createFreeType(locales),
    };

    const InputTypes = {
        Time: createTimeType(locales),
        Random: createRandomFunction(locales),
        Choice: createChoiceDefinition(locales),
        Motion: createMotionDefinition(
            locales,
            OutputTypes.Type,
            OutputTypes.Phrase
        ),
        Placement: createPlacementDefinition(locales),
        Key: createKeyDefinition(locales),
        Button: createButtonDefinition(locales),
        Pointer: createPointerDefinition(locales, PlaceType),
        Volume: createVolumeDefinition(locales),
        Pitch: createPitchDefinition(locales),
        Camera: createCameraDefinition(locales, ColorType),
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
