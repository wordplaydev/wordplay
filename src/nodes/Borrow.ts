import type Conflict from "../conflicts/Conflict";
import { UnknownBorrow } from "../conflicts/UnknownBorrow";
import Node from "./Node";
import type Context from "./Context";
import Token from "./Token";
import type Evaluable from "../runtime/Evaluable";
import type Evaluator from "../runtime/Evaluator";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Measurement from "../runtime/Measurement";
import Unit from "./Unit";
import TokenType from "./TokenType";
import Reference from "./Reference";
import { BORROW_SYMBOL } from "../parser/Tokenizer";
import type Transform from "./Transform";

export default class Borrow extends Node implements Evaluable {
    
    readonly borrow: Token;
    readonly name?: Token;
    readonly version?: Token;

    constructor(borrow?: Token, name?: Token, version?: Token) {
        super();

        this.borrow = borrow ?? new Token(BORROW_SYMBOL, [ TokenType.BORROW ]);
        this.name = name;
        this.version = version;
    }

    computeChildren() { 
        return [ this.borrow, this.name, this.version ].filter(n => n !== undefined) as Node[];
    }

    computeConflicts(context: Context): Conflict[] { 
    
        const conflicts = [];

        const type = this.name === undefined ? undefined : context.program.getDefinitionOfName(this.name.getText(), context, this);
        if(this.name === undefined || type === undefined)
            conflicts.push(new UnknownBorrow(this));

        return conflicts; 
    
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    getStartExplanations() { return this.getFinishExplanations(); }

    getFinishExplanations() {
        return {
            "eng": "Find the shared name in other programs to borrow."
        }
    }

    evaluate(evaluator: Evaluator) {
        const name = this.getName();
        if(name !== undefined)
            evaluator.borrow(name);
        return undefined;
    }    

    getName() { return this.name === undefined ? undefined : this.name.getText(); }

    getVersion() { return this.version === undefined ? undefined : (new Measurement(this.version, new Unit())).toNumber(); }

    clone(original?: Node, replacement?: Node) { 
        return new Borrow(
            this.borrow.cloneOrReplace([ Token ], original, replacement), 
            this.name?.cloneOrReplace([ Token ], original, replacement),
            this.version?.cloneOrReplace([ Token, undefined ], original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: `Borrow a value`
        }
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined { 
        
        if(child === this.name)
            // Return name tokens of all shares
            return context.shares
                ?.getDefinitions()
                .map(def => new Reference<Token>(def, name => new Token(name, [ TokenType.NAME ]))) ?? [];
    
    }

    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(): Transform[] | undefined { return undefined; }

}