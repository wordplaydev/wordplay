import type Conflict from "../conflicts/Conflict";
import type Definition from "./Definition";
import type Context from "./Context";
import type Transform from "../transforms/Transform";
import type Translations from "./Translations";

/* A global ID for nodes, for helping index them */
let NODE_ID_COUNTER = 0;

export type Path = [ string, number ][];
export type NodeType = (undefined | Function | Function[]);
export type Field = { name: string, types: NodeType[] }

export default abstract class Node {

    /* A unique ID to represent this node in memory. */
    readonly id: number;

    /* A cache of the children of this node, in parse order. */
    _children: undefined | Node[] = undefined;

    /* A cache of this node's parent. Undefined means no cache, null means no parent. */
    _parent: undefined | Node = undefined;

    /** A cache of conflicts on this node. Undefined means no cache. */
    _conflicts: undefined | Conflict[] = undefined;

    constructor() {
        this.id = NODE_ID_COUNTER++;
    }

    /**
     * A list of fields that represent this node's sequence of nodes and the types of nodes allowed on each field.
     */
    abstract getGrammar(): Field[];

    /**
     * A list of names that determine this node's children. Can't extract these through reflection, so they must be manually supplied 
     * This is used to get lists of child nodes and to reflect on the role of a child in a parent's structure.
     * */
    getChildNames(): string[] { return this.getGrammar().map(field => field.name )}

    /** Returns the children in the node, in order. Needed for batch operations on trees. Cache children to avoid recomputation. */
    getChildren(): Node[] {
        if(this._children === undefined)
            this._children = this.computeChildren();
        return this._children;
    }

    /** Use the subclass's child name list to construct a flat list of nodes. We use this list for tree traversal. */
    computeChildren(): Node[] {

        const children: Node[] = [];
        for(const name of this.getChildNames()) {
            const field = (this as any)[name] as (Node | Node[] | undefined);
            if(Array.isArray(field)) {
                for(const item of field) {
                    if(item instanceof Node)
                        children.push(item);
                }
            }
            else if(field instanceof Node)
                children.push(field);
        }

        // Claim each child
        for(const child of children) {
            if(child._parent !== undefined) {
                console.error(`${child.constructor.name} already has parent of type ${child._parent.constructor.name} ${child._parent.id}, but setting to ${this.constructor.name} ${this.id}. Clone before setting.`);
                console.trace();
            }
            child._parent = this;
        }

        // Assign the children.
        this._children = children;

        return children;
    }

    /** Given the program in which the node is situated, returns any conflicts on this node that would prevent execution. */
    abstract computeConflicts(context: Context): Conflict[] | void;

    /**
     * Get all bindings defined by this node.
     */
    getDefinitions(node: Node, context: Context): Definition[] { context; node; return []; }
    
    /** Get all bindings defined by this node and all binding enclosures. */
    getAllDefinitions(node: Node, context: Context): Definition[] {

        let definitions: Definition[] = [];
        let current: Node | undefined = this;
        while(current !== undefined) {
            definitions = [ ...current.getDefinitions(node, context), ...definitions ];
            current = current.getBindingEnclosureOf();
        }

        definitions = [ ...context.shares?.getDefinitions() ?? [], ...definitions ];
        return definitions;

    }

    /** 
     * Each node has the option of exposing bindings. By default, nodes expose no bindings.
     **/
    getDefinitionOfName(name: string, context: Context, node: Node): Definition | undefined {
        
        let current: Node | undefined = this;
        while(current !== undefined) {
            const def = current.getDefinitions(node, context).find(def => def.hasName(name));
            if(def !== undefined) return def;
            current = current.getBindingEnclosureOf();
        }

        // Check the defaults.
        return context.shares?.getDefaultDefinition(name);

    };
    
    /**
     * Gathers all matching definitions in scope, useful for checking for duplicate bindings.
     */
    getAllDefinitionsOfName(name: string, context: Context, node: Node): Definition[] {

        const definitions = [];
        let current: Node | undefined = this;
        while(current !== undefined) {
            const definition = current.getDefinitionOfName(name, context, node);
            if(definition !== undefined)
                definitions.unshift(definition);
            current = current.getBindingEnclosureOf();
        }
        return definitions;

    }

    /** Compute and store the conflicts. */
    getConflicts(context: Context) { 
        if(this._conflicts === undefined)
            this._conflicts = this.computeConflicts(context) ?? [];
        return this._conflicts;
    }

    getConflictCache() { return this._conflicts === undefined ? [] : this._conflicts; }
    
    /** Returns all the conflicts in this tree. */
    getAllConflicts(context: Context): Conflict[] {
        let conflicts: Conflict[] = [];
        this.traverse(node => {
            const nodeConflicts = node.getConflicts(context);
            if(nodeConflicts !== undefined)
                conflicts = conflicts.concat(nodeConflicts);
            return true;
        });
        return conflicts;
    }

