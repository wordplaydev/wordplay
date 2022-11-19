import Node from "./Node";
import Token from "./Token";
import { SyntacticConflict } from "../parser/Parser"
import type Conflict from "../conflicts/Conflict";
import type Evaluable from "../runtime/Evaluable";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Halt from "../runtime/Halt";
import UnknownType from "./UnknownType";
import { UnparsableConflict } from "../conflicts/UnparsableConflict";
import SemanticException from "../runtime/SemanticException";
import type Evaluator from "../runtime/Evaluator";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class Unparsable extends Node implements Evaluable {
    
    readonly reason: SyntacticConflict;
    
    /* The nodes that were parsed before failing to parse the tokens that followed. */
    readonly parsedNodes: Node[];
    
    /* The tokens that weren't parsable */
    readonly unparsableTokens: Token[];

    constructor(reason: SyntacticConflict, parsedNodes: Node[], unparsableTokens: Token[]) {
        super();

        this.reason = reason;
        this.parsedNodes = parsedNodes.slice();
        this.unparsableTokens = unparsableTokens.slice();

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "parsedNodes", types:[[ Node ]] },
            { name: "unparsableTokens", types:[[ Token ]] },
        ];
    }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new Unparsable(
            this.reason, 
            this.replaceChild(pretty, "parsedNodes", this.parsedNodes, original, replacement), 
            this.replaceChild(pretty, "unparsableTokens", this.unparsableTokens, original, replacement)
        ) as this; 
    }

    computeConflicts() {}
    getType() { return new UnknownType(this); }
    getTypeUnlessCycle() { return new UnknownType(this); }

    toString(depth: number=0) {
        const s = super.toString(depth);
        return `${s}\n${"\t".repeat(depth + 1)}${SyntacticConflict[this.reason]}`;
    }

    getConflicts(): Conflict[] {
        // All syntax errors are conflicts
        return [ new UnparsableConflict(this) ];
    }

    compile(): Step[] {
        return [ new Halt(evaluator => new SemanticException(evaluator, this), this) ];
    }

    evaluate(evaluator: Evaluator): Value {
        return new SemanticException(evaluator, this);
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getDescriptions(): Translations {
        return {
            eng: "An unparsable sequence of symbols",
            "😀": `${TRANSLATE} 🤔`
        }
    }
    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            eng: "We couldn't make sense of this, so we're stopping the program.",
            "😀": `${TRANSLATE}`
        }
    }

}


