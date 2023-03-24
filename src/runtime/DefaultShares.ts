import type StructureDefinition from '@nodes/StructureDefinition';
import { VerseType } from '../output/Verse';
import { PhraseType } from '../output/Phrase';
import { GroupType } from '../output/Group';
import { TypeType } from '../output/TypeOutput';
import { PoseType } from '../output/Pose';
import { StackType } from '../output/Stack';
import { RowType } from '../output/Row';
import { ColorType } from '../output/Color';
import { PlaceType } from '../output/Place';
import { SequenceType } from '../output/Sequence';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type StreamDefinition from '../nodes/StreamDefinition';
import { TimeDefinition } from '../input/Time';
import { KeyboardDefinition } from '../input/Keyboard';
import { MicrophoneDefinition } from '../input/Microphone';
import { MotionDefinition } from '../input/Motion';
import { MousePositionDefinition } from '../input/MousePosition';
import { MouseButtonDefinition } from '../input/MouseButton';
import { RandomDefinition } from '../input/Random';
import { ArrangementType } from '../output/Layout';
import { CameraDefinition } from '../input/Camera';
import Root from '../nodes/Root';
import { Animations } from '../output/Animations';

export const AnimationTypes = [PoseType, SequenceType];

export const GroupTypes = [TypeType, VerseType, GroupType, PhraseType];

export const ArrangementTypes = [ArrangementType, StackType, RowType];

export const AppearanceTypes = [ColorType, PlaceType];

export const StreamDefinitions = [
    TimeDefinition,
    KeyboardDefinition,
    MousePositionDefinition,
    MouseButtonDefinition,
    RandomDefinition,
    MicrophoneDefinition,
    CameraDefinition,
    MotionDefinition,
];

const DefaultShares: (
    | StructureDefinition
    | FunctionDefinition
    | StreamDefinition
)[] = [
    ...AppearanceTypes,
    ...GroupTypes,
    ...ArrangementTypes,
    ...AnimationTypes,
    ...StreamDefinitions,
    ...Animations,
];

export default DefaultShares;

export const DefaultRoots = DefaultShares.map((share) => new Root(share));
