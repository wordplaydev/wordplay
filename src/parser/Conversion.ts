import type Node from "./Node";
import Expression from "./Expression";
import type { Token } from "./Token";
import Type from "./Type";
import type Docs from "./Docs";
import type Program from "./Program";
import Conflict from "./Conflict";
import { SemanticConflict } from "./SemanticConflict";
import UnknownType from "./UnknownType";
import type Unparsable from "./Unparsable";
import { docsAreUnique } from "./util";

export default class Conversion extends Expression {

    readonly docs: Docs[];
    readonly convert: Token;
    readonly output: Type | Unparsable;
    readonly expression: Expression | Unparsable;

    constructor(docs: Docs[], convert: Token, output: Type | Unparsable, expression: Expression | Unparsable) {
        super();

        this.docs = docs;
        this.convert = convert;
        this.output = output;
        this.expression = expression;
    }

    getChildren() {
        let children: Node[] = [];
        children = children.concat(this.docs);
        children.push(this.convert);
        children.push(this.output);
        children.push(this.expression);
        return children;
    }

    getConflicts(program: Program): Conflict[] { 
        
        const conflicts: Conflict[] = [];
    
        // Docs must be unique.
        if(!docsAreUnique(this.docs))
            conflicts.push(new Conflict(this, SemanticConflict.DOC_LANGUAGES_ARENT_UNIQUE))
    
        return conflicts; 
    
    }

    getType(program: Program): Type {
        return this.output instanceof Type ? this.output : new UnknownType(this);
    }

}