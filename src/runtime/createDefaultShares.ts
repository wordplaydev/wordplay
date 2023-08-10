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
import { createKeyDefinition as createKeyType } from '../input/Key';
import { createMicDefinition as createMicType } from '../input/Mic';
import { createMotionDefinition as createMotionType } from '../input/Motion';
import { createPointerDefinition as createPointerType } from '../input/Pointer';
import { createButtonDefinition as createButtonType } from '../input/Button';
import { createRandomFunction } from '../input/Random';
import { createArrangementType } from '../output/Arrangement';
import { getDefaultSequences } from '../output/DefaultSequences';
import { createChoiceDefinition as createChoiceType } from '../input/Choice';
import { createGridType } from '../output/Grid';
import { createRectangleType, createShapeType } from '../output/Shapes';
import { createFreeType } from '../output/Free';
import type Locale from '../locale/Locale';
import { createCameraDefinition as createCameraType } from '../input/Camera';
import { createSequenceType } from '../output/Sequence';
import { createPlacementDefinition } from '../input/Placement';

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
        Choice: createChoiceType(locales),
        Motion: createMotionType(locales, OutputTypes.Type, OutputTypes.Phrase),
        Placement: createPlacementDefinition(locales),
        Key: createKeyType(locales),
        Button: createButtonType(locales),
        Pointer: createPointerType(locales, PlaceType),
        Mic: createMicType(locales),
        Camera: createCameraType(locales, ColorType),
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
