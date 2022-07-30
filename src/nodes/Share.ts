import Bind from "../nodes/Bind";
import Conflict, { MisplacedShare, MissingShareLanguages } from "../parser/Conflict";
import Node, { type ConflictContext } from "./Node";
import type Token from "./Token";
import Unparsable from "./Unparsable";
import type Evaluable from "../runtime/Evaluable";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionType } from "../runtime/Exception";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Step from "../runtime/Step";

export default class Share extends Node implements Evaluable {
    
    readonly share: Token;
    readonly bind: Bind | Unparsable;

    constructor(share: Token, bind: Bind | Unparsable) {
        super();

        this.share = share;
        this.bind = bind;
    }

    getChildren() { return [ this.share, this.bind ]; }

    getConflicts(context: ConflictContext): Conflict[] {

        const conflicts = [];

        // Shares can only appear in the program's root block.
        if(!context.program.block.getChildren().includes(this))
            conflicts.push(new MisplacedShare(this));

        // Bindings must have language tags on all names to clarify what langauge they're written in.
        if(this.bind instanceof Bind && !this.bind.names.every(n => n.lang !== undefined))
            conflicts.push(new MissingShareLanguages(this));

        return conflicts;

    }

    compile(): Step[] {
        return [ new Start(this), ...this.bind.compile(), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator) {

        if(this.bind instanceof Unparsable) 
            return new Exception(ExceptionType.UNPARSABLE);
        const name = this.bind.names[0].name.text;
        const value = evaluator.resolve(name);
        if(value === undefined) 
            return new Exception(ExceptionType.UNKNOWN_SHARE);
        return evaluator.share(name, value);
        
    }
}