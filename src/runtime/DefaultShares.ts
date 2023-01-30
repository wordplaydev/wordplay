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
import {
    careful,
    cautious,
    elastic,
    erratic,
    fast,
    pokey,
    quick,
    rushed,
    straight,
    wreckless,
    zippy,
    bouncy,
} from '../output/Easing';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import Key from '../input/Key';
import TimeDefinition from '../input/TimeDefinition';
import type StreamDefinition from '../nodes/StreamDefinition';
import KeyboardDefinition from '../input/KeyboardDefinition';
import MousePositionDefinition from '../input/MousePositionDefinition';
import MouseButtonDefinition from '../input/MouseButtonDefinition';
import RandomDefinition from '../input/RandomDefinition';
import MicrophoneDefinition from '../input/MicrophoneDefinition';

export const PoseTypes = [
    PoseType,
    SequenceType,
    straight,
    pokey,
    fast,
    quick,
    zippy,
    careful,
    cautious,
    rushed,
    wreckless,
    elastic,
    erratic,
    bouncy,
];

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
)[] = [...PhraseTypes, ...GroupTypes, ...PoseTypes, ...StreamDefinitions, Key];
export default DefaultShares;
