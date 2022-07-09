import type Expression from "./Expression";
import Node from "./Node";
import type Alias from "./Alias";
import type { Token } from "./Token";
import type Type from "./Type";
import type Unparsable from "./Unparsable";
import type Docs from "./Docs";
import type Program from "./Program";
import Conflict from "./Conflict";
import { SemanticConflict } from "./SemanticConflict";

export default class Bind extends Node {
    
    readonly docs: Docs[];
    readonly names: Alias[];
    readonly dot?: Token;
    readonly type?: Type;
    readonly colon?: Token;
    readonly value?: Expression;

    constructor(docs: Docs[], names: Alias[], dot?: Token, type?: Type | Unparsable, colon?: Token, value?: Expression) {
        super();

        this.docs = docs;
        this.names = names;
        this.dot = dot;
        this.type = type;
        this.colon = colon;
        this.value = value;
    }

    getChildren() { 
        let children: Node[] = [];
        children = children.concat(this.docs);
        children = children.concat(this.names);
        if(this.dot) children.push(this.dot);
        if(this.type) children.push(this.type);
        if(this.colon) children.push(this.colon);
        if(this.value) children.push(this.value);
        return children;
    }

    getConflicts(program: Program): Conflict[] {

        const conflicts = [];

        if(!this.names.every(n => this.names.find(n2 => n !== n2 && n.name.text === n2.name.text) === undefined))
            conflicts.push(new Conflict(this, SemanticConflict.BIND_ALIASES_ARENT_UNIQUE))

        return conflicts;

    }

}