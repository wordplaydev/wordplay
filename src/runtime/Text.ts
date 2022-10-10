import { TEXT_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import Language from "../nodes/Language";
import TextType from "../nodes/TextType";
import Measurement from "./Measurement";
import Primitive from "./Primitive";
import type Value from "./Value";

export default class Text extends Primitive {

    readonly text: string;
    readonly format: string | undefined;

    constructor(text: string, format?: string) {
        super();

        // We normalize all strings to ensure they are comparable.
        this.text = text.normalize();
        this.format = format;
    }

    getType() { return new TextType(undefined, this.format === undefined ? undefined : new Language(this.format)); }
    
    getNativeTypeName(): string { return TEXT_NATIVE_TYPE_NAME; }

    /* The number of graphemes in the text (not the number of code points). */
    length() { return new Measurement([...this.text].length); }

    toString() { return `"${this.text}"${this.format ? this.format : ""}`; }

    isEqualTo(text: Value) { return text instanceof Text && this.text === text.text && this.format === text.format; }

}