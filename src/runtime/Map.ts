import { MAP_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Context from "../nodes/Context";
import MapType from "../nodes/MapType";
import { getPossibleUnionType } from "../nodes/UnionType";
import Measurement from "./Measurement";
import None from "./None";
import Primitive from "./Primitive";
import type Value from "./Value";
import type Node from "../nodes/Node";
import type LanguageCode from "../nodes/LanguageCode";
import { BIND_SYMBOL, SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";

export default class Map extends Primitive {

    readonly values: [Value, Value][];

    constructor(creator: Node, values: [Value, Value][]) {
        super(creator);

        this.values = [];
        values.forEach(kv => {
            if(this.values.find( kv2 => kv2[0].isEqualTo(kv[0])) === undefined)
                this.values.push(kv);
        });

    }

    size(requestor: Node) { 
        return new Measurement(requestor, this.values.length);
    }

    has(requestor: Node, key: Value) { 
        const kv = this.values.find( kv2 => kv2[0].isEqualTo(key));
        return kv === undefined ? new None(requestor) : kv[1];
    }

    isEqualTo(value: Value): boolean {
        if(!(value instanceof Map) || this.values.length !== value.values.length) return false;
        // For each pair, see if a corresponding pair exists in the given map.
        for(const keyValue of this.values) {
            if(value.values.find(otherKeyValue => keyValue[0].isEqualTo(otherKeyValue[0]) && keyValue[1].isEqualTo(otherKeyValue[1])) === undefined)
                return false;
        }
        // We made it! Return true.
        return true;
    }

    set(requestor: Node, key: Value, value: Value) {
        let hasKey = false;
        const values: [Value, Value][] = this.values.map(kv => {
            if(kv[0].isEqualTo(key)) {
                hasKey = true;
                return [ key, value ];
            }
            else return kv.slice();
        }) as [Value, Value][];
        if(!hasKey)
            values.push([ key, value ]);
        return new Map(requestor, values);
    }

    unset(requestor: Node, key: Value) {
        return new Map(requestor, this.values.filter(kv => !kv[0].isEqualTo(key)));
    }

    remove(requestor: Node, value: Value) {
        return new Map(requestor, this.values.filter(kv => !kv[1].isEqualTo(value)));
    }

    getKeys() { 
        return this.values.map(kv => kv[0]);
    }

    getValues() { 
        return this.values.map(kv => kv[1]);
    }

    getType(context: Context) { 
        return new MapType(
            getPossibleUnionType(context, this.values.map(v => v[0].getType(context))),
            getPossibleUnionType(context, this.values.map(v => v[1].getType(context)))
        ); 
    }
    
    getNativeTypeName(): string { return MAP_NATIVE_TYPE_NAME; }

    toWordplay(languages: LanguageCode[]): string {
        return `${SET_OPEN_SYMBOL}${this.values.map(([ key, value ]) => `${key.toWordplay(languages)}${BIND_SYMBOL}${value.toWordplay(languages)}`).join(" ")}${SET_CLOSE_SYMBOL}`; 
    }

}