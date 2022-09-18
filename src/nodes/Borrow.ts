import type Conflict from "../conflicts/Conflict";
import { UnknownBorrow } from "../conflicts/UnknownBorrow";
import Node from "./Node";
import type Context from "./Context";
import Token from "./Token";
import type Evaluable from "../runtime/Evaluable";
import type Evaluator from "../runtime/Evaluator";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Exception, { ExceptionKind } from "../runtime/Exception";
import TokenType from "./TokenType";
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

    computeChildren() { return this.version === undefined ? [ this.borrow, this.name ] : [ this.borrow, this.name, this.version ]}

    computeConflicts(context: Context): Conflict[] { 
    
        const conflicts = [];

        const type = context.program.getDefinition(this.name.getText(), context);
        if(type === undefined)
            conflicts.push(new UnknownBorrow(this));

        return conflicts; 
    
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator) {

        if(!(this.name.is(TokenType.NAME))) 
            return new Exception(this, ExceptionKind.EXPECTED_TYPE);
        if(this.version !== undefined && !(this.version.is(TokenType.NUMBER))) 
            return new Exception(this, ExceptionKind.EXPECTED_TYPE);
        return evaluator.borrow(this.getName());

    }

    getName() { return this.name.text.toString(); }

    getVersion() { return this.version === undefined ? undefined : (new Measurement(this.version, new Unit())).toNumber(); }

    clone(original?: Node, replacement?: Node) { 
        return new Borrow(
            this.borrow.cloneOrReplace([ Token ], original, replacement), 
            this.name.cloneOrReplace([ Token ], original, replacement),
            this.version?.cloneOrReplace([ Token, undefined ], original, replacement)
        ) as this; 
    }

}