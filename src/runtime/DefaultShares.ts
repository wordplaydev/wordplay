import { VerseType }  from "../output/Verse";
import { PhraseType } from "../output/Phrase";
import { GroupType }  from "../output/Group";
import { TransitionType } from "../output/Transition";
import { FadeType } from "../output/Fade";
import { ScaleType } from "../output/Scale";
import type StructureDefinition from "../nodes/StructureDefinition";
import { StackType } from "../output/Stack";

const ImplicitShares: StructureDefinition[] = [
    VerseType,
    PhraseType,
    GroupType,
    StackType,
    TransitionType,
    FadeType,
    ScaleType
];
export default ImplicitShares;