import type Conflict from "../conflicts/Conflict";
import type Shares from "../runtime/Shares";
import type Program from "./Program";
import type Definition from "./Definition";
import type NativeInterface from "../native/NativeInterface";

export type ConflictContext = { 
    program: Program,
    shares?: Shares,
    native?: NativeInterface,
    stack: Node[]
}

/* A global ID for nodes, for helping index them */
let NODE_ID_COUNTER = 0;

export default abstract class Node {

    /* A unique ID to represent this node in memory. */
    readonly id: number;

    /* A cache of the children of this node, in parse order. */
    children: undefined | Node[] = undefined;

    /* A cache of this node's parent. Undefined means no cache, null means no parent. */
    parent: undefined | null | Node;

    constructor() {
        this.id = NODE_ID_COUNTER++;        
    }

    /* A recursive function that computes parents. Called by the root. Assumes the tree is immutable. */
    cacheParents() {

        const children = this.getChildren();
        for(let i = 0; i < children.length; i++) {
            const child = children[i];
            child.parent = this;
            child.cacheParents();
        }

    }

    /** Returns the children in the node, in order. Needed for batch operations on trees. Cache children to avoid recomputation. */
    getChildren(): Node[] {
        if(this.children === undefined)
            this.children = this.computeChildren();
        return this.children;
    }

    /** Construct a list of nodes in the sequence they are parsed, used for traversal. */
    abstract computeChildren(): Node[];

    /** Given the program in which the node is situated, returns any conflicts on this node that would prevent execution. */
    abstract getConflicts(context: ConflictContext) : Conflict[];
    
    /** True if the given node is a child of this node and this node should act as a binding enclosure of it. */
    isBindingEnclosureOfChild(child: Node): boolean { return false; }

    /** Given a program, a node that triggered a search, and a name, get the thing that defined the name. */
    getDefinition(context: ConflictContext, node: Node, name: string): Definition { return undefined; }
    
    /** True if the node contains bindings that should be searched. */
    isBindingEnclosure() { return false; }

    toString(depth: number=0): string {
        const tabs = "\t".repeat(depth);
        return `${tabs}${this.constructor.name}\n${this.getChildren().map(n => n.toString(depth + 1)).join("\n")}`;
    }

    toWordplay(): string { return this.getChildren().map(t => t.toWordplay()).join(""); }

    /** A depth first traversal of this node and its descendants. Keeps traversing until the inspector returns false. */
    traverse(inspector: (node: Node) => boolean): boolean {
        const every = this.getChildren().every(c => c.traverse(inspector));
        if(every)
            inspector.call(undefined, this);
        return every;
    }

    /** Returns all this and all decedants in depth first order. Optionally uses the given function to decide whether to include a node. */
    nodes(include?: (node: Node) => boolean): Node[] {
        const nodes: Node[] = [];
        this.traverse(node => { 
            if(include === undefined || include.call(undefined, node) === true)
                nodes.push(node); 
            return true; 
        });
        return nodes;
    }

    /** Finds the descendant of this node (or this node) that has the given ID. */
    getNodeByID(id: number): Node | undefined {

        if(this.id === id) return this;
        const children = this.getChildren();
        for(let i = 0; i < children.length; i++) {
            const match = children[i].getNodeByID(id);
            if(match) return match;
        }
        return undefined;

    }

    /** Returns all the conflicts in this tree. */
    getAllConflicts(program: Program, shares: Shares, native: NativeInterface): Conflict[] {
        let conflicts: Conflict[] = [];
        this.traverse(node => {
            conflicts = conflicts.concat(node.getConflicts({ program: program, shares: shares, native: native, stack: [] }));
            return true;
        });
        return conflicts;
    }

    /** Returns a list of ancestors, with the parent as the first item in the list and the root as the last. */
    getAncestorsOf(node: Node): Node[] | undefined {

        const ancestors = [];
        let parent = node.parent;
        while(parent) {
            ancestors.push(parent);
            parent = parent.parent;
        }
        return ancestors;

    }

    /** Finds the nearest ancestor of the given type. */
    getNearestAncestor<T extends Node>(node: Node, type: Function): T | undefined {
        return this.getAncestorsOf(node)?.find(n => n instanceof type) as T ?? undefined;
    }

    /** Returns the cached parent of the given node. Assumes the root of this node has called cacheParents(). */
    getParent(): Node | null | undefined {
        return this.parent;
    }

    /** True if the given nodes appears in this tree. */
    contains(node: Node) {

        // Strategy: scan the given node's ancestors to see if this is one.
        let parent: undefined | null | Node = node;
        while(parent !== null && parent !== undefined) {
            if(parent === this) return true;
            parent = parent.parent;
        }
        return false;

    }

}