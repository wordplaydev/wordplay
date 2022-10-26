import { MAP_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import Name from "../nodes/Name";
import type Context from "../nodes/Context";
import MapType from "../nodes/MapType";
import { getPossibleUnionType } from "../nodes/UnionType";
import Measurement from "./Measurement";
import None from "./None";
import Primitive from "./Primitive";
import type Value from "./Value";
import Names from "../nodes/Names";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations";
import type LanguageCode from "../nodes/LanguageCode";

export default class Map extends Primitive {

    readonly values: [Value, Value][];

    constructor(values: [Value, Value][]) {
        super();

        this.values = [];
        values.forEach(kv => {
            if(this.values.find( kv2 => kv2[0].isEqualTo(kv[0])) === undefined)
                this.values.push(kv);
        });

    }

    size() { 
        return new Measurement(this.values.length);
    }

    has(key: Value) { 
        const kv = this.values.find( kv2 => kv2[0].isEqualTo(key));
        return kv === undefined ? new None(UnknownKeyNames) : kv[1];
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

    set(key: Value, value: Value) {
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
        return new Map(values);
    }

    unset(key: Value) {
        return new Map(this.values.filter(kv => !kv[0].isEqualTo(key)));
    }

    remove(value: Value) {
        return new Map(this.values.filter(kv => !kv[1].isEqualTo(value)));
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

    toString() { return `{${Array.from(this.values).sort().map(k => `${k[0].toString()}:${(this.has(k[0]) as Value).toString()}`).join(" ")}}`; }

}

const UnknownKey: Translations = {
    eng: "unknown-key",
    "😀": TRANSLATE
}

const UnknownKeyNames = new Names(Object.keys(UnknownKey).map(lang => new Name(UnknownKey[lang as LanguageCode], lang)));