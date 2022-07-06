import type Expression from "./Expression";
import Node from "./Node";
import type { Token } from "./Token";

export default class Template extends Node {
    
    readonly parts: (Token|Expression)[];

    constructor(parts: (Token|Expression)[]) {
        super();

        this.parts = parts;
    }

    getChildren() { return [ ...this.parts ]; }
    toWordplay(): string {
        return `${this.parts.map(p => p.toWordplay())}`;
    }

}