import type Bind from "./Bind";
import Block from "./Block";
import Conflict from "./Conflict";
import CustomType from "./CustomType";
import Expression from "./Expression";
import Function from "./Function";
import type Program from "./Program";
import { SemanticConflict } from "./SemanticConflict";
import type Share from "./Share";
import type { Token } from "./Token";
import type Type from "./Type";
import TypeVariable from "./TypeVariable";
import UnknownType from "./UnknownType";

export default class Name extends Expression {
    
    readonly name: Token;

    constructor(name: Token) {
        super();
        this.name = name;
    }

    getChildren() { return [ this.name ]; }

    getConflicts(program: Program): Conflict[] { 

        const bindOrTypeVar = this.getBind(program);
        return bindOrTypeVar === undefined ? [ new Conflict(this, SemanticConflict.UNDEFINED_NAME )] :
            bindOrTypeVar instanceof TypeVariable ? [ new Conflict(this, SemanticConflict.TYPE_VARIABLE_ISNT_EXPRESSION)] : 
            [];
        
    }

    getBind(program: Program): Bind | TypeVariable | Expression | undefined {

        // Ask the enclosing block for any matching names. It will recursively check the ancestors.
        return program.getBindingEnclosureOf(this)?.getDefinition(program, this, this.name.text);

    }

    getType(program: Program): Type {
        // The type is the type of the bind.
        const bindOrTypeVar = this.getBind(program);
        if(bindOrTypeVar === undefined) return new UnknownType(this);
        if(bindOrTypeVar instanceof TypeVariable) return new UnknownType(this);
        else return bindOrTypeVar.getType(program);
    }

}