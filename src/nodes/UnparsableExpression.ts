import type Conflict from "../conflicts/Conflict";
import { UnparsableConflict } from "../conflicts/UnparsableConflict";
import type Evaluator from "../runtime/Evaluator";
import Halt from "../runtime/Halt";
import SemanticException from "../runtime/SemanticException";
import type Step from "../runtime/Step";
import type Transform from "../transforms/Transform";
import type Bind from "./Bind";
import Expression from "./Expression";
import Node from "./Node";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations";
import type { TypeSet } from "./UnionType";
import UnknownType from "./UnknownType";

export default class UnparsableExpression extends Expression {

    readonly unparsables: Node[];

    constructor(nodes: Node[]) {
        super();

        this.unparsables = nodes;
    }

    getGrammar() {
        return [
            { name: "unparsables", types: [[ Node ]] }
        ];
    }

    computeConflicts(): void | Conflict[] {
        return [ new UnparsableConflict(this) ];
    }

    replace(pretty: boolean, original?: Node, replacement?: Node): this {
        return new UnparsableExpression(
            this.replaceChild(pretty, "unparsables", this.unparsables, original, replacement),
        ) as this; 
    }

    computeType() { return new UnknownType(this); }

    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet) { return current; }

    compile(): Step[] {
        return [ new Halt(evaluator => new SemanticException(evaluator, this), this) ];
    }

    evaluate(evaluator: Evaluator) {
        return new SemanticException(evaluator, this);
    }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            eng: "We couldn't make sense of this, so we're stopping the program.",
            "😀": `${TRANSLATE}`
        }
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Unparsable expression"
        }
    }

    getChildReplacement(): Transform[] | undefined { return undefined; }
    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(): Transform[] | undefined { return undefined; }
    getChildRemoval(): Transform | undefined { return undefined; }

}