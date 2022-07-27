import type Value from "../runtime/Value";

/** A document representing some text content or a function that produces some text content. */
export default class Document {
    readonly name: string;
    readonly content: string | Value | undefined;
    readonly editable: boolean;

    constructor(name: string, content: string | Value | undefined, editable=false) {
        this.name = name;
        this.content = content;
        this.editable = editable;
    }

    getName() { return this.name; }
    isEditable() { return this.editable; }

    getContent(): string | Value | undefined { return this.content; }

}