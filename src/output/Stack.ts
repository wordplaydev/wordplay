import toStructure from "../native/toStructure";
import type Translations from "../nodes/Translations";
import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";
import type Value from "../runtime/Value";
import type Color from "./Color";
import Group, { toGroups } from "./Group";
import type Place from "./Place";

export const StackType = toStructure(`
    •Stack/eng,▣/😀(
        …phrases/eng,${TRANSLATE}phrases/😀•Phrase
    )
`);

export class Stack extends Group {

    readonly phrases: Group[] = [];

    constructor(value: Value, phrases: Group[]) {
        super(value);

        this.phrases = phrases;

    }

    getGroups(): Group[] {
       return this.phrases;
    }

    getPlaces(): Place[] {

    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescriptions(): Translations {
        return WRITE_DOCS;
    }

}

export function toStack(value: Value | undefined): Stack | undefined {

    if(value === undefined) return undefined;

    const phrases = toGroups(value.resolve("phrases"));

    return phrases ? new Stack(value, phrases) : undefined;

}
