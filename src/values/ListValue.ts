import ListType from '@nodes/ListType';
import BoolValue from '@values/BoolValue';
import TextValue from '../values/TextValue';
import NumberValue from '@values/NumberValue';
import NoneValue from '@values/NoneValue';
import SimpleValue from './SimpleValue';
import type Value from '../values/Value';
import UnionType from '@nodes/UnionType';
import type Context from '@nodes/Context';
import { LIST_CLOSE_SYMBOL, LIST_OPEN_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Expression from '../nodes/Expression';
import type Concretizer from '../nodes/Concretizer';
import type Locales from '../locale/Locales';

export default class ListValue extends SimpleValue {
    readonly values: Value[] = [];

    constructor(creator: Expression, values: Value[]) {
        super(creator);

        this.values = values.slice();
    }

    getValues() {
        return this.values;
    }

    get(index: NumberValue | number) {
        const num = index instanceof NumberValue ? index.toNumber() : index;
        const value =
            num === 0
                ? undefined
                : this.values.at(
                      (num > 0 ? num - 1 : num) % this.values.length
                  );
        return value === undefined ? new NoneValue(this.creator) : value;
    }

    length(requestor: Expression) {
        return new NumberValue(requestor, this.values.length);
    }

    has(requestor: Expression, value: Value) {
        return new BoolValue(
            requestor,
            this.values.find((v) => value.isEqualTo(v)) !== undefined
        );
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof ListValue &&
            this.values.length === value.values.length &&
            this.values.every((v, index) => value.values[index].isEqualTo(v))
        );
    }

    join(requestor: Expression, separator: TextValue) {
        return new TextValue(
            requestor,
            this.values
                .map((v) => (v instanceof TextValue ? v.text : v.toString()))
                .join(separator.text)
        );
    }

    add(requestor: Expression, value: Value) {
        return new ListValue(requestor, [...this.values, value]);
    }

    replace(requestor: Expression, index: NumberValue, value: Value) {
        const copy = this.values.slice();
        const num = index.toNumber();
        if (!isNaN(num) && num >= 1 && num <= copy.length)
            copy[num - 1] = value;
        return new ListValue(requestor, copy);
    }

    first() {
        return this.values.length === 0
            ? new NoneValue(this.creator)
            : this.values[0];
    }

    last() {
        return this.values.length === 0
            ? new NoneValue(this.creator)
            : this.values[this.values.length - 1];
    }

    subsequence(
        requestor: Expression,
        start: NumberValue | number,
        end: NumberValue | number | NoneValue
    ): ListValue {
        const actualStart = Math.max(
            1,
            start instanceof NumberValue ? start.toNumber() : start
        );
        const actualEnd = Math.min(
            this.values.length,
            end instanceof NoneValue
                ? this.values.length
                : end instanceof NumberValue
                ? end.toNumber()
                : end
        );
        const newList = new ListValue(
            requestor,
            this.values.slice(
                Math.min(actualStart, actualEnd) - 1,
                Math.max(actualStart, actualEnd)
            )
        );
        return actualStart > actualEnd ? newList.reverse(requestor) : newList;
    }

    sansFirst(requestor: Expression) {
        return new ListValue(requestor, this.values.slice(1));
    }

    sansLast(requestor: Expression) {
        return new ListValue(requestor, this.values.slice(0, -1));
    }

    sansAll(requestor: Expression, value: Value) {
        return new ListValue(
            requestor,
            this.values.filter((v) => !v.isEqualTo(value))
        );
    }

    reverse(requestor: Expression) {
        return new ListValue(requestor, this.values.reverse());
    }

    append(requestor: Expression, list: ListValue) {
        return new ListValue(requestor, [...this.values, ...list.values]);
    }

    getType(context: Context) {
        return ListType.make(
            UnionType.getPossibleUnion(
                context,
                this.values.map((v) => v.getType(context))
            )
        );
    }

    getBasisTypeName(): BasisTypeName {
        return 'list';
    }

    toWordplay(locales?: Locales): string {
        return `${LIST_OPEN_SYMBOL}${Array.from(this.values)
            .map((value) => value.toWordplay(locales))
            .join(' ')}${LIST_CLOSE_SYMBOL}`;
    }

    getDescription(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.term.list)
        );
    }

    getRepresentativeText() {
        return LIST_OPEN_SYMBOL + LIST_CLOSE_SYMBOL;
    }

    getSize() {
        let sum = 0;
        for (const value of this.values) sum += value.getSize();
        return sum;
    }
}
