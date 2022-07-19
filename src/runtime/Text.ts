import Value from "./Value";

export default class Text extends Value {

    readonly text: string;
    readonly format: string | undefined;

    constructor(text: string, format?: string) {
        super();

        this.text = text;
        this.format = format;
    }

    toString() { return `"${this.text}"${this.format ? this.format : ""}`; }

}