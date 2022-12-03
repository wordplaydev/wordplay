import type StructureDefinition from "../nodes/StructureDefinition";
import StructureType from "../nodes/StructureType";
import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, tokens } from "../parser/Parser";
import type Evaluator from "../runtime/Evaluator";
import type Structure from "../runtime/Structure";
import type Value from "../runtime/Value";
import Group from "./Group";
import Phrase from "./Phrase";
import Text from "../runtime/Text";
import Measurement from "../runtime/Measurement";
import Style from "./Style";
import type Names from "../nodes/Names";
import List from "../runtime/List";
import Unit from "../nodes/Unit";
import Dimension from "../nodes/Dimension";
import { createStructure } from "../runtime/Structure";

const Verse = parseStructure(tokens(`
•Verse/eng,🌎/😀(
    group/eng,${TRANSLATE}group/😀•Group
    style/eng,${TRANSLATE}style/😀•Style: Style("Noto Sans" 12pt)
)`
));

export default Verse;


export function valueToVerse(evaluator: Evaluator, value: Value | undefined): Structure | undefined {

    // If there is no value yet, show it pending.
    if(value === undefined)
        return undefined;

    const contentType = value.getType(evaluator.context);
    if(contentType instanceof StructureType && contentType.structure === Verse)
        return value as Structure;
    else if(contentType instanceof StructureType && contentType.structure === Group)
        return verse(evaluator, value as Structure);
    else if(contentType instanceof StructureType && contentType.structure === Phrase)
        return verse(evaluator, group(evaluator,  value as Structure ));
    else if(value instanceof Text || typeof value === "string")
        return verse(evaluator, group(evaluator, phrase(evaluator, value, 12)));
    else
        return verse(evaluator, group(evaluator, phrase(evaluator, value.toString(), 12)));

}

function verse(evaluator: Evaluator, group: Structure) {
    return createStructure(evaluator, Verse as StructureDefinition, new Map().set(Verse.inputs[0].names, group));
}

function style(evaluator: Evaluator, font: string, size: number) {
    const bindings = new Map<Names, Value>();
    bindings.set(Style.inputs[0].names, new Text(evaluator.source.expression, font));
    bindings.set(Style.inputs[1].names, new Measurement(evaluator.source.expression, size, new Unit(undefined, [ new Dimension("pt")])));
    return createStructure(evaluator, Style, bindings);
}

function phrase(evaluator: Evaluator, text: string | Text, size: number=12, font: string="Noto Sans", ): Structure {
    const bindings = new Map<Names, Value>();
    bindings.set(Phrase.inputs[0].names, text instanceof Text ? text : new Text(evaluator.source.expression, text));
    bindings.set(Phrase.inputs[1].names, style(evaluator, font, size));
    return createStructure(evaluator, Phrase as StructureDefinition, bindings);
}

function group(evaluator: Evaluator, ...phrases: Structure[]) {
    return createStructure(evaluator, Group as StructureDefinition, new Map().set(Group.inputs[1].names, new List(evaluator.source.expression, phrases)));
}