import type Value from '@values/Value';
import Valued from './Valued';

export default class TextLang extends Valued {
    readonly text: string;
    readonly lang: string | undefined;

    constructor(
        value: Value,
        text: string,
        lang: string | undefined = undefined
    ) {
        super(value);

        this.text = text;
        this.lang = lang;
    }

    toString() {
        return this.text;
    }
}
