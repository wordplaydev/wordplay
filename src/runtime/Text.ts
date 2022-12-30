import Language from '../nodes/Language';
import TextType from '../nodes/TextType';
import Measurement from './Measurement';
import Primitive from './Primitive';
import type Value from './Value';
import type Node from '../nodes/Node';
import type { NativeTypeName } from '../native/NativeConstants';

export default class Text extends Primitive {
    readonly text: string;
    readonly format: string | undefined;

    constructor(creator: Node, text: string, format?: string) {
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
    length(requestor: Node) {
        return new Measurement(requestor, [...this.text].length);
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
}
