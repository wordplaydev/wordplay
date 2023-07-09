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
import {
    createBounce,
    createFadeIn,
    createPopup,
    createShake,
    createSpin,
    createSway,
} from '../output/DefaultSequences';
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
        pose: createPoseType(locales),
        sequence: createSequenceType(locales),
        type: createTypeType(locales),
        phrase: createPhraseType(locales),
        group: createGroupType(locales),
        stage: createStageType(locales),
        color: ColorType,
        place: PlaceType,
        shape: createShapeType(locales),
        rectangle: createRectangleType(locales),
        arrangement: createArrangementType(locales),
        stack: createStackType(locales),
        row: createRowType(locales),
        grid: createGridType(locales),
        free: createFreeType(locales),
    };

    const InputTypes = {
        time: createTimeType(locales),
        choice: createChoiceType(locales),
        key: createKeyType(locales),
        pointer: createPointerType(locales, PlaceType),
        button: createButtonType(locales),
        random: createRandomType(locales),
        mic: createMicType(locales),
        camera: createCameraType(locales, ColorType),
        motion: createMotionType(locales, OutputTypes.type, OutputTypes.phrase),
    };

    const Sequences = {
        sway: createSway(locales),
        bounce: createBounce(locales),
        spin: createSpin(locales),
        fadein: createFadeIn(locales),
        popup: createPopup(locales),
        shake: createShake(locales),
    };

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
