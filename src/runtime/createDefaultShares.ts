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
import { createRandomDefinition as createRandomType } from '../input/Random';
import { createArrangementType } from '../output/Arrangement';
import { getDefaultSequences } from '../output/DefaultSequences';
import { createChoiceDefinition as createChoiceType } from '../input/Choice';
import { createGridType } from '../output/Grid';
import { createRectangleType, createShapeType } from '../output/Shapes';
import { createFreeType } from '../output/Free';
import type Locale from '../locale/Locale';
import { createCameraDefinition as createCameraType } from '../input/Camera';
import { createSequenceType } from '../output/Sequence';

export default function createDefaultShares(locales: Locale[]) {
    const PlaceType = createPlaceType(locales);
    const ColorType = createColorType(locales);

    const OutputTypes = {
        phrase: createPhraseType(locales),
        pose: createPoseType(locales),
        sequence: createSequenceType(locales),
        group: createGroupType(locales),
        stage: createStageType(locales),
        stack: createStackType(locales),
        row: createRowType(locales),
        grid: createGridType(locales),
        free: createFreeType(locales),
        color: ColorType,
        place: PlaceType,
        rectangle: createRectangleType(locales),
        arrangement: createArrangementType(locales),
        type: createTypeType(locales),
        shape: createShapeType(locales),
    };

    const InputTypes = {
        time: createTimeType(locales),
        random: createRandomType(locales),
        choice: createChoiceType(locales),
        motion: createMotionType(locales, OutputTypes.type, OutputTypes.phrase),
        key: createKeyType(locales),
        button: createButtonType(locales),
        pointer: createPointerType(locales, PlaceType),
        mic: createMicType(locales),
        camera: createCameraType(locales, ColorType),
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
