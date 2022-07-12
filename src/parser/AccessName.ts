import Conflict from "./Conflict";
import CustomType from "./CustomType";
import Expression from "./Expression";
import type Program from "./Program";
import { SemanticConflict } from "./SemanticConflict";
import type { Token } from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";

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

    getConflicts(program: Program): Conflict[] {

        const conflicts = [];

        const subjectType = this.getSubjectType(program);
        if(subjectType === undefined || subjectType.getBind(this.name.text) === undefined)
            conflicts.push(new Conflict(this, SemanticConflict.UNKNOWN_NAME_ON_TYPE))

        return conflicts;
    }

    getSubjectType(program: Program): CustomType | undefined {

        if(this.subject instanceof Unparsable) return;
        const subjectType = this.subject.getType(program);
        if(subjectType instanceof CustomType) return subjectType;

    }

    getType(program: Program): Type {
        const subjectType = this.getSubjectType(program);
        if(subjectType === undefined) return new UnknownType(this);
        const bind = subjectType.getBind(this.name.text);
        if(bind === undefined) return new UnknownType(this);
        else return bind.getType(program);
    }

}