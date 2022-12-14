import ListType from "../nodes/ListType";
import Bool from "./Bool";
import Text from "./Text";
import Measurement from "./Measurement";
import None from "./None";
import Primitive from "./Primitive";
import type Value from "./Value";
import { LIST_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { getPossibleUnionType } from "../nodes/UnionType";
import type Context from "../nodes/Context";
import { TRANSLATE } from "../nodes/Translations";
import type LanguageCode from "../nodes/LanguageCode";
import type Translations from "../nodes/Translations";
import Names from "../nodes/Names";
import type Node from "../nodes/Node";
import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from "../parser/Tokenizer";

export default class List extends Primitive {

    readonly values: Value[] = [];

    constructor(creator: Node, values: Value[]) {
        super(creator);

        this.values = values.slice();
    }

    getValues() { return this.values; }

    get(index: Measurement) {
        const value = this.values[index.toNumber() - 1];
        return value === undefined ? new None(OutOfBoundsNames) : value;
    }

    length(requestor: Node) { return new Measurement(requestor, this.values.length); }

    has(requestor: Node, value: Value) { 
        return new Bool(requestor, this.values.find(v => value.isEqualTo(v)) !== undefined);
    }

    isEqualTo(value: Value): boolean {
        return value instanceof List && this.values.length === value.values.length && this.values.every((v, index) => value.values[index].isEqualTo(v));
    }

    join(requestor: Node, separator: Text) { 
        return new Text(requestor, this.values.map(v => v instanceof Text ? v.text : v.toString()).join(separator.text));
    }

    add(requestor: Node, value: Value) { return new List(requestor, [...this.values, value]); }

    first() { return this.values.length === 0 ? new None(OutOfBoundsNames) : this.values[0]; }

    last() { return this.values.length === 0 ? new None(OutOfBoundsNames) : this.values[this.values.length - 1];}

    sansFirst(requestor: Node) { return new List(requestor, this.values.slice(1)); }

    sansLast(requestor: Node) { return new List(requestor, this.values.slice(0, -1)); }

    sans(requestor: Node, value: Value) { 
        const val = this.values.find(v => v.isEqualTo(value));
        return val === undefined ? this : new List(requestor, this.values.filter(v => v !== val));    
    }

    sansAll(requestor: Node, value: Value) { 
        return new List(requestor, this.values.filter(v => !v.isEqualTo(value)));
    }

    reverse(requestor: Node) { return new List(requestor, this.values.reverse()); }

    append(requestor: Node, value: Value) { return new List(requestor, [ ...this.values, value ]); }

    getType(context: Context) { return ListType.make(getPossibleUnionType(context, this.values.map(v => v.getType(context)))); }

    getNativeTypeName(): string { return LIST_NATIVE_TYPE_NAME; }

    toWordplay(languages: LanguageCode[]): string {
        return `${LIST_OPEN_SYMBOL}${Array.from(this.values).map(value => value.toWordplay(languages)).join(" ")}${LIST_CLOSE_SYMBOL}`; 
    }

}

const OutOfBounds: Translations = {
    eng: "outofbounds",
    "😀": TRANSLATE
};
const OutOfBoundsNames = Names.make(OutOfBounds);
