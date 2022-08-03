import Conflict, { UnknownBorrow } from "../parser/Conflict";
import Node, { type ConflictContext } from "./Node";
import type Token from "./Token";
import type Evaluable from "../runtime/Evaluable";
import type Evaluator from "../runtime/Evaluator";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Exception, { ExceptionType } from "../runtime/Exception";
import { TokenType } from "./Token";
import Measurement from "../runtime/Measurement";
import Unit from "./Unit";

export default class Borrow extends Node implements Evaluable {
    
    readonly borrow: Token;
    readonly name: Token;
    readonly version?: Token;

    constructor(borrow: Token, name: Token, version?: Token) {
        super();

        this.borrow = borrow;
        this.name = name;
        this.version = version;
    }

    getChildren() { return this.version === undefined ? [ this.borrow, this.name ] : [ this.borrow, this.name, this.version ]}

    getConflicts(context: ConflictContext): Conflict[] { 
    
        const conflicts = [];

        const type = context.program.getDefinition(context, this, this.name.text);
        if(type === undefined)
            conflicts.push(new UnknownBorrow(this));

        return conflicts; 
    
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator) {

        if(!(this.name.is(TokenType.NAME))) 
            return new Exception(this, ExceptionType.EXPECTED_TYPE);
        if(this.version !== undefined && !(this.version.is(TokenType.NUMBER))) 
            return new Exception(this, ExceptionType.EXPECTED_TYPE);
        return evaluator.borrow(this.getName(), this.getVersion());

    }

    getName() { return this.name.text; }

    getVersion() { return this.version === undefined ? undefined : (new Measurement(this.version, new Unit())).toNumber(); }

}