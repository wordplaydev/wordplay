import type StructureDefinition from '@nodes/StructureDefinition';
import { StageType } from '../output/Stage';
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
import { KeyDefinition as KeyDefinition } from '../input/Key';
import { MicDefinition as MicDefinition } from '../input/Mic';
import { MotionDefinition } from '../input/Motion';
import { PointerDefinition as PointerDefinition } from '../input/Pointer';
import { ButtonDefinition as ButtonDefinition } from '../input/Button';
import { RandomDefinition } from '../input/Random';
import { ArrangementType } from '../output/Arrangement';
import { CameraDefinition } from '../input/Camera';
import Root from '../nodes/Root';
import { Animations } from '../output/Animations';
import { ChoiceDefinition } from '../input/Choice';
import { GridType } from '../output/Grid';
import { RectangleType, Shapes } from '../output/Shapes';
import { FreeType } from '../output/Free';

export const AnimationTypes = [PoseType, SequenceType];

export const GroupTypes = [TypeType, StageType, GroupType, PhraseType];

export const ShapeTypes = [RectangleType];

export const ArrangementTypes = [
    ArrangementType,
    StackType,
    RowType,
    GridType,
    FreeType,
];

export const AppearanceTypes = [ColorType, PlaceType];

export const StreamDefinitions = [
    TimeDefinition,
    ChoiceDefinition,
    KeyDefinition,
    PointerDefinition,
    ButtonDefinition,
    RandomDefinition,
    MicDefinition,
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
    ...Shapes,
];

export default DefaultShares;

export const DefaultRoots = DefaultShares.map((share) => new Root(share));
