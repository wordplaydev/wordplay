import type Definition from "./Definition";
import Borrow from "./Borrow";
import Block from "../nodes/Block";
import type Evaluator from "../runtime/Evaluator";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import Token from "./Token";
import type Context from "./Context";
import type Node from "./Node";
import Language from "./Language";
import Unit from "./Unit";
import Dimension from "./Dimension";
import type Transform from "../transforms/Transform";
import Append from "../transforms/Append";
import Remove from "../transforms/Remove";
import Replace from "../transforms/Replace";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Docs from "./Docs";
import TokenType from "./TokenType";
import { BorrowCycle } from "../conflicts/BorrowCycle";
import Expression from "./Expression";
import type Bind from "./Bind";
import type Type from "./Type";
import type { TypeSet } from "./UnionType";
import Names from "./Names";
import Name from "./Name";
import type Value from "../runtime/Value";
import type LanguageCode from "./LanguageCode";

export default class Program extends Expression {
    
    readonly docs: Docs;
    readonly borrows: Borrow[];
    readonly block: Block;
    readonly end: Token;

    constructor(docs: Docs, borrows: Borrow[], block: Block, end?: Token) {

        super();

        this.docs = docs;
        this.borrows = borrows.slice();
        this.block = block;
        this.end = end ?? new Token("", TokenType.END);
        
        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "docs", types:[ Docs ] },
            { name: "borrows", types:[[ Borrow ]] },
            { name: "block", types:[ Block ] },
            { name: "end", types:[ Token ] },
        ]; 
    }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new Program(
            this.replaceChild(pretty, "docs", this.docs, original, replacement),
            this.replaceChild(pretty, "borrows", this.borrows, original, replacement), 
            this.replaceChild(pretty, "block", this.block, original, replacement), 
            this.replaceChild(pretty, "end", this.end, original, replacement)
        ) as this; 
    }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.block; }

    computeConflicts(context: Context) {

        const [ borrow, cycle ] = context.source.getCycle(context) ?? [];
        if(borrow && cycle)
            return [ new BorrowCycle(this, borrow, cycle) ];

    }

    /** A program's type is it's block's type. */
    computeType(context: Context): Type {
        return this.block.getTypeUnlessCycle(context);
    }

    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet): TypeSet { return current; }

    hasName() { return false }
    getNames() { return []; }

    getDefinitions(_: Node, context: Context): Definition[] {

        return  [
            // Get all of the default definitions shared to this program
            ...context.shares?.getDefinitions() ?? [],
            // Get all of the definitions borrowed by the program
            ...(this.borrows.filter(borrow => borrow instanceof Borrow) as Borrow[])
                .map(borrow => borrow.name === undefined ? undefined : (context.source.getProject()?.getDefinition(context.source, borrow.name.getText()) ?? [])[0])
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
    
    getDependencies(): Expression[] {
        return [ ...this.borrows, this.block ];
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

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        if(prior) return prior;

        // Return whatever the block computed, if there is anything.
        const value = evaluator.popValue(undefined);

        // Share the value, allowing other Evalulators to borrow it.
        evaluator.share(new Names([ new Name(evaluator.source.name)]), value);

        // Return the value.
        return value;

    }

    getChildReplacement() { return undefined; }

    getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined {
    
        if(child === this.block || this.borrows.includes(child as Borrow))
            return [ new Append(context.source, position, this, this.borrows, child, new Borrow()) ];
    
    }

    getInsertionAfter(): Transform[] | undefined { return undefined; }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(this.borrows.includes(child as Borrow)) return new Remove(context.source, this, child);
        else if(child === this.block) return new Replace(context.source, this.block, new Block([], this.block instanceof Block ? this.block.root : false, this.block instanceof Block ? this.block.creator : false));
    }

    getTranslation(languages: LanguageCode[]) {
        return this.getDescriptions()[languages[0]];
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A program"
        }
    }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "Yay, we get to evaluate a program!"
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "We finished evaluating the program, here's what we got!"
        }
    }

}