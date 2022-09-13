import Node, { type ConflictContext } from "./Node";
import type Definition from "./Definition";
import type Borrow from "./Borrow";
import type Unparsable from "./Unparsable";
import type Conflict from "../conflicts/Conflict";
import type Block from "../nodes/Block";
import type Evaluator from "../runtime/Evaluator";
import type Evaluable from "../runtime/Evaluable";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Action from "../runtime/Start";
import StructureDefinitionValue from "../runtime/StructureDefinitionValue";
import Stream from "../runtime/Stream";
import type Token from "./Token";

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
    getConflicts(conflict: ConflictContext): Conflict[] { return []; }

    getDefinition(context: ConflictContext, node: Node, name: string): Definition {

        if(context.shares !== undefined) {
            const share = context.shares.resolve(name);
            if(share instanceof StructureDefinitionValue)
                return share.definition;
            else if(share instanceof Stream)
                return share;
        }
        return undefined;
    }
    
    getBindingEnclosureOf(node: Node): Node | undefined {
        const ancestors = this.getAncestorsOf(node);
        
        // Keep searching for an ancestor that's a binding 
        // If the parent is not a binding enclosure of the specific child, then skip the parent.
        if(ancestors && ancestors.length > 0) {
            let child = node;
            let parent = ancestors.shift();
            do {
                if(parent !== undefined) {
                    // Is this parent a binding enclosure if it's child? Return it!
                    if(parent.isBindingEnclosureOfChild(child))
                        return parent;
                    // If not, the child becomes the parent and we get the parent's parent.
                    child = parent;
                    parent = ancestors.shift();
                }
            } while(parent !== undefined && ancestors.length > 0);
        }

    }

    compile(context: ConflictContext):Step[] {
        // Execute the borrows, then the block, then this.
        return [ 
            new Action(this),
            ...this.borrows.reduce((steps: Step[], borrow) => [...steps, ...borrow.compile(context)], []),
            ...this.block.compile(context),
            new Finish(this)            
        ];
    }

    evaluate(evaluator: Evaluator) {

        // Return whatever the block computed.
        return evaluator.popValue();

    }

}