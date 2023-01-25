import type Context from '@nodes/Context';
import type Translation from './Translation';
import type Value from '@runtime/Value';

export default class ValueLink {
    readonly value: Value;
    readonly translation: Translation;
    readonly context: Context;
    readonly description: string | undefined;

    constructor(
        value: Value,
        translation: Translation,
        context: Context,
        description?: string
    ) {
        this.value = value;
        this.translation = translation;
        this.context = context;
        this.description = description;
    }

    as(description: string) {
        return new ValueLink(
            this.value,
            this.translation,
            this.context,
            description
        );
    }

    getDescription() {
        return this.description ?? this.value.toString();
    }
}
