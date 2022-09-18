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
import type Context from "./Context";
import type Definition from "./Definition";
import { getCaseCollision } from "./util";

export default class Name extends Expression {
    
    readonly name: Token;

    constructor(name: Token) {
        super();
        this.name = name;
    }

    getName() { return this.name.getText(); }
    computeChildren() { return [ this.name ]; }

    computeConflicts(context: Context): Conflict[] { 

        const name = this.getName();
        const bindOrTypeVar = this.getBind(context);

        const conflicts = [];

        if(bindOrTypeVar === undefined)
            conflicts.push(new UnknownName(this ));
        else if(bindOrTypeVar instanceof TypeVariable)
            conflicts.push(new UnexpectedTypeVariable(this));
            
        // Is there match with the other case?
        const caseCollision = getCaseCollision(name, this.getBindingEnclosureOf(), context, this);
        if(caseCollision) conflicts.push(caseCollision);

        return conflicts;
        
    }

    getBind(context: Context): Definition {

        // Ask the enclosing block for any matching names. It will recursively check the ancestors.
        return this.getBindingEnclosureOf()?.getDefinition(this.getName(), context, this);

    }

    computeType(context: Context): Type {
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