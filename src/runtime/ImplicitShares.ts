import type StructureDefinition from '../nodes/StructureDefinition';
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
import type FunctionDefinition from '../nodes/FunctionDefinition';
import Key from '../streams/Key';

const ImplicitShares: (StructureDefinition | FunctionDefinition)[] = [
    VerseType,
    PhraseType,
    GroupType,
    StackType,
    RowType,
    ColorType,
    PlaceType,
    PoseType,
    SequenceType,
    Key,
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
export default ImplicitShares;
