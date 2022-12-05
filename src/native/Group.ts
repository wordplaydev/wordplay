import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, tokens } from "../parser/Parser";
import List from "../runtime/List";
import Structure from "../runtime/Structure";
import type Value from "../runtime/Value";
import { Phrase } from "./Phrase";

const GroupType = parseStructure(tokens(
`•Group/eng,▣/😀(
    layout/eng,${TRANSLATE}layout/😀•Layout
    … phrases/eng,${TRANSLATE}phrases/😀•Phrase
)`));
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