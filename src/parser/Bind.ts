import type Expression from "./Expression";
import Node from "./Node";
import type Alias from "./Alias";
import type { Token } from "./Token";
import type Type from "./Type";
import type Unparsable from "./Unparsable";

export default class Bind extends Node {
    
    readonly docs?: Token;
    readonly names: Alias[];
    readonly dot?: Token;
    readonly type?: Type;
    readonly colon?: Token;
    readonly value?: Expression;

    constructor(names: Alias[], dot?: Token, type?: Type | Unparsable, colon?: Token, value?: Expression, docs?: Token) {
        super();

        this.docs = docs;
        this.names = names;
        this.colon = colon;
        this.value = value;
        this.dot = dot;
        this.type = type;
    }

    getChildren() { 
        let children: Node[] = [];
        if(this.docs) children.push(this.docs);
        children = children.concat(this.names);
        if(this.dot) children.push(this.dot);
        if(this.type) children.push(this.type);
        if(this.colon) children.push(this.colon);
        if(this.value) children.push(this.value);
        return children;
    }

}