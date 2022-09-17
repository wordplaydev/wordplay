import type Conflict from "../conflicts/Conflict";
import { UnexpectedTypeVariable } from "../conflicts/UnexpectedTypeVariable";
import { UnknownName } from "../conflicts/UnknownName";
import Expression from "./Expression";
import Token from "./Token";
import type Node from "./Node";
import type Type from "./Type";
import TypeVariable from "./TypeVariable";
import UnknownType from "./UnknownType";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import type { ConflictContext } from "./Node";
import type Definition from "./Definition";

export default class Name extends Expression {
    
    readonly name: Token;

    constructor(name: Token) {
        super();
        this.name = name;
    }

    computeChildren() { return [ this.name ]; }

    computeConflicts(context: ConflictContext): Conflict[] { 

        const bindOrTypeVar = this.getBind(context);
        return bindOrTypeVar === undefined ? [ new UnknownName(this )] :
            bindOrTypeVar instanceof TypeVariable ? [ new UnexpectedTypeVariable(this)] : 
            [];
        
    }

    getBind(context: ConflictContext): Definition {

        // Ask the enclosing block for any matching names. It will recursively check the ancestors.
        return this.getBindingEnclosureOf()?.getDefinition(context, this, this.name.text.toString());

    }

    computeType(context: ConflictContext): Type {
        // The type is the type of the bind.
        const bindOrTypeVar = this.getBind(context);
        if(bindOrTypeVar === undefined) return new UnknownType(this);
        if(bindOrTypeVar instanceof TypeVariable) return new UnknownType(this);
        else return bindOrTypeVar instanceof Value ? bindOrTypeVar.getType() : bindOrTypeVar.getTypeUnlessCycle(context);
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {

        // Search for the name in the given evaluation context.
        const value = evaluator.resolve(this.name.text.toString());
        // Return it or an exception if we didn't find it.
        return value === undefined ? new Exception(this, ExceptionKind.UNKNOWN_NAME) : value;

    }

    clone(original?: Node, replacement?: Node) { return new Name(this.name.cloneOrReplace([ Token ], original, replacement)) as this; }
    
}