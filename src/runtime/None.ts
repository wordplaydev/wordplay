import Value from "./Value";

export default class None extends Value {

    readonly name: string | undefined;

    constructor(name?: string) {
        super();
        this.name = name;
    }

    toString() { return `!${name === undefined ? "" : name}`; }

}