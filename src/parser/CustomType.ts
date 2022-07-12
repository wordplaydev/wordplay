import type Node from "./Node";
import Bind from "./Bind";
import Expression from "./Expression";
import type { Token } from "./Token";
import TypeVariable from "./TypeVariable";
import Unparsable from "./Unparsable";
import type Docs from "./Docs";
import type Program from "./Program";
import Conflict from "./Conflict";
import { SemanticConflict } from "./SemanticConflict";
import type Type from "./Type";
import type Block from "./Block";
import Function from "./Function";
import { docsAreUnique, inputsAreUnique, typeVarsAreUnique } from "./util";

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

    isInterface() {
        if(this.block instanceof Unparsable) return false;
        const binds = this.block.statements.filter(s => s instanceof Bind) as Bind[];
        return !binds.every(b => !(b.value instanceof Function) || b.value.expression instanceof Expression);
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
        if(!docsAreUnique(this.docs))
            conflicts.push(new Conflict(this, SemanticConflict.DOC_LANGUAGES_ARENT_UNIQUE))
    
        // Inputs must have unique names
        if(!inputsAreUnique(this.inputs))
            conflicts.push(new Conflict(this, SemanticConflict.FUNCTION_INPUT_NAMES_MUST_BE_UNIQUE))

        // Type variables must have unique names
        if(!typeVarsAreUnique(this.typeVars))
            conflicts.push(new Conflict(this, SemanticConflict.TYPE_VARS_ARENT_UNIQUE))

        return conflicts; 
    
    }

    /** Given a program that contains this and a name, returns the bind that declares it, if there is one. */
    getDefinition(program: Program, node: Node, name: string): Bind | TypeVariable | undefined {

        // Does an input delare the name?
        const input = this.getBind(name);
        if(input !== undefined) return input;

        // Is it a type variable?
        const typeVar = this.typeVars.find(t => t instanceof TypeVariable && t.name.text === name) as TypeVariable | undefined;
        if(typeVar !== undefined) return typeVar;

        // If not, does the function nearest function or block declare the name?
        return program.getBindingEnclosureOf(this)?.getDefinition(program, node, name);

    }

    getBind(name: string): Bind | undefined {
        return this.inputs.find(i => i instanceof Bind && i.names.find(n => n.name.text === name)) as Bind | undefined;
    }

    getType(program: Program): Type { return this; }

    isCompatible(program: Program, type: Type): boolean { return type === this; }

}