/** A document representing some text content or a function that produces some text content. */
export default class Document {
    readonly name: string;
    readonly content: string | Document;
    readonly translator: ((doc: Document) => string) | undefined;

    constructor(name: string, content: string | Document, translator?: ((doc: Document) => string) | undefined) {
        this.name = name;
        this.content = content;
        this.translator = translator;
    }

    getName() { return this.name; }
    isEditable() { return typeof this.content === 'string'; }

    getContent(): string {
        return typeof this.content === 'string' ? 
            this.content : 
            this.translator === undefined ? this.content.getContent() :
            this.translator.call(undefined, this.content);
    }

    withContent(newContent: string | Document) {
        return new Document(this.name, newContent, this.translator);
    }

}