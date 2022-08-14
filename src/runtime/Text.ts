import TextType from "../nodes/TextType";
import Primitive from "./Primitive";

export default class Text extends Primitive {

    readonly text: string;
    readonly format: string | undefined;

    constructor(text: string, format?: string) {
        super();

        this.text = text;
        this.format = format;
    }

    getType() { return new TextType(); }
    getNativeTypeName(): string { return "text" }

    toString() { return `"${this.text}"${this.format ? this.format : ""}`; }

}