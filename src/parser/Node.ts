import type Bind from "./Bind";
import type Conflict from "./Conflict";
import type Expression from "./Expression";
import type Program from "./Program";
import type TypeVariable from "./TypeVariable";

export default abstract class Node {

    constructor() {}

    /** Returns the children in the node, in order. Needed for batch operations on trees. */
    abstract getChildren() : Node[];

    /** Given the program in which the node is situated, returns any conflicts on this node that would prevent execution. */
    abstract getConflicts(program: Program) : Conflict[];
    
    /** True if the given node is a child of this node and this node should act as a binding enclosure of it. */
    isBindingEnclosureOfChild(child: Node): boolean { return false; }

    /** Given a program, a node that triggered a search, and a name, get the thing that defined the name. */
    getDefinition(program: Program, node: Node, name: string): Bind | TypeVariable | Expression | undefined { return undefined; }
    
    /** True if the node contains bindings that should be searched. */
    isBindingEnclosure() { return false; }

    toString(depth: number=0): string {
        const tabs = "\t".repeat(depth);
        return `${tabs}${this.constructor.name}\n${this.getChildren().map(n => n.toString(depth + 1)).join("\n")}`;
    }

    toWordplay() { this.getChildren().map(t => t.toWordplay()).join(""); }

    /** A depth first traversal of this node and its descendants. */
    traverse(ancestors: Node[], inspector: (ancestors: Node[], node: Node) => void) {
        const thisAncestors = [ this, ...ancestors ];
        this.getChildren().some(c => { c.traverse(thisAncestors, inspector); });
        inspector.call(undefined, ancestors, this);
    }

    /** Returns all this and all decedants in depth first order. */
    nodes(): Node[] {
        const nodes: Node[] = [];
        this.traverse([], (ancestors, node) => nodes.push(node));
        return nodes;
    }

    /** Returns all the conflicts in this tree. */
    getAllConflicts(program: Program): Conflict[] {
        let conflicts: Conflict[] = [];
        this.traverse([], (ancestors, node) => conflicts = conflicts.concat(node.getConflicts(program)));
        return conflicts;
    }

    getAncestorsOf(node: Node): Node[] | undefined {
        let ancestors = undefined;
        this.traverse([], (a, n) => { if(node === n) ancestors = a; });
        return ancestors;
    }

    /** Finds the nearest ancestor of the given type. */
    getNearestAncestor<T extends Node>(node: Node, type: Function): T | undefined {

        const match = this.getAncestorsOf(node)?.find(n => n instanceof type);
        return match === undefined ? undefined : match as T;

    }

    /** Finds the parent of the given node. */
    getParent(program: Program): Node | undefined {
        const ancestors = program.getAncestorsOf(this);
        return ancestors === undefined || ancestors.length === 0 ? undefined : ancestors.shift();
    }

    /** True if the given nodes appears in this tree */
    contains(node: Node) {
        return this.nodes().indexOf(node) >= 0;
    }

}