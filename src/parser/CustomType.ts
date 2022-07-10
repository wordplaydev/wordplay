import type Node from "./Node";
import Bind from "./Bind";
import Expression from "./Expression";
import Function from "./Function";
import type { Token } from "./Token";
import type TypeVariable from "./TypeVariable";
import type Unparsable from "./Unparsable";
import Block from "./Block";
import type Docs from "./Docs";
import type Program from "./Program";
import Conflict from "./Conflict";
import { SemanticConflict } from "./SemanticConflict";

export default class CustomType extends Expression {

    readonly docs: Docs[];
    readonly type: Token;
    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open: Token;
    readonly inputs: (Bind | Unparsable)[];
    readonly close: Token;
    readonly block: Block | Unparsable;

    constructor(docs: Docs[], type: Token, typeVars: (TypeVariable|Unparsable)[], open: Token, inputs: (Bind|Unparsable)[], close: Token, block: Block | Unparsable) {
        super();

        this.docs = docs;
        this.type = type;
        this.typeVars = typeVars;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.block = block;
    }

    getChildren() {
        let children: Node[] = [ ...this.docs, this.type ];
        children = children.concat(this.typeVars);
        children = children.concat([ this.open, ...this.inputs, this.close, this.block ]);
        return children;
    }

    getConflicts(program: Program): Conflict[] { 
        
        const conflicts: Conflict[] = [];
    
        // Docs must be unique.
        if(!program.docsAreUnique(this.docs))
            conflicts.push(new Conflict(this, SemanticConflict.DOC_LANGUAGES_ARENT_UNIQUE))
    
        return conflicts; 
    
    }

    /** Given a program that contains this and a name, returns the bind that declares it, if there is one. */
    getDefinition(program: Program, name: string): Bind | undefined {

        // Does an input delare the name?
        const input = this.inputs.find(i => i instanceof Bind && i.names.find(n => n.name.text === name)) as Bind | undefined;
        if(input !== undefined) return input;

        // If not, does the function nearest function or block declare the name?
        const enclosure = program.getBindingEnclosureOf(this);
        if(enclosure instanceof Function) 
            return enclosure.getDefinition(program, name);
        else if(enclosure instanceof Block)
            return enclosure.getDefinition(program, enclosure.statements.length, name);
        else if(enclosure instanceof CustomType)
            return enclosure.getDefinition(program, name);

    }

}