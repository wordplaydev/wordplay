import List from "../runtime/List";
import Structure from "../runtime/Structure";
import type Value from "../runtime/Value";
import type Group from "./Group";
import { GroupType } from "./Group";
import { PhraseType, toPhrase } from "./Phrase";
import { RowType, toRow } from "./Row";
import { StackType, toStack } from "./Stack";

export function toGroup(value: Value | undefined): Group | undefined {

    if(!(value instanceof Structure)) return undefined;
    switch(value.type) {
        case PhraseType: return toPhrase(value);
        case StackType : return toStack(value);
        case RowType : return toRow(value);
    }
    return undefined;

}

export function toGroups(value: Value | undefined): Group[] | undefined {

    if (value === undefined || !(value instanceof List))
        return undefined;

    const phrases: Group[] = [];
    for (const val of value.values) {
        if (!(val instanceof Structure && val.type.implements(GroupType)))
            return undefined;
        const phrase = toGroup(val);
        if (phrase === undefined)
            return undefined;
        phrases.push(phrase);
    }
    return phrases;

}
