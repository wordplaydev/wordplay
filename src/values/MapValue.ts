import type Context from '@nodes/Context';
import MapType from '@nodes/MapType';
import UnionType from '@nodes/UnionType';
import NumberValue from '@values/NumberValue';
import NoneValue from '@values/NoneValue';
import SimpleValue from './SimpleValue';
import type Value from '@values/Value';
import {
    BIND_SYMBOL,
    SET_CLOSE_SYMBOL,
    SET_OPEN_SYMBOL,
} from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Expression from '../nodes/Expression';
import type Concretizer from '../nodes/Concretizer';
import type Locales from '../locale/Locales';

export default class MapValue extends SimpleValue {
    readonly values: [Value, Value][];

    /** Later values with equivalent keys override earlier values in the list. */
    constructor(creator: Expression, values: [Value, Value][]) {
        super(creator);

        this.values = [];
        values.forEach((kv) => {
            // If a key already exists, override it.
            const existingKeyIndex = this.values.findIndex((kv2) =>
                kv2[0].isEqualTo(kv[0]),
            );
            if (existingKeyIndex < 0) this.values.push(kv);
            else this.values[existingKeyIndex] = kv;
        });
    }

    size(requestor: Expression) {
        return new NumberValue(requestor, this.values.length);
    }

    has(requestor: Expression, key: Value) {
        const kv = this.values.find((kv2) => kv2[0].isEqualTo(key));
        return kv === undefined ? new NoneValue(requestor) : kv[1];
    }

    isEqualTo(value: Value): boolean {
        if (
            !(value instanceof MapValue) ||
            this.values.length !== value.values.length
        )
            return false;
        // For each pair, see if a corresponding pair exists in the given map.
        for (const keyValue of this.values) {
            if (
                value.values.find(
                    (otherKeyValue) =>
                        keyValue[0].isEqualTo(otherKeyValue[0]) &&
                        keyValue[1].isEqualTo(otherKeyValue[1]),
                ) === undefined
            )
                return false;
        }
        // We made it! Return true.
        return true;
    }

    set(requestor: Expression, key: Value, value: Value) {
        let hasKey = false;
        const values: [Value, Value][] = this.values.map((kv) => {
            if (kv[0].isEqualTo(key)) {
                hasKey = true;
                return [key, value];
            } else return kv.slice();
        }) as [Value, Value][];
        if (!hasKey) values.push([key, value]);
        return new MapValue(requestor, values);
    }

    unset(requestor: Expression, key: Value) {
        return new MapValue(
            requestor,
            this.values.filter((kv) => !kv[0].isEqualTo(key)),
        );
    }

    remove(requestor: Expression, value: Value) {
        return new MapValue(
            requestor,
            this.values.filter((kv) => !kv[1].isEqualTo(value)),
        );
    }

    getKeys() {
        return this.values.map((kv) => kv[0]);
    }

    getValues() {
        return this.values.map((kv) => kv[1]);
    }

    getType(context: Context) {
        return MapType.make(
            UnionType.getPossibleUnion(
                context,
                this.values.map((v) => v[0].getType(context)),
            ),
            UnionType.getPossibleUnion(
                context,
                this.values.map((v) => v[1].getType(context)),
            ),
        );
    }

    getBasisTypeName(): BasisTypeName {
        return 'map';
    }

    toWordplay(locales?: Locales): string {
        return `${SET_OPEN_SYMBOL}${this.values
            .map(
                ([key, value]) =>
                    `${key.toWordplay(locales)}${BIND_SYMBOL}${value.toWordplay(
                        locales,
                    )}`,
            )
            .join(' ')}${SET_CLOSE_SYMBOL}`;
    }

    getDescription(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.term.map),
        );
    }

    getRepresentativeText() {
        return SET_OPEN_SYMBOL + BIND_SYMBOL + SET_CLOSE_SYMBOL;
    }

    getSize() {
        let sum = 0;
        for (const [key, value] of this.values)
            sum += key.getSize() + value.getSize();
        return sum;
    }
}
