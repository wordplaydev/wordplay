import type Context from '#nodes/Context.ts';
import type Value from '#values/Value.ts';
import type Locales from '#locale/Locales.ts';

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
