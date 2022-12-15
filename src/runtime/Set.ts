import type Context from "../nodes/Context";
import SetType from "../nodes/SetType";
import UnionType from "../nodes/UnionType";
import Bool from "./Bool";
import Measurement from "./Measurement";
import Primitive from "./Primitive";
import type Value from "./Value";
import type Node from "../nodes/Node";
import type LanguageCode from "../nodes/LanguageCode";
import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
import type { NativeTypeName } from "../native/NativeConstants";

export default class Set extends Primitive {

    readonly values: Value[];

    constructor(creator: Node, values: Value[]) {
        super(creator);

        this.values = [];
        values.forEach(v => {
            if(this.values.find(v2 => v.isEqualTo(v2)) === undefined)
                this.values.push(v);
        });

    }

    size(requestor: Node) {
        return new Measurement(requestor, this.values.length);
    }

    has(requestor: Node, key: Value) { 
        return new Bool(requestor, this.values.find(v => key.isEqualTo(v)) !== undefined);
    }

    add(requestor: Node, element: Value) { 
        return new Set(requestor, [ ...this.values, element]);
    }

    remove(requestor: Node, element: Value) { 
        return new Set(requestor, this.values.filter(v => !v.isEqualTo(element)));
    }

    union(requestor: Node, set: Set) { 

        const values = this.values.slice();        
        set.values.forEach(v => { if(values.find(e => e.isEqualTo(v)) === undefined) values.push(v); });
        return new Set(requestor, values);
    }

    intersection(requestor: Node, set: Set) { 

        const values: Value[] = [];
        this.values.forEach(v => { if(set.values.find(e => e.isEqualTo(v)) !== undefined) values.push(v); });
        return new Set(requestor, values);
    }

    difference(requestor: Node, set: Set) { 
        // Remove any values from this set that occur in the given set.
        return new Set(requestor, this.values.filter(v1 => set.values.find(v2 => v1.isEqualTo(v2)) === undefined));
    }

    isEqualTo(set: Value): boolean {
        return set instanceof Set && set.values.length === this.values.length && this.values.every(val => set.values.find(val2 => val.isEqualTo(val2)) !== undefined);
    }

    getType(context: Context) { return SetType.make(UnionType.getPossibleUnion(context, this.values.map(v => v.getType(context)))); }

    getNativeTypeName(): NativeTypeName { return "set"; }

    toWordplay(languages: LanguageCode[]): string {
        return `${SET_OPEN_SYMBOL}${Array.from(this.values).map(value => value.toWordplay(languages)).join(" ")}${SET_CLOSE_SYMBOL}`; 
    }

}