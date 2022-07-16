import Conflict, { UnknownBorrow } from "../parser/Conflict";
import Node from "./Node";
import type Program from "./Program";
import type Token from "./Token";
import type { Evaluable } from "../runtime/Evaluation";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionType } from "../runtime/Exception";
import type Value from "../runtime/Value";

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

    getConflicts(program: Program): Conflict[] { 
    
        const conflicts = [];

        const type = program.getDefinition(program, this, this.name.text);
        if(type === undefined)
            conflicts.push(new UnknownBorrow(this));

        return conflicts; 
    
    }

    evaluate(evaluator: Evaluator): Node | Value {
        return new Exception(ExceptionType.NOT_IMPLEMENTED);
    }

}