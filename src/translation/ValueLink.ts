import type Context from '@nodes/Context';
import type Locale from './Locale';
import type Value from '@runtime/Value';

export default class ValueLink {
    readonly value: Value;
    readonly translation: Locale;
    readonly context: Context;

    constructor(value: Value, translation: Locale, context: Context) {
        this.value = value;
        this.translation = translation;
        this.context = context;
    }

    getDescription() {
        return this.value.toString();
    }
}
