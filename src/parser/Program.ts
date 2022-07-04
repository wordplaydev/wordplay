import Node from "./Node";

export default class Program extends Node {
    
    readonly placeholder: string;

    constructor(placeholder: string) {
        super();
        this.placeholder = placeholder;
    }

    toWordplay(): string {
        return this.placeholder;
    }

}