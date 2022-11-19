import type Node from "./Node";

export type Path = [ string, number ][];

/** 
 * Represents a Node, but with parent *and* child links, allowing for more flexible
 * analysis and editing. This second view of Nodes is necessary in order to enable
 * Nodes to be immutable, since Nodes need both child and parent links to be complete,
 * but one must come before the other. Nodes are built bottom up, Trees are built top down.
 * Trees are more ephemeral than nodes, lazily computing tree structure on demand,
 * for the purpose of analysis and editing. Trees are also immutable.
 */
export default class Tree {

    readonly parent: Tree | undefined;
    readonly node: Node;

    _children: Tree[] | undefined = undefined;

    public constructor (node: Node, parent?: Tree) {

        this.parent = parent;
        this.node = node;

    }

    getParent(): Node | undefined { return this.parent?.node; }

    /** Returns the root of this node. */
    getRoot(): Node {
        return this.parent ? this.parent.getRoot() : this.node;
    }

    isRoot() { return this.parent === undefined; }
    
    /** Get the binding enclosure of this tree's node by recursively asking ancestors if they are binding enclosures of the given node. */
    getBindingScope(): Node | undefined {
        return this.parent instanceof Tree ?
            (this.parent.node.isBindingEnclosureOfChild(this.node) ? this.parent.node : this.parent.getBindingScope()) :
            undefined;
    }

    /** Get the tree representing the given node. Depth-first search for the node. */
    get(node: Node): Tree | undefined {
        if(this.node === node) return this;
        for(const child of this.getChildren()) {
            const match = child.get(node);
            if(match !== undefined) return match;
        }
        return undefined;
    }

    getChildren(): Tree[] {
        if(this._children === undefined)
            this._children = this.node.getChildren().map(child => new Tree(child, this));
        return this._children;
    }

    /** Returns a list of ancestors, with the parent as the first item in the list and the root as the last. */
    getAncestors(): Node[] {
        const ancestors = [];
        let parent = this.parent;
        while(parent) {
            ancestors.push(parent.node);
            parent = parent.parent;
        }
        return ancestors;
    }

    /** Finds the nearest ancestor of the given type. */
    getNearestAncestor<T extends Node>(type: Function): T | undefined {
        return this.getAncestors()?.find(n => n instanceof type) as T ?? undefined;
    }
    
    getDepth() {
        let child: Tree = this;
        let parent: Tree | undefined = this.parent;
        let depth = 0;
        while(parent) {
            depth += parent.node.isBlockFor(child.node) ? 1 : 0;
            child = parent;
            parent = parent.parent;
        }
        return depth;
    }

    /** Recurse up the ancestors, constructing preferred preceding space. */
    getPreferredPrecedingSpace(): string {

        // Start from this node, walking up the ancestor tree
        let leaf: Node = this.node;
        let child: Tree = this;
        let parent = this.parent;
        let space = this.node.getFirstLeaf()?.getPrecedingSpace() ?? "";
        let depth = this.getDepth();
        let preferredSpace = "";
        while(parent) {
            // If the current child's first token is still this, prepend some more space.
            if(child.node.getFirstLeaf() === leaf) {
                // See what space the parent would prefer based on the current space in place.
                preferredSpace = parent.node.getPreferredPrecedingSpace(child.node, space, depth) + preferredSpace;
                child = parent;
                parent = parent.parent;
            }
            // Otherwise, the child was the last parent that could influence space.
            else break;
        }
        return preferredSpace;
    }

    /** A node is in a list if it's parent says so. */
    inList() { return this.getContainingParentList() !== undefined }

    getContainingParentList(before?: boolean): string | undefined {
        const parent = this.getParent();
        if(parent === undefined) return;
        // Loop through each of the fields and see if it contains this node or is delimited by this node.
        // If we find a match, return the field name.
        let previousField = undefined;
        let previousWasList = false;
        for(const name of parent.getChildNames()) {
            const field = (parent as any)[name] as (Node | Node[]);
            // If this field is an array and the field includes this node, we found it!
            if(Array.isArray(field) && field.includes(this.node))
                return name;
            // If this field is this node and the next field is an array, we found it!
            if(before === true && field === this.node && previousWasList)
                return previousField;

            // Remember the last 
            previousField = name;
            previousWasList = Array.isArray(field);
        }
    }

    /** 
     * Recursively constructs a path to this node from it's parents. A path is just a sequence of node constructor and child index pairs. 
     * The node constructor name is for printing and error checking and the number is just the index of the child from getChildren().
     * This is useful for finding corresponding nodes during tree manipulation, where a lot of cloning and reformatting happens.
    */
    getPath(): Path {

        let parent = this.parent;
        if(parent) return [ ... parent.getPath(), [ parent.node.constructor.name, parent.getChildren().indexOf(this), ] ]
        else return [];

    }

    /**
     * Attempts to recursively resolve a path by traversing children.
     */
    resolvePath(path: Path): Node | undefined {

        if(path.length === 0) return this.node;

        const [ type, index ] = path[0];

        // If the type of node doesn't match, this path doesn't resolve.
        return  this.node.constructor.name !== type ? undefined :
                // Otherwise, ask the corresponding child to continue resolving the path, unless there isn't one,
                // in which case the path doesn't resolve.
                this.getChildren()[index]?.resolvePath(path.slice(1));
        
    }
    
}