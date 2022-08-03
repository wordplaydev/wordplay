import Conflict, { UnknownProperty } from "../parser/Conflict";
import StructureDefinition from "./StructureDefinition";
import Expression from "./Expression";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionType } from "../runtime/Exception";
import type Step from "../runtime/Step";
import Start from "../runtime/Start";
import Finish from "../runtime/Finish";
import Structure from "../runtime/Structure";
import Stream from "../runtime/Stream";
import type { ConflictContext } from "./Node";

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

    getChildren() {
        return [ this.subject, this.access, this.name ];
    }

    getConflicts(context: ConflictContext): Conflict[] {

        const conflicts = [];

        const subjectType = this.getSubjectType(context);
        if(subjectType === undefined || subjectType.getBind(this.name.text) === undefined)
            conflicts.push(new UnknownProperty(this));

        return conflicts;
    }

    getSubjectType(context: ConflictContext): StructureDefinition | undefined {

        if(this.subject instanceof Unparsable) return;
        const subjectType = this.subject.getType(context);
        if(subjectType instanceof StructureDefinition) return subjectType;

    }

    getType(context: ConflictContext): Type {
        const subjectType = this.getSubjectType(context);
        if(subjectType === undefined) return new UnknownType(this);
        const bind = subjectType.getBind(this.name.text);
        if(bind === undefined) return new UnknownType(this);
        else return bind.getType(context);
    }

    compile(): Step[] {
        
        return [ new Start(this), ...this.subject.compile(), new Finish(this) ]

    }

    evaluate(evaluator: Evaluator) {

        const subject = evaluator.popValue();
        return subject instanceof Exception ? subject :
            subject instanceof Structure ? subject.resolve(this.name.text) :
            subject instanceof Stream ? subject.resolve(this.name.text) :
            new Exception(this, ExceptionType.EXPECTED_STRUCTURE);

    }

}