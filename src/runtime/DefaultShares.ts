import type StructureDefinition from '@nodes/StructureDefinition';
import { VerseType } from '../output/Verse';
import { PhraseType } from '../output/Phrase';
import { GroupType } from '../output/Group';
import { PoseType } from '../output/Pose';
import { StackType } from '../output/Stack';
import { RowType } from '../output/Row';
import { ColorType } from '../output/Color';
import { PlaceType } from '../output/Place';
import { SequenceType } from '../output/Sequence';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import TimeDefinition from '../input/TimeDefinition';
import type StreamDefinition from '../nodes/StreamDefinition';
import KeyboardDefinition from '../input/KeyboardDefinition';
import MousePositionDefinition from '../input/MousePositionDefinition';
import MouseButtonDefinition from '../input/MouseButtonDefinition';
import RandomDefinition from '../input/RandomDefinition';
import MicrophoneDefinition from '../input/MicrophoneDefinition';
import { TimingType } from '../output/Timing';

export const AnimationTypes = [PoseType, SequenceType, TimingType];

export const GroupTypes = [VerseType, GroupType, StackType, RowType];

export const PhraseTypes = [PhraseType, ColorType, PlaceType];

export const StreamDefinitions = [
    TimeDefinition,
    KeyboardDefinition,
    MousePositionDefinition,
    MouseButtonDefinition,
    RandomDefinition,
    MicrophoneDefinition,
];

const DefaultShares: (
    | StructureDefinition
    | FunctionDefinition
    | StreamDefinition
)[] = [...PhraseTypes, ...GroupTypes, ...AnimationTypes, ...StreamDefinitions];
export default DefaultShares;
