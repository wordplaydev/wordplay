import type Conflict from "./Conflict";
import type Program from "./Program";

export default abstract class Node {

    constructor() {

    }

    /** Returns the children in the node, in order. Needed for batch operations on trees. */
    abstract getChildren() : Node[];

    /** Given the program in which the node is situated, returns any conflicts on this node that would prevent execution. */
    abstract getConflicts(program: Program) : Conflict[];
    
    toString(depth: number=0): string {
        const tabs = "\t".repeat(depth);
        return `${tabs}${this.constructor.name}\n${this.getChildren().map(n => n.toString(depth + 1)).join("\n")}`;
    }

    toWordplay() { this.getChildren().map(t => t.toWordplay()).join(""); }

    /** A depth first traversal of this node and its descendants. */
    traverse(inspector: (node: Node) => void) {
        this.getChildren().forEach(c => { c.traverse(inspector); });
        inspector.call(undefined, this);
    }

    /** Returns all this and all decedants in depth first order. */
    nodes(): Node[] {
        const nodes: Node[] = [];
        this.traverse((node) => nodes.push(node));
        return nodes;
    }

    /** Returns all the conflicts in this tree. */
    getAllConflicts(program: Program): Conflict[] {
        let conflicts: Conflict[] = [];
        this.traverse((node) => conflicts = conflicts.concat(node.getConflicts(program)));
        return conflicts;
    }

}