import type Context from '@nodes/Context';
import type Locale from './Locale';
import type Value from '@runtime/Value';

export default class ValueRef {
    readonly value: Value;
    readonly locale: Locale;
    readonly context: Context;

    constructor(value: Value, locale: Locale, context: Context) {
        this.value = value;
        this.locale = locale;
        this.context = context;
    }

    getDescription() {
        return this.value.toString();
    }

    toWordplay() {
        return this.getDescription();
    }

    toText() {
        return this.getDescription();
    }
}