    /** Get the binding enclosure of this node by recursively asking ancestors if they are binding enclosures of the given node. */
    getBindingEnclosureOf(): Node | undefined {
        return this._parent instanceof Node ?
            (this._parent.isBindingEnclosureOfChild(this) ? this._parent : this._parent.getBindingEnclosureOf()) :
            undefined;
    }

    /** True if the given node is a child of this node and this node should act as a binding enclosure of it. */
    isBindingEnclosureOfChild(child: Node): boolean { child; return false; }

    toString(depth: number=0): string {
        const tabs = "\t".repeat(depth);
        return `${tabs}${this.constructor.name}\n${this.getChildren().map(n => n.toString(depth + 1)).join("\n")}`;
    }

    /** Translates the node back into text, preserving all whitespace and characters. */
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

    /** Returns a list of ancestors, with the parent as the first item in the list and the root as the last. */
    getAncestors(): Node[] {

        const ancestors = [];
        let parent = this._parent;
        while(parent) {
            ancestors.push(parent);
            parent = parent._parent;
        }
        return ancestors;

    }

    /** Finds the nearest ancestor of the given type. */
    getNearestAncestor<T extends Node>(type: Function): T | undefined {
        return this.getAncestors()?.find(n => n instanceof type) as T ?? undefined;
    }

    /** Returns the cached parent of the given node, set by computeChildren after each node is constructed. */
    getParent(): Node | undefined {
        return this._parent;
    }

    /** Returns the root of this node. */
    getRoot(): Node {
        return this._parent ? this._parent.getRoot() : this;
    }

    /** 
     * Recursively constructs a path to this node from it's parents. A path is just a sequence of node constructor and child index pairs. 
     * The node constructor name is for printing and error checking and the number is just the index of the child from getChildren().
     * This is useful for finding corresponding nodes during tree manipulation, where a lot of cloning and reformatting happens.
    */
    getPath(): Path {

        let parent = this.getParent();
        if(parent) return [ ... parent.getPath(), [ parent.constructor.name, parent.getChildren().indexOf(this), ] ]
        else return [];

    }

    /**
     * Attempts to recursively resolve a path by traversing children.
     */
    resolvePath(path: Path): Node | undefined {

        if(path.length === 0) return this;

        const [ type, index ] = path[0];

        // If the type of node doesn't match, this path doesn't resolve.
        return  this.constructor.name !== type ? undefined :
                // Otherwise, ask the corresponding child to continue resolving the path, unless there isn't one,
                // in which case the path doesn't resolve.
                this.getChildren()[index]?.resolvePath(path.slice(1));
        
    }

    /** True if the given nodes appears in this tree. */
    contains(node: Node) {

        // Strategy: scan the given node's ancestors to see if this is one.
        let parent: undefined | null | Node = node;
        while(parent !== null && parent !== undefined) {
            if(parent === this) return true;
            parent = parent._parent;
        }
        return false;

    }

    whitespaceContainsPosition(index: number): boolean {
        const children = this.getChildren();
        return children.length > 0 && children[0].whitespaceContainsPosition(index);
    }

    /** Creates a deep clone of this node and it's descendants. If it encounters replacement along the way, it uses that instead of the existing node. */
    abstract clone(pretty: boolean, original?: Node | Node[] | string, replacement?: Node | Node[] | undefined): this;

