import type StructureDefinition from "../nodes/StructureDefinition";
import { parseStructure, tokens } from "../parser/Parser";
import Structure from "../runtime/Structure";
import { Style } from "./Style";
import { Transition } from "./Transition";
import { Animation } from "./Animation";
import type Value from "../runtime/Value";

const PhraseType = parseStructure(tokens(
`•Phrase/eng,💬/😀(
    text/eng,✍︎/😀•""
    style/eng,👗/😀•Style•ø:ø
    in/eng,👍/😀•Transition•ø:ø 
    animate/eng,🔂/😀•Animation•ø:ø
)`)) as StructureDefinition;

export class Phrase {

    readonly structure: Structure | undefined;
    readonly text: string = "";
    readonly style: Style = new Style(undefined);
    readonly transition: Transition | undefined = undefined;
    readonly animation: Animation | undefined = undefined;

    constructor(structure: Value | undefined) {

        if(structure instanceof Structure) {
            this.structure = structure;
            this.text = structure.getText("text") ?? "";
            this.style = new Style(structure.resolve("style"));
            this.transition = new Transition(structure.resolve("in"));
            this.animation = new Animation(structure.resolve("animate"));
        }
            
    }

}

export default PhraseType;