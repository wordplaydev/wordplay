import type LocaleText from '@locale/LocaleText';
import type Context from '@nodes/Context';
import SetType from '@nodes/SetType';
import UnionType from '@nodes/UnionType';
import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from '@parser/Symbols';
import BoolValue from '@values/BoolValue';
import NumberValue from '@values/NumberValue';
import type Value from '@values/Value';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import type Expression from '../nodes/Expression';
import SimpleValue from './SimpleValue';

export default class SetValue extends SimpleValue {
    readonly values: Value[];
    private _type: SetType | undefined = undefined;

    constructor(creator: Expression, values: Value[]) {
        super(creator);

        this.values = [];
        values.forEach((v) => {
            if (!this.values.some((v2) => v.isEqualTo(v2))) this.values.push(v);
        });
    }

    size(requestor: Expression) {
        return new NumberValue(requestor, this.values.length);
    }

    has(requestor: Expression, key: Value) {
        return new BoolValue(
            requestor,
            this.values.find((v) => key.isEqualTo(v)) !== undefined,
        );
    }

    add(requestor: Expression, element: Value) {
        return new SetValue(requestor, [...this.values, element]);
    }

    remove(requestor: Expression, element: Value) {
        return new SetValue(
            requestor,
            this.values.filter((v) => !v.isEqualTo(element)),
        );
    }

    union(requestor: Expression, set: SetValue) {
        const values = this.values.slice();
        set.values.forEach((v) => {
            if (values.find((e) => e.isEqualTo(v)) === undefined)
                values.push(v);
        });
        return new SetValue(requestor, values);
    }

    intersection(requestor: Expression, set: SetValue) {
        const values: Value[] = [];
        this.values.forEach((v) => {
            if (set.values.find((e) => e.isEqualTo(v)) !== undefined)
                values.push(v);
        });
        return new SetValue(requestor, values);
    }

    difference(requestor: Expression, set: SetValue) {
        // Remove any values from this set that occur in the given set.
        return new SetValue(
            requestor,
            this.values.filter(
                (v1) => set.values.find((v2) => v1.isEqualTo(v2)) === undefined,
            ),
        );
    }

    isEqualTo(set: Value): boolean {
        return (
            set instanceof SetValue &&
            set.values.length === this.values.length &&
            this.values.every(
                (val) =>
                    set.values.find((val2) => val.isEqualTo(val2)) !==
                    undefined,
            )
        );
    }

    getType(context: Context) {
        if (this._type === undefined)
            this._type = SetType.make(
                UnionType.getPossibleUnion(
                    context,
                    this.values.map((v) => v.getType(context)),
                ),
            );
        return this._type;
    }

    getBasisTypeName(): BasisTypeName {
        return 'set';
    }

    toWordplay(locales?: Locales): string {
        return `${SET_OPEN_SYMBOL}${Array.from(this.values)
            .map((value) => value.toWordplay(locales))
            .join(' ')}${SET_CLOSE_SYMBOL}`;
    }

    getDescription() {
        return (l: LocaleText) => l.term.set;
    }

    getRepresentativeText() {
        return SET_OPEN_SYMBOL + SET_CLOSE_SYMBOL;
    }

    getSize() {
        let sum = 0;
        for (const value of this.values) sum += value.getSize();
        return sum;
    }
}
