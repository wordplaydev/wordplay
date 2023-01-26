import type Context from '@nodes/Context';
import type Translation from './Translation';
import type Value from '@runtime/Value';

export default class ValueLink {
    readonly value: Value;
    readonly translation: Translation;
    readonly context: Context;

    constructor(value: Value, translation: Translation, context: Context) {
        this.value = value;
        this.translation = translation;
        this.context = context;
    }

    getDescription() {
        return this.value.toString();
    }
}
