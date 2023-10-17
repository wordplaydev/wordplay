import type Context from '@nodes/Context';
import type Value from '@values/Value';
import type Locales from './Locales';

export default class ValueRef {
    readonly value: Value;
    readonly locales: Locales;
    readonly context: Context;

    constructor(value: Value, locales: Locales, context: Context) {
        this.value = value;
        this.locales = locales;
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
