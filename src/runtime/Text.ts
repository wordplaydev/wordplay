import { TEXT_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import Language from "../nodes/Language";
import TextType from "../nodes/TextType";
import Measurement from "./Measurement";
import Primitive from "./Primitive";
import type Value from "./Value";
import type Node from "../nodes/Node";

export default class Text extends Primitive {

    readonly text: string;
    readonly format: string | undefined;

    constructor(creator: Node, text: string, format?: string) {
        super(creator);

        // We normalize all strings to ensure they are comparable.
        this.text = text.normalize();
        this.format = format === undefined || format === "" ? undefined : format;
    }

    getType() { return new TextType(undefined, this.format === undefined ? undefined : new Language(this.format)); }
    
    getNativeTypeName(): string { return TEXT_NATIVE_TYPE_NAME; }

    /* The number of graphemes in the text (not the number of code points). */
    length(requestor: Node) { return new Measurement(requestor, [...this.text].length); }

    toWordplay(): string { return `"${this.text}"${this.format ? this.format : ""}`; }

    isEqualTo(text: Value) { return text instanceof Text && this.text === text.text && this.format === text.format; }

}