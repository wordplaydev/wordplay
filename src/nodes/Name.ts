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
import Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import type Context from "./Context";
import type Definition from "./Definition";
import { getCaseCollision } from "./util";
import Bind from "./Bind";
import CircularReference from "../conflicts/CircularReference";
import Reaction from "./Reaction";
import Conditional from "./Conditional";
import UnionType, { TypeSet } from "./UnionType";
import Is from "./Is";
import NameException from "../runtime/NameException";

export default class Name extends Expression {
    
    readonly name: Token;

    /**
     * A cache of the possible types this name might have at this point in the program.
     */
    _unionTypes: Type | undefined;

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

        // Is this name undefined in scope?
        if(bindOrTypeVar === undefined)
            conflicts.push(new UnknownName(this.name));
        // Type variables aren't alowed in names.
        else if(bindOrTypeVar instanceof TypeVariable)
            conflicts.push(new UnexpectedTypeVariable(this));
        
        // Is this name referred to in its bind?
        if(bindOrTypeVar instanceof Bind && bindOrTypeVar.contains(this)) {
            // Does this name have a parent that's a reaction, and is the bind a parent of that reaction?
            const reaction = this.getAncestors()?.find(n => n instanceof Reaction);
            const validCircularReference = reaction !== undefined && reaction.getAncestors()?.includes(bindOrTypeVar);
            if(!validCircularReference)
                conflicts.push(new CircularReference(this));
        }

        // Is there match with the other case? Warn about it.
        const caseCollision = getCaseCollision(name, this.getBindingEnclosureOf(), context, this);
        if(caseCollision) conflicts.push(caseCollision);

        return conflicts;
        
    }

    getBind(context: Context): Definition | undefined {

        // Ask the enclosing block for any matching names. It will recursively check the ancestors.
        return this.getBindingEnclosureOf()?.getDefinitionOfName(this.getName(), context, this);

    }

    computeType(context: Context): Type {
        // The type is the type of the bind.
        const definition = this.getBind(context);

        // If we couldn't find a definition or the definition is a type variable, return unknown.
        if(definition === undefined || definition instanceof TypeVariable) return new UnknownType(this);

        // Get the type of the value, bind, or expression.
        const type = definition instanceof Value ? definition.getType(context) : definition.getTypeUnlessCycle(context);

        // Is the type a union? Find the subset of types that are feasible, given any type checks in conditionals.
        if(definition instanceof Bind && type instanceof UnionType && this._unionTypes === undefined) {

            // Find any conditionals with type checks that refer to the value bound to this name.
            // Reverse them so they are in furthest to nearest ancestor, so we narrow types in execution order.
            const guards = this.getAncestors()?.filter(a => 
                    a instanceof Conditional &&
                    a.condition.nodes(
                        n =>    n.getParent() instanceof Is && 
                                n instanceof Name && definition === n.getBind(context)
                    )
                ).reverse() as Conditional[];

            // Grab the furthest ancestor and evaluate possible types from there.
            const root = guards[0];
            if(root !== undefined) {
                let possibleTypes = type.getTypes(context);
                root.evaluateTypeSet(definition, possibleTypes, possibleTypes, context);
            }
        }

        return this._unionTypes !== undefined ? this._unionTypes : type;

    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        bind; original; context;

        // Cache the type of this name at this point in execution.
        if(this.getBind(context) === bind)
            this._unionTypes = current.type();

        return current;
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    getStartExplanations() { return this.getFinishExplanations(); }

    getFinishExplanations() {
        return {
            "eng": "Find the name get evaluate to it's value."
        }
    }

    evaluate(evaluator: Evaluator): Value {

        // Search for the name in the given evaluation context.
        const value = evaluator.resolve(this.name.getText());
        // Return it or an exception if we didn't find it.
        return value === undefined ? new NameException(evaluator, this.name.getText()) : value;

    }

    clone(original?: Node, replacement?: Node) { return new Name(this.name.cloneOrReplace([ Token ], original, replacement)) as this; }
    
    getDescriptions() {
        return {
            eng: "A name"
        }
    }

}