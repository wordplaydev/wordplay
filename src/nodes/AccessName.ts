import type Conflict from "../conflicts/Conflict";
import { UnknownProperty } from "../conflicts/UnknownProperty";
import Expression from "./Expression";
import Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import Exception from "../runtime/Exception";
import type Step from "../runtime/Step";
import Start from "../runtime/Start";
import Finish from "../runtime/Finish";
import type Context from "./Context";
import type Node from "./Node";
import StructureType from "./StructureType";
import StreamType from "./StreamType";
import Bind from "./Bind";
import UnionType, { TypeSet } from "./UnionType";
import Conditional from "./Conditional";
import Is from "./Is";
import { ACCESS_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";

export default class AccessName extends Expression {

    readonly subject: Expression | Unparsable;
    readonly access: Token;
    readonly name: Token;

    _unionType: Type | undefined;

    constructor(subject: Expression | Unparsable, access: Token | undefined, name: Token) {
        super();

        this.subject = subject;
        this.access = access ?? new Token(ACCESS_SYMBOL, [ TokenType.ACCESS ]);
        this.name = name;
    }

    computeChildren() {
        return [ this.subject, this.access, this.name ];
    }

    computeConflicts(context: Context): Conflict[] {

        const conflicts = [];

        const subjectType = this.getSubjectType(context);
        if(subjectType instanceof StructureType && subjectType.getBind(this.name.text.toString()) === undefined)
            conflicts.push(new UnknownProperty(this));

        return conflicts;
    }

    getSubjectType(context: Context): Type | undefined {

        if(this.subject instanceof Unparsable) return;
        return this.subject.getTypeUnlessCycle(context);

    }

    computeType(context: Context): Type {
        let subjectType = this.getSubjectType(context);
        if(subjectType === undefined) return new UnknownType(this);

        if(subjectType instanceof StreamType) {
            if(subjectType.type instanceof Unparsable)
                return new UnknownType(this);
            subjectType = subjectType.type;
        }

        if(subjectType instanceof StructureType) {
            const bind = subjectType.getBind(this.name.getText());
            if(bind === undefined) return new UnknownType(this);
            
            const type = bind.getTypeUnlessCycle(context);

            // Narrow the type if it's a union.

            // Is the type a union? Find the subset of types that are feasible, given any type checks in conditionals.
            if(bind instanceof Bind && type instanceof UnionType && this._unionType === undefined) {

                // Find any conditionals with type checks that refer to the value bound to this name.
                // Reverse them so they are in furthest to nearest ancestor, so we narrow types in execution order.
                const guards = this.getAncestors()?.filter(a => 
                        a instanceof Conditional &&
                        a.condition.nodes(
                            n =>    n.getParent() instanceof Is && 
                                    n instanceof AccessName && n.getSubjectType(context) instanceof StructureType && bind === (n.getSubjectType(context) as StructureType).getBind(this.name.getText())
                        )
                    ).reverse() as Conditional[];

                // Grab the furthest ancestor and evaluate possible types from there.
                const root = guards[0];
                if(root !== undefined) {
                    let possibleTypes = type.getTypes(context);
                    root.evaluateTypeSet(bind, possibleTypes, possibleTypes, context);
                }
            }
            
            return this._unionType !== undefined ? this._unionType : type;

        }
        else {
            const fun = subjectType.getFunction(context, this.name.text.toString());
            if(fun === undefined) return new UnknownType(this);
            else return fun.getTypeUnlessCycle(context);
        }
    }

    compile(context: Context):Step[] {
        
        return [ new Start(this), ...this.subject.compile(context), new Finish(this) ]

    }

    getStartExplanations() { 
        return {
            "eng": "First evaluate the structure."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "Now find the name in this structure."
        }
    }

    evaluate(evaluator: Evaluator) {

        const subject = evaluator.popValue(undefined);
        const name = this.name.text.toString();
        return subject instanceof Exception ? 
            subject :
            subject.resolve(name, evaluator);

    }

    clone(original?: Node, replacement?: Node) { 
        return new AccessName(
            this.subject.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.access.cloneOrReplace([ Token ], original, replacement), 
            this.name.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.subject instanceof Expression) {
            const possibleTypes = this.subject.evaluateTypeSet(bind, original, current, context);
            this._unionType = possibleTypes.type();
        }
        return current;
    }

}