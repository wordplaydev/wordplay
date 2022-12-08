import StructureDefinition from "../nodes/StructureDefinition";
import { parseStructure, toTokens } from "../parser/Parser";

export default function toStructure(wordplay: string): StructureDefinition {
    const structure = parseStructure(toTokens(wordplay));
    if(structure instanceof StructureDefinition) return structure;
    throw Error(`Couldn't parse structure: ${structure.toWordplay()}`);
}