/** A document representing some text content or a function that produces some text content. */
export default class Document {
    readonly name: string;
    readonly content: string | (() => string);

    constructor(name: string, content: string | (() => string)) {
        this.name = name;
        this.content = content;
    }

    getName() { return this.name; }
    isEditable() { return typeof this.content === 'string'; }

    getContent() {
        return typeof this.content === 'string' ? this.content : this.content.call(undefined);
    }

}