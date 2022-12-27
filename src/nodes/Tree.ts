import Source from "../models/Source";
import Expression from "./Expression";
import type Node from "./Node";
import type Token from "./Token";

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

    readonly node: Node;
    readonly parent: Tree | undefined;
    readonly source: Source | undefined;

    _children: Tree[] | undefined = undefined;

    _spaceRoot: Node | undefined | null = null;

    public constructor (node: Node, parent?: Tree) {

        this.parent = parent;
        this.node = node;
        
        const root = this.getRoot();
        this.source = root instanceof Source ? root : undefined;

    }

    getParent(): Node | undefined { return this.parent?.node; }

    /** Returns the root of this node. */
    getRoot(): Node {
        return this.parent ? this.parent.getRoot() : this.node;
    }

    isRoot() { return this.parent === undefined; }
    
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

    getSelfAndAncestors(): Node[] {
        const ancestors = this.getAncestors();
        ancestors.unshift(this.node);
        return ancestors;
    }

    /** Returns the nearest evaluation root, which is the closest ancestor for which isEvaluating() is true. */
    getEvaluationRoot() {
        return this.getAncestors().find(ancestor => ancestor instanceof Expression && ancestor.isEvaluationRoot()) as Expression | undefined;
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
        let firstToken = this.node.getFirstLeaf() as Token | undefined;
        let space = this.source && firstToken ? this.source.spaces.getSpace(firstToken) : "";
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

    /** Get the highest ancestor of this node's first token. */
    getSpaceRoot() {

        // If not cached, compute.
        if(this._spaceRoot === null) {

            // Find the first leaf of this node.
            let token = this.node.getFirstLeaf();

            // If there isn't one, this has no space root.
            if(token === undefined) return undefined;

            // Start by assuming the space root is the token itself.
            let root: Node = token;
            // Iterate up the ancestor ladder while the ancestor's first leaf is still the token.
            // Stop when it is not.
            for(const ancestor of this.get(token)?.getAncestors() ?? []) {
                // If the first leaf of this ancestor is the token, then it's a possible root.
                if(ancestor.getFirstLeaf() === token) root = ancestor;
                // Otherwise, stop.
                else break;
            }

            this._spaceRoot = root;

        }
        return this._spaceRoot;

    }
    
}