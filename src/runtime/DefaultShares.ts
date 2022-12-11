import type StructureDefinition from "../nodes/StructureDefinition";
import { VerseType }  from "../output/Verse";
import { PhraseType } from "../output/Phrase";
import { GroupType }  from "../output/Group";
import { PoseType } from "../output/Pose";
import { StackType } from "../output/Stack";
import { RowType } from "../output/Row";
import { ColorType } from "../output/Color";
import { PlaceType } from "../output/Place";
import { SequenceType } from "../output/Sequence";

const ImplicitShares: StructureDefinition[] = [
    VerseType,
    PhraseType,
    GroupType,
    StackType,
    RowType,
    ColorType,
    PlaceType,
    PoseType,
    SequenceType
];
export default ImplicitShares;