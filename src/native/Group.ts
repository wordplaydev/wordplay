import type StructureDefinition from "../nodes/StructureDefinition";
import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, toTokens } from "../parser/Parser";
import List from "../runtime/List";
import Structure from "../runtime/Structure";
import type Value from "../runtime/Value";
import { Phrase } from "./Phrase";

const GroupType = parseStructure(toTokens(
`•Group/eng,▣/😀(
    layout/eng,${TRANSLATE}layout/😀•Layout
    … phrases/eng,${TRANSLATE}phrases/😀•Phrase
)`)) as StructureDefinition;
export default GroupType;

export class Group {

    readonly phrases: Phrase[] = [];

    constructor(structure: Value | undefined) {

        if(structure instanceof Structure) {
            const list = structure.resolve("phrases");
            this.phrases = (list instanceof List ? list.values : []).map(phrase => new Phrase(phrase));        
        }

    }
}