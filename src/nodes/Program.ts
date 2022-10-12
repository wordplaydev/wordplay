import type Definition from "./Definition";
import Borrow from "./Borrow";
import Unparsable from "./Unparsable";
import Block from "../nodes/Block";
import type Evaluator from "../runtime/Evaluator";
import type Evaluable from "../runtime/Evaluable";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import Token from "./Token";
import type Context from "./Context";
import Node from "./Node";

export default class Program extends Node implements Evaluable {
    
    readonly borrows: (Borrow | Unparsable)[];
    readonly block: Block | Unparsable;
    readonly end: Token | Unparsable;

    constructor(borrows: (Borrow|Unparsable)[], block: Block | Unparsable, end: Token | Unparsable) {

        super();

        this.borrows = borrows.slice();
        this.block = block;
        this.end = end;

        // Assign all the parents in tree.
        this._parent = null;
        this.cacheParents();

    }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.block; }

    computeChildren() { return [ ...this.borrows, this.block, this.end ]; }
    computeConflicts() {}

    getDefinitions(node: Node, context: Context): Definition[] {

        node;
        return  [
            ...context.shares?.getDefinitions() ?? [],
            ...(this.borrows.filter(borrow => borrow instanceof Borrow) as Borrow[])
            .map(borrow => context.source.getProject()?.getDefinition(context.source, borrow.name.getText()))
            .filter(d => d !== undefined) as Definition[],
        ]  

    }
    
    compile(context: Context): Step[] {
        // Execute the borrows, then the block, then this.
        return [ 
            new Start(this),
            ...this.borrows.reduce((steps: Step[], borrow) => [...steps, ...borrow.compile()], []),
            ...this.block.compile(context),
            new Finish(this)
        ];
    }

    getStartExplanations() { 
        return {
            "eng": "Yay, we get to evaluate a program!"
        }
     }

    getFinishExplanations() {
        return {
            "eng": "We finished evaluating the program, here's what we got!"
        }
    }

    evaluate(evaluator: Evaluator) {

        // Return whatever the block computed, if there is anything.
        return evaluator.popValue(undefined);

    }

    clone(original?: Node, replacement?: Node) { 
        return new Program(
            this.borrows.map(b => b.cloneOrReplace([ Borrow, Unparsable ], original, replacement)), 
            this.block.cloneOrReplace([ Block, Unparsable ], original, replacement), 
            this.end.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "A program"
        }
    }

}