    cloneOrReplaceChild<ExpectedTypes>(pretty: boolean, field: keyof this, child: Node | Node[] | undefined, original: Node | string | undefined, replacement: Node | undefined): ExpectedTypes {

        function allowedToString(allowedTypes: (Function | Function[] | undefined)[]) {
            return `[${allowedTypes.map(type => type instanceof Function ? type.name : Array.isArray(type) ? type.map(type => type.name) : "undefined").join(", ")}]`;
        }

        function isAllowed(node: Node | undefined, allowedTypes: (Function | Function[] | undefined)[]) {
            return allowedTypes.some(type => 
                (type instanceof Function && node instanceof type) || 
                (type === undefined && node === undefined) || 
                (Array.isArray(type) && type.some(listType => node instanceof listType)));
        }

        // If we're replacing something --- defined by either the original or replacement being undefined ---
        // and one of three cases is true: 1) we're replacing the field name, 2) we're replacing a child of this onde, 3) we're replacing a child in a list of this node
        // then verify the replacemen type and return the replacement instead of a clone of the original child.
        if((original !== undefined || replacement !== undefined) && (typeof original === "string" && original === field) || child === original || (Array.isArray(child) && original instanceof Node && child.includes(original))) {

            // Find the types expected for this field
            const allowedTypes = this.getGrammar().find(child => child.name === field)?.types;

            if(allowedTypes === undefined)
                throw Error(`Couldn't find allowed types of field ${field.toString()}`);
            else if(Array.isArray(child) && Array.isArray(replacement) && Array.isArray(allowedTypes[0])) {
                const listTypes = allowedTypes[0];
                if(Array.isArray(listTypes) && !replacement.every(node => listTypes.find(type => type !== undefined && node instanceof type) !== undefined))
                    throw Error(`Replacement list contains an element of an invalid type. Expected ${allowedToString(allowedTypes)}, but received ${replacement.map(n => n.constructor.name).join(", ")}`);
            }
            else if((!Array.isArray(child) || replacement !== undefined) && !isAllowed(replacement, allowedTypes))
                throw Error(`Replacement isn't of a valid type. Received ${replacement?.constructor.name}, expected ${allowedToString(allowedTypes)}`);
            
            // If the child we're replacing is an array but the original is a single node, either replace or remove the original.
            if(Array.isArray(child) && original instanceof Node) {
                const index = child.indexOf(original);
                const newList: Node[] = child.slice();
                if(index >= 0) {
                    // If the replacement is undefined, remove it from the list.
                    if(replacement === undefined)
                        newList.splice(index, 1);
                    // Otherwise replace it.
                    else 
                        newList[index] = replacement;

                    // Clone everything in the list except for the replacement to ensure that the tree is fresh
                    return newList.map(child => child === replacement ? replacement : child.clone(false)) as ExpectedTypes;

                }
                else throw Error(`Somehow didn't find index of original in child. This shouldn't be possibe.`);
                
            }
            else return replacement as ExpectedTypes;
        }

        // Otherwise, just clone the child. If it's a list, clone the list items.
        if(Array.isArray(child))
            return child.map(n => n.clone(pretty, original, replacement)) as ExpectedTypes
        else       
            return child?.clone(pretty, original, replacement) as ExpectedTypes;

    }

    withPrecedingSpaceIfDesired(desired: boolean, space: string=" ", exact: boolean=false) {
        return desired ? this.withPrecedingSpace(space, exact) : this;
    }

    withPrecedingSpace(space: string=" ", exact: boolean=false): this {

        // Get the first leaf in this node.
        const firstLeaf = this.getFirstLeaf();
        if(firstLeaf === undefined) return this;
        // Clone this node, replacing the first leaf with one with space
        else return this.clone(false, firstLeaf, firstLeaf.withPrecedingSpace(space, exact));

    }

    getPrecedingSpace(): string {
        const children = this.getChildren();
        if(children.length === 0) return "";
        return children[0].getPrecedingSpace();
    }

    /** By default, there is no preferred space for a node. */
    getPreferredPrecedingSpace(child: Node, space: string): string { child; space; return ""; }

    getFirstLeaf(): Node | undefined {
        if(this.isLeaf()) return this;
        for(const child of this.getChildren()) {
            const leaf = child.getFirstLeaf();
            if(leaf) return leaf;
        }
        return undefined;
    }

    isLeaf() { return false; }
    isBlock() { return false; }

    getDepth() { 
        return this.getAncestors().filter(node => node.isBlock()).length;
    }

    getContainingParentList(): string | undefined {
        const parent = this.getParent();
        if(parent) {
            for(const name of parent.getChildNames()) {
                const field = (parent as any)[name] as (Node | Node[]);
                if(Array.isArray(field) && field.includes(this))
                    return name;
            }
        }
    }

    hasField(field: string): boolean {
        return this.getChildNames().includes(field);
    }

    getField(field: string): Node | Node[] | undefined {

        if(!this.hasField(field)) return undefined;
        return (this as any)[field] as Node | Node[] | undefined;

    }

    getAllowedFieldNodeTypes(name: string): NodeType[] | undefined {
        let field = this.getGrammar().find(field => field.name === name);
        if(field === undefined) return undefined;
        else return field.types;
    }

    /** A node is in a list if it's parent says so. */
    inList() { return this.getContainingParentList() !== undefined }

    getFirstPlaceholder(): Node | undefined {
        for(const child of this.getChildren()) {
            const placeholder = child.getFirstPlaceholder();
            if(placeholder)
                return placeholder;
        }
        return undefined;
    }

    abstract getDescriptions(context: Context): Translations;

    abstract getChildReplacement(child: Node, context: Context): Transform[] | undefined;
    abstract getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined;
    abstract getInsertionAfter(context: Context, position: number): Transform[] | undefined;
    abstract getChildRemoval(child: Node, context: Context): Transform | undefined;
    
    /** Provide localized labels for any child that can be a placeholder. */
    getChildPlaceholderLabel(child: Node, context: Context): Translations | undefined { child; context; return undefined; }

}