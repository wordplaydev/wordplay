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
import Language from "./Language";
import Unit from "./Unit";
import Dimension from "./Dimension";
import type Transform from "../transforms/Transform";
import Append from "../transforms/Append";
import Remove from "../transforms/Remove";
import Replace from "../transforms/Replace";
import type Translations from "./Translations";

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
            .map(borrow => borrow.name === undefined ? undefined : context.source.getProject()?.getDefinition(context.source, borrow.name.getText()))
            .filter(d => d !== undefined) as Definition[],
        ]  

    }

    getLanguagesUsed(): string[] {
        return Array.from(new Set((this.nodes(n => n instanceof Language && n.getLanguage() !== undefined) as Language[]).map(n => n.getLanguage() as string)))
    }

    getUnitsUsed(): Unit[] {
        return this.nodes(n => n instanceof Unit) as Unit[];
    }
    getDimensionsUsed(): Dimension[] {
        return this.nodes(n => n instanceof Dimension) as Dimension[];
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

    evaluate(evaluator: Evaluator) {

        // Return whatever the block computed, if there is anything.
        return evaluator.popValue(undefined);

    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new Program(
            this.cloneOrReplaceChild(pretty, [ Borrow, Unparsable ], "borrows", this.borrows, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Block, Unparsable ], "block", this.block, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token ], "end", this.end, original, replacement)
        ) as this; 
    }

    getChildReplacement() { return undefined; }

    getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined {
    
        if(child === this.block || this.borrows.includes(child as Borrow))
            return [ new Append(context.source, position, this, this.borrows, child, new Borrow()) ];
    
    }

    getInsertionAfter(): Transform[] | undefined { return undefined; }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(this.borrows.includes(child as Borrow)) return new Remove(context.source, this, child);
        else if(child === this.block) return new Replace(context.source, this.block, new Block([], [], this.block instanceof Block ? this.block.root : false, this.block instanceof Block ? this.block.creator : false));
    }

    getDescriptions(): Translations {
        return {
            "😀": "TODO",
            eng: "A program"
        }
    }

    getStartExplanations(): Translations { 
        return {
            "😀": "TODO",
            eng: "Yay, we get to evaluate a program!"
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": "TODO",
            eng: "We finished evaluating the program, here's what we got!"
        }
    }

}