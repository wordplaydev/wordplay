import type Bind from "../nodes/Bind";
import Conflict, { UnexpectedTypeVariable, UnknownName } from "../parser/Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import type Token from "./Token";
import type Type from "./Type";
import TypeVariable from "./TypeVariable";
import UnknownType from "./UnknownType";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionType } from "../runtime/Exception";
import type Value from "../runtime/Value";

export default class Name extends Expression {
    
    readonly name: Token;

    constructor(name: Token) {
        super();
        this.name = name;
    }

    getChildren() { return [ this.name ]; }

    getConflicts(program: Program): Conflict[] { 

        const bindOrTypeVar = this.getBind(program);
        return bindOrTypeVar === undefined ? [ new UnknownName(this )] :
            bindOrTypeVar instanceof TypeVariable ? [ new UnexpectedTypeVariable(this)] : 
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

    evaluate(evaluator: Evaluator): Value | Node {
        return new Exception(ExceptionType.NOT_IMPLEMENTED);
    }

}