import Bind from "../nodes/Bind";
import type Conflict from "../conflicts/Conflict";
import { MissingShareLanguages } from "../conflicts/MissingShareLanguages";
import { MisplacedShare } from "../conflicts/MisplacedShare";
import Node from "./Node";
import type Context from "./Context";
import Token from "./Token";
import Unparsable from "./Unparsable";
import type Evaluable from "../runtime/Evaluable";
import type Evaluator from "../runtime/Evaluator";
import Finish from "../runtime/Finish";
import Action from "../runtime/Start";
import type Step from "../runtime/Step";
import UnparsableException from "../runtime/SemanticException";
import NameException from "../runtime/NameException";

export default class Share extends Node implements Evaluable {
    
    readonly share: Token;
    readonly bind: Bind | Unparsable;

    constructor(share: Token, bind: Bind | Unparsable) {
        super();

        this.share = share;
        this.bind = bind;
    }

    computeChildren() { return [ this.share, this.bind ]; }

    computeConflicts(context: Context): Conflict[] {

        const conflicts = [];

        // Shares can only appear in the program's root block.
        if(!context.program.block.getChildren().includes(this))
            conflicts.push(new MisplacedShare(this));

        // Bindings must have language tags on all names to clarify what langauge they're written in.
        if(this.bind instanceof Bind && !this.bind.names.every(n => n.lang !== undefined))
            conflicts.push(new MissingShareLanguages(this));

        return conflicts;

    }

    compile(context: Context):Step[] {
        return [ new Action(this), ...this.bind.compile(context), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator) {

        if(this.bind instanceof Unparsable) 
            return new UnparsableException(evaluator, this.bind);
        const name = this.bind.names[0].getName();
        const value = name === undefined ? undefined : evaluator.resolve(name);
        if(value === undefined || name == undefined) 
            return new NameException(evaluator, this.bind.names[0].getName() ?? "");
        else
            return evaluator.share(name, value);
        
    }

    clone(original?: Node, replacement?: Node) { 
        return new Share(
            this.share.cloneOrReplace([ Token ], original, replacement), 
            this.bind.cloneOrReplace([ Bind, Unparsable ], original, replacement)
        ) as this; 
    }

}