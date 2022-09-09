import type Conflict from "../conflicts/Conflict";
import { UnknownProperty } from "../conflicts/UnknownProperty";
import Expression from "./Expression";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import Exception from "../runtime/Exception";
import type Step from "../runtime/Step";
import Action from "../runtime/Start";
import Finish from "../runtime/Finish";
import type { ConflictContext } from "./Node";
import StructureType from "./StructureType";
import StreamType from "./StreamType";

export default class AccessName extends Expression {

    readonly subject: Expression | Unparsable;
    readonly access: Token;
    readonly name: Token;

    constructor(subject: Expression | Unparsable, access: Token, name: Token) {
        super();

        this.subject = subject;
        this.access = access;
        this.name = name;
    }

    computeChildren() {
        return [ this.subject, this.access, this.name ];
    }

    computeConflicts(context: ConflictContext): Conflict[] {

        const conflicts = [];

        const subjectType = this.getSubjectType(context);
        if(subjectType instanceof StructureType && subjectType.getBind(this.name.text.toString()) === undefined)
            conflicts.push(new UnknownProperty(this));

        return conflicts;
    }

    getSubjectType(context: ConflictContext): Type | undefined {

        if(this.subject instanceof Unparsable) return;
        return this.subject.getTypeUnlessCycle(context);

    }

    computeType(context: ConflictContext): Type {
        let subjectType = this.getSubjectType(context);
        if(subjectType === undefined) return new UnknownType(this);

        if(subjectType instanceof StreamType) {
            if(subjectType.type instanceof Unparsable)
                return new UnknownType(this);
            subjectType = subjectType.type;
        }

        if(subjectType instanceof StructureType) {
            const bind = subjectType.getBind(this.name.text.toString());
            if(bind === undefined) return new UnknownType(this);
            else return bind.getTypeUnlessCycle(context);
        }
        else {
            const fun = subjectType.getFunction(context, this.name.text.toString());
            if(fun === undefined) return new UnknownType(this);
            else return fun.getTypeUnlessCycle(context);
        }
    }

    compile(context: ConflictContext):Step[] {
        
        return [ new Action(this), ...this.subject.compile(context), new Finish(this) ]

    }

    evaluate(evaluator: Evaluator) {

        const subject = evaluator.popValue();
        const name = this.name.text.toString();
        return subject instanceof Exception ? 
            subject :
            subject.resolve(name, evaluator);

    }

}