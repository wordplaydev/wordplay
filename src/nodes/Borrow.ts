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

        const type = context.program.getDefinitionOfName(this.name.getText(), context, this);
        if(type === undefined)
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
        evaluator.borrow(this.getName());
        return undefined;
    }    

    getName() { return this.name.getText(); }

    getVersion() { return this.version === undefined ? undefined : (new Measurement(this.version, new Unit())).toNumber(); }

    clone(original?: Node, replacement?: Node) { 
        return new Borrow(
            this.borrow.cloneOrReplace([ Token ], original, replacement), 
            this.name.cloneOrReplace([ Token ], original, replacement),
            this.version?.cloneOrReplace([ Token, undefined ], original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: `Borrow a value`
        }
    }

    getChildReplacements(child: Node, context: Context): Node[] {
        
        if(child === this.name)
            // Return name tokens of all shares
            return context.shares?.getDefinitions().map(def => {
                const names = def.getNames();
                return new Token(Array.isArray(names) ? names[0] : names.eng, [ TokenType.NAME ])
            }) ?? [];

        return [];

    }

}