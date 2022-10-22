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
import Start from "../runtime/Start";
import type Step from "../runtime/Step";
import SemanticException from "../runtime/SemanticException";
import NameException from "../runtime/NameException";
import Block from "./Block";
import { DuplicateShare } from "../conflicts/DuplicateShare";

export default class Share extends Node implements Evaluable {
    
    readonly share: Token;
    readonly bind: Bind | Unparsable;

    constructor(share: Token, bind: Bind | Unparsable) {
        super();

        this.share = share;
        this.bind = bind;
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new Share(
            this.cloneOrReplaceChild(pretty, [ Token ], "share", this.share, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Bind, Unparsable ], "bind", this.bind, original, replacement)
        ) as this; 
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

        // Other shares in this project can't have the same name
        const sources = context.source.getProject()?.getSourcesExcept(context.source);
        if(sources !== undefined && this.bind instanceof Bind) {
            for(const source of sources) {
                if(source.program.block instanceof Block) {
                    for(const share of source.program.block.statements.filter(s => s instanceof Share) as Share[]) {
                        if(share.bind instanceof Bind && this.bind.sharesName(share.bind))
                            conflicts.push(new DuplicateShare(this, share));
                    }
                }
            }
        }

        return conflicts;

    }

    compile(context: Context):Step[] {
        return [ new Start(this), ...this.bind.compile(context), new Finish(this) ];
    }

    getStartExplanations() { 
        return {
            "eng": "Let's evaluate first, then share."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "Now that we have the value, let's share it!"
        }
    }

    evaluate(evaluator: Evaluator) {

        if(this.bind instanceof Unparsable) 
            return new SemanticException(evaluator, this.bind);
            
        const name = this.bind.names[0].getName();
        const value = name === undefined ? undefined : evaluator.resolve(name);
        if(value === undefined || name == undefined) 
            return new NameException(evaluator, this.bind.names[0].getName() ?? "");
        else
            return evaluator.share(name, value);
        
    }

    getDescriptions() {
        return {
            eng: "Share a named value"
        }
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

}