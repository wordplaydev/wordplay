import type Expression from "./Expression";
import Node from "./Node";
import type { Token } from "./Token";
import type Type from "./Type";
import type Unparsable from "./Unparsable";

export default class Bind extends Node {
    
    readonly name: Token;
    readonly dot?: Token;
    readonly type?: Type;
    readonly colon?: Token;
    readonly value?: Expression;

    constructor(name: Token, dot?: Token, type?: Type | Unparsable, colon?: Token, value?: Expression) {
        super();

        this.name = name;
        this.colon = colon;
        this.value = value;
        this.dot = dot;
        this.type = type;
    }

    getChildren() { 
        const children: Node[] = [ this.name ];
        if(this.dot) children.push(this.dot);
        if(this.type) children.push(this.type);
        if(this.colon) children.push(this.colon);
        if(this.value) children.push(this.value);
        return children;
    }
    toWordplay(): string {
        return `${this.name.toWordplay()}${this.dot === undefined ? "" : this.dot.toWordplay()}${this.type === undefined ? "" : this.type.toWordplay()}${this.colon ? this.colon.toWordplay() : ""} ${this.value ? this.value.toWordplay() : ""}`;
    }

}