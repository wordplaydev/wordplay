import Expression from './Expression';
import type Node from './Node';

export type Path = [string, number][];

/**
 * Represents a node and everything in it, providing accessors for parents, accessors, children, and more.
 * Overcomes the lack of parent structure in Nodes due to their immutability.
 */
export default class Root {
    readonly root: Node;

    /** A mapping from child to parent */
    readonly parents: Map<Node, Node>;

    constructor(node: Node) {
        this.root = node;

        this.parents = new Map();
        Root.walk(this.parents, node);
    }

    static walk(parents: Map<Node, Node>, n: Node) {
        for (const child of n.getChildren()) {
            parents.set(child, n);
            Root.walk(parents, child);
        }
    }

    /** Returns true if this root contains the given node. */
    has(node: Node) {
        return node === this.root || this.parents.has(node);
    }

    /** Returns the parent of the given node, or undefined if it has none. */
    getParent(node: Node) {
        return this.parents.get(node);
    }

    /** Get the ancestors of the given node, from parent to root. */
    getAncestors(node: Node): Node[] {
        const ancestors: Node[] = [];
        let current: Node | undefined = node;
        do {
            let parent = this.getParent(current);
            if (parent) {
                ancestors.push(parent);
                current = parent;
            } else current = undefined;
        } while (current);
        return ancestors;
    }

    getSelfAndAncestors(node: Node): Node[] {
        return [node, ...this.getAncestors(node)];
    }

    inList(node: Node) {
        return this.getContainingParentList(node) !== undefined;
    }

    /** Returns the nearest evaluation root, which is the closest ancestor for which isEvaluating() is true. */
    getEvaluationRoot(node: Node) {
        return this.getAncestors(node).find(
            (ancestor) =>
                ancestor instanceof Expression && ancestor.isEvaluationRoot()
        ) as Expression | undefined;
    }

    getContainingParentList(node: Node, before?: boolean): string | undefined {
        const parent = this.getParent(node);
        if (parent === undefined) return;
        // Loop through each of the fields and see if it contains this node or is delimited by this node.
        // If we find a match, return the field name.
        let previousField = undefined;
        let previousWasList = false;
        for (const name of parent.getChildNames()) {
            const field = (parent as any)[name] as Node | Node[];
            // If this field is an array and the field includes this node, we found it!
            if (Array.isArray(field) && field.includes(node)) return name;
            // If this field is this node and the next field is an array, we found it!
            if (before === true && field === node && previousWasList)
                return previousField;

            // Remember the last
            previousField = name;
            previousWasList = Array.isArray(field);
        }
    }

    /** Get the highest ancestor of this node's first token. */
    getSpaceRoot(node: Node) {
        // Find the first leaf of this node.
        let token = node.getFirstLeaf();

        // If there isn't one, this has no space root.
        if (token === undefined) return undefined;

        // Start by assuming the space root is the token itself.
        let root: Node = token;
        // Iterate up the ancestor ladder while the ancestor's first leaf is still the token.
        // Stop when it is not.
        for (const ancestor of this.getAncestors(token)) {
            // If the first leaf of this ancestor is the token, then it's a possible root.
            if (ancestor.getFirstLeaf() === token) root = ancestor;
            // Otherwise, stop.
            else break;
        }
        return root;
    }

    getDepth(node: Node) {
        let child = node;
        let parent: Node | undefined = this.getParent(node);
        let depth = 0;
        while (parent) {
            depth += parent.isBlockFor(child) ? 1 : 0;
            child = parent;
            parent = this.getParent(parent);
        }
        return depth;
    }

    /**
     * Recursively constructs a path to this node from it's parents. A path is just a sequence of node constructor and child index pairs.
     * The node constructor name is for printing and error checking and the number is just the index of the child from getChildren().
     * This is useful for finding corresponding nodes during tree manipulation, where a lot of cloning and reformatting happens.
     */
    getPath(node: Node): Path {
        let parent = this.getParent(node);
        if (parent)
            return [
                ...this.getPath(parent),
                [parent.constructor.name, parent.getChildren().indexOf(node)],
            ];
        else return [];
    }

    /**
     * Attempts to recursively resolve a path by traversing children.
     */
    resolvePath(node: Node, path: Path): Node | undefined {
        if (path.length === 0) return node;

        const [type, index] = path[0];

        // If the type of node doesn't match, this path doesn't resolve.
        return node.constructor.name !== type
            ? undefined
            : // Otherwise, ask the corresponding child to continue resolving the path, unless there isn't one,
              // in which case the path doesn't resolve.
              this.resolvePath(node.getChildren()[index], path.slice(1));
    }

    // resolvePath(path: Path): Node | undefined {
    //     if (path.length === 0) return this.node;

    //     const [type, index] = path[0];

    //     // If the type of node doesn't match, this path doesn't resolve.
    //     return this.node.constructor.name !== type
    //         ? undefined
    //         : // Otherwise, ask the corresponding child to continue resolving the path, unless there isn't one,
    //           // in which case the path doesn't resolve.
    //           this.getChildren()[index]?.resolvePath(path.slice(1));
    // }
}
