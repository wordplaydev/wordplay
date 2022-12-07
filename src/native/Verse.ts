import type StructureDefinition from "../nodes/StructureDefinition";
import StructureType from "../nodes/StructureType";
import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, toTokens } from "../parser/Parser";
import type Evaluator from "../runtime/Evaluator";
import type Structure from "../runtime/Structure";
import type Value from "../runtime/Value";
import GroupType, { Group } from "./Group";
import PhraseType from "./Phrase";
import Text from "../runtime/Text";
import Measurement from "../runtime/Measurement";
import StyleType, { Style } from "./Style";
import type Names from "../nodes/Names";
import List from "../runtime/List";
import Unit from "../nodes/Unit";
import Dimension from "../nodes/Dimension";
import { createStructure } from "../runtime/Structure";

const VerseType = parseStructure(toTokens(`
•Verse/eng,🌎/😀(
    group/eng,${TRANSLATE}group/😀•Group
    style/eng,${TRANSLATE}style/😀•Style: Style("Noto Sans" 12pt)
)`
)) as StructureDefinition;

export default VerseType;

export class Verse {

    readonly group: Group;
    readonly style: Style;

    constructor(structure: Value | undefined) {

        this.group = new Group(structure?.resolve("group"));
        this.style = new Style(undefined);

    }
}

export function valueToVerse(evaluator: Evaluator, value: Value): Verse {

    const contentType = value.getType(evaluator.getCurrentContext());
    if(contentType instanceof StructureType && contentType.structure === VerseType)
        return new Verse(value);
    else if(contentType instanceof StructureType && contentType.structure === GroupType)
        return verse(evaluator, value as Structure);
    else if(contentType instanceof StructureType && contentType.structure === PhraseType)
        return verse(evaluator, group(evaluator,  value as Structure ));
    else if(value instanceof Text || typeof value === "string")
        return verse(evaluator, group(evaluator, phrase(evaluator, value, 12)));
    else
        return verse(evaluator, group(evaluator, phrase(evaluator, value.toString(), 12)));

}

function verse(evaluator: Evaluator, group: Structure) {
    return new Verse(createStructure(evaluator, VerseType, new Map().set(VerseType.inputs[0].names, group)));
}

function style(evaluator: Evaluator, font: string, size: number) {
    const bindings = new Map<Names, Value>();
    bindings.set(StyleType.inputs[0].names, new Text(evaluator.getMain(), font));
    bindings.set(StyleType.inputs[1].names, new Measurement(evaluator.getMain().expression, size, new Unit(undefined, [ new Dimension("pt")])));
    return createStructure(evaluator, StyleType, bindings);
}

function phrase(evaluator: Evaluator, text: string | Text, size: number=12, font: string="Noto Sans", ): Structure {
    const bindings = new Map<Names, Value>();
    bindings.set(PhraseType.inputs[0].names, text instanceof Text ? text : new Text(evaluator.getMain(), text));
    bindings.set(PhraseType.inputs[1].names, style(evaluator, font, size));
    return createStructure(evaluator, PhraseType as StructureDefinition, bindings);
}

function group(evaluator: Evaluator, ...phrases: Structure[]) {
    return createStructure(evaluator, GroupType, new Map().set(GroupType.inputs[1].names, new List(evaluator.getMain(), phrases)));
}