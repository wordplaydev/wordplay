import Language from '@nodes/Language';
import TextType from '@nodes/TextType';
import Measurement from './Measurement';
import Primitive from './Primitive';
import type Value from './Value';
import type { NativeTypeName } from '../native/NativeConstants';
import type Translation from '@translation/Translation';
import type Expression from '../nodes/Expression';
import List from './List';

export default class Text extends Primitive {
    readonly text: string;
    readonly format: string | undefined;

    constructor(creator: Expression, text: string, format?: string) {
        super(creator);

        // We normalize all strings to ensure they are comparable.
        this.text = text.normalize();
        this.format =
            format === undefined || format === '' ? undefined : format;
    }

    getType() {
        return TextType.make(
            this.format === undefined ? undefined : Language.make(this.format)
        );
    }

    getNativeTypeName(): NativeTypeName {
        return 'text';
    }

    /* The number of graphemes in the text (not the number of code points). */
    length(requestor: Expression) {
        return new Measurement(requestor, [...this.text].length);
    }

    repeat(requestor: Expression, count: number) {
        return new Text(requestor, this.text.repeat(count), this.format);
    }

    segment(requestor: Expression, delimiter: Text) {
        return new List(
            requestor,
            this.text.split(delimiter.text).map((s) => new Text(requestor, s))
        );
    }

    combine(requestor: Expression, text: Text) {
        return new Text(requestor, this.text + text.text);
    }
    toWordplay(): string {
        return `"${this.text}"${this.format ? `/${this.format}` : ''}`;
    }

    isEqualTo(text: Value) {
        return (
            text instanceof Text &&
            this.text === text.text &&
            this.format === text.format
        );
    }

    getDescription(translation: Translation) {
        return translation.data.text;
    }

    getSize() {
        return 1;
    }
}
