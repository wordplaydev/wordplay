import type { BasisTypeName } from '@basis/BasisConstants';
import Decimal from 'decimal.js';
import getConceptName from '@locale/getConceptName';
import type LocaleText from '@locale/LocaleText';
import type Expression from '@nodes/Expression';
import ListType from '@nodes/ListType';
import RangeType from '@nodes/RangeType';
import { RANGE_SYMBOL } from '@parser/Symbols';
import type Evaluator from '@runtime/Evaluator';
import ConversionException from '@values/ConversionException';
import ListValue from '@values/ListValue';
import NumberValue from '@values/NumberValue';
import SimpleValue from '@values/SimpleValue';
import type Value from '@values/Value';

/**
 * The value of an evaluated range (`1‥10`): two number bounds, inclusive of both. Its unit is
 * its bounds' unit, which the `‥` operator requires them to share.
 *
 * Direction is remembered but never consulted by containment — `(10‥1) ∋ 5` is true, because
 * asking whether a number lies between two others has no reason to care which was written
 * first. Enumeration does consult it, stepping from `start` toward `end`, so `10‥1` counts down.
 */
export default class RangeValue extends SimpleValue {
    readonly start: NumberValue;
    readonly end: NumberValue;

    constructor(creator: Expression, start: NumberValue, end: NumberValue) {
        super(creator);
        this.start = start;
        this.end = end;
    }

    /** Whether the given number lies within these bounds, in either direction. */
    contains(value: Value): boolean {
        if (!(value instanceof NumberValue)) return false;
        // A range of meters says nothing about a number of seconds, exactly as `<` doesn't.
        if (!this.start.unit.isEqualTo(value.unit)) return false;
        // Nothing is ordered with respect to not-a-number, so nothing contains it.
        if (value.num.isNaN() || this.start.num.isNaN() || this.end.num.isNaN())
            return false;
        const low = Decimal.min(this.start.num, this.end.num);
        const high = Decimal.max(this.start.num, this.end.num);
        return value.num.gte(low) && value.num.lte(high);
    }

    /** A range used as a match key admits every number it contains. */
    matches(subject: Value): boolean {
        return this.contains(subject);
    }

    /**
     * The numbers from `start` toward `end` in steps of one, carrying the bounds' unit.
     * An unbounded or not-a-number end can't be enumerated, so it converts to nothing rather
     * than looping forever, which is what the number conversion used to do for `∞ → []`.
     */
    toList(requestor: Expression, evaluator: Evaluator): Value {
        if (!this.start.num.isFinite() || !this.end.num.isFinite())
            return new ConversionException(
                evaluator,
                requestor,
                this,
                ListType.make(this.start.getType()),
            );

        const unit = this.start.unit;
        const down = this.end.num.lessThan(this.start.num);
        const values: NumberValue[] = [];
        for (
            let n = this.start.num;
            down ? n.gte(this.end.num) : n.lte(this.end.num);
            n = down ? n.minus(1) : n.plus(1)
        )
            values.push(new NumberValue(requestor, n, unit));
        return new ListValue(requestor, values);
    }

    toWordplay() {
        return `${this.start.toWordplay()}${RANGE_SYMBOL}${this.end.toWordplay()}`;
    }

    getType() {
        return RangeType.make(this.start.unit);
    }

    getBasisTypeName(): BasisTypeName {
        return 'range';
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof RangeValue &&
            this.start.isEqualTo(value.start) &&
            this.end.isEqualTo(value.end)
        );
    }

    getDescription() {
        return (l: LocaleText) => getConceptName(l, 'range');
    }

    getRepresentativeText() {
        return this.toWordplay();
    }

    getSize() {
        return 1;
    }
}
