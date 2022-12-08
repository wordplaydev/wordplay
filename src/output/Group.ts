import toStructure from "../native/toStructure";
import type Translations from "../nodes/Translations";
import List from "../runtime/List";
import Structure from "../runtime/Structure";
import type Value from "../runtime/Value";
import type Color from "./Color";
import Output from "./Output";
import { PhraseType, toPhrase } from "./Phrase";
import type Place from "./Place";
import { StackType, toStack } from "./Stack";

export const GroupType = toStructure(`
    •Group/eng,▣/😀()
`);

export default abstract class Group extends Output {

    constructor(value: Value) {
        super(value);
    }

    abstract getGroups(): Group[];
    abstract getPlaces(): Place[];
    abstract getBackground(): Color | undefined;
    abstract getDescriptions(): Translations;

}

export function toGroup(value: Value | undefined): Group | undefined {

    if(!(value instanceof Structure)) return undefined;
    switch(value.type) {
        case PhraseType: return toPhrase(value);
        case StackType : return toStack(value);
    }
    return undefined;

}

export function toGroups(value: Value | undefined): Group[] | undefined {

    if(value === undefined || !(value instanceof List))
        return undefined;
    
    const phrases: Group[] = [];
    for(const val of value.values) {
        if(!(val instanceof Structure && val.type === PhraseType))
            return undefined;
        const phrase = toGroup(val);
        if(phrase === undefined)
            return undefined;
        phrases.push(phrase);
    }
    return phrases;

}
