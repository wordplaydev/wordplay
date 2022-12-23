import type Conflict from "../conflicts/Conflict";
import type Definition from "./Definition";
import type Context from "./Context";
import type Translations from "./Translations";
import type Spaces from "../parser/Spaces";
import type Type from "./Type";
import type Token from "./Token";

/* A global ID for nodes, for helping index them */
let NODE_ID_COUNTER = 0;

export type NodeType = (undefined | Function | Function[]);
export type Field = { 
    /** The name of the field, corresponding to a name on the Node class. Redundant with the class, but no reflection in JavaScript. */
    name: string, 
    /** A list of possible Node class types that the field may be. Redundant with the class, but no reflection in JavaScript. */
    types: NodeType[],
    /** Generates a Token of the expected type, if a token is permitted on the field */
    getToken?: (text?: string) => Token,
    /** Given a context and an optional index in a list, return a type required for this field. Used to filter autocomplete menus. */
    getType?: (context: Context, index: number | undefined) => Type,
    /** Given a context and an optional prefix, determine definitions are available for this field. Used to populate autocomplete menus. */
    getDefinitions?: (context: Context) => Definition[],
    /** Given position in a field that corresponds to a list, true if something can be inserted at that position.  */
    canInsertAt?: (context: Context, index: number) => boolean
}

export default abstract class Node {

    /* A unique ID to represent this node in memory. */
    readonly id: number;

    /* A cache of the children of this node, in parse order. */
    _children: undefined | Node[] = undefined;

    /** A cache of leaves in this node */
    _leaves: Node[] | undefined = undefined;

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

        // Assign the children.
        this._children = children;

        return children;
    }

    /** Use the subclass's child name list to construct a flat list of nodes. We use this list for tree traversal. */
    getChildrenAsGrammar(): Record<string, Node | Node[] | undefined> {
        const children: Record<string, Node | Node[] | undefined> = {};
        for(const name of this.getChildNames())
            children[name] = (this as any)[name] as (Node | Node[] | undefined);
        return children;
    }
    
    /** Given the program in which the node is situated, returns any conflicts on this node that would prevent execution. */
    abstract computeConflicts(context: Context): Conflict[] | void;

    /**
     * Get all bindings defined by this node.
     */
    getDefinitions(_: Node, __: Context): Definition[] { return []; }
    
    /** 
     * Get all bindings defined by this node and all binding enclosures. 
     * The general sequence should be:
     * 1) All binding enclosures in the Program
     * 2) All borrowed definitions in the Program
     * */
    getAllDefinitions(node: Node, context: Context): Definition[] {

        let definitions: Definition[] = [];
        let current: Node | undefined = this;
        while(current !== undefined) {
            definitions = [ ...current.getDefinitions(node, context), ...definitions ];
            current = context.get(current)?.getBindingScope();
        }
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
            current = context.get(current)?.getBindingScope();
        }

        // If we didn't find anything, check the default shares and then the project's implicitly shared streams.
        return context.project.getDefaultShares().find(def => def.hasName(name)) ?? context.project.getImplicitlySharedStream(name);

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
            current = context.get(current)?.getBindingScope();
        }
        return definitions;

    }

    /** Compute and store the conflicts. */
    getConflicts(context: Context): Conflict[] { 
        return this.computeConflicts(context) ?? [];
    }
    
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

    /** True if the given node is a child of this node and this node should act as a binding enclosure of it. */
    isBindingEnclosureOfChild(_: Node): boolean { return false; }

    toString(depth: number=0): string {
        const tabs = "\t".repeat(depth);
        return `${tabs}${this.constructor.name}\n${this.getChildren().map(n => n.toString(depth + 1)).join("\n")}`;
    }

    /** Translates the node back into Wordplay text, using spaces if provided and . */
    toWordplay(spaces?: Spaces): string { return this.getChildren().map(t => t.toWordplay(spaces)).join(""); }

    /** A depth first traversal of this node and its descendants. Keeps traversing until the inspector returns false. */
    traverse(inspector: (node: Node) => boolean): boolean {
        const every = this.getChildren().every(c => c.traverse(inspector));
        if(every)
            inspector.call(undefined, this);
        return every;
    }

    traverseTopDown(sequence: Node[] = []): Node[] {
        sequence.push(this);
        for(const child of this.getChildren())
            child.traverseTopDown(sequence);
        return sequence;
    }

    leaves(): Node[] {
        if(this._leaves === undefined) {
            this._leaves = [];
            if(this.isLeaf()) this._leaves.push(this);
            for(const child of this.getChildren())
                for(const leaf of child.leaves())
                    this._leaves.push(leaf);
        }
        return this._leaves;
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

    /** True if the given nodes appears in this tree. */
    contains(node: Node): boolean {

        // Search for this node.
        return this === node || this.getChildren().some(child => child.contains(node));

    }

    /** Creates a deep clone of this node and it's descendants. If it encounters replacement along the way, it uses that instead of the existing node. */
    abstract replace(original?: Node | Node[] | string, replacement?: Node | Node[] | undefined): this;

    replaceChild<ChildType extends Node | Node[] | undefined>(field: keyof this, child: ChildType, original: Node | string | undefined, replacement: Node | undefined): ChildType {

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

                    // Replace the item in the list.
                    return newList.map(child => child === replacement ? replacement : child) as ChildType;

                }
                else throw Error(`Somehow didn't find index of original in child. This shouldn't be possibe.`);
                
            }
            else return replacement as ChildType;
        }

        // If we didn't find a match above, just return the existing list or child.
        // If the child we're trying to replace is an array, map the existing array onto existing values or a replacement.
        if(Array.isArray(child))
            return child.map(n => original instanceof Node && n.contains(original) ? n.replace(original, replacement) : n) as ChildType
        // If it's not an array, try replacing the original in the child if it's a Node
        else
            return (child && original instanceof Node && child.contains(original) ? child.replace(original, replacement) : child) as ChildType;

    }

    getPreferredPrecedingSpace(child: Node, space: string, depth: number): string { child; space; depth; return ""; }
    
    getFirstLeaf(): Node | undefined {
        if(this.isLeaf()) return this;
        for(const child of this.getChildren()) {
            const leaf = child.getFirstLeaf();
            if(leaf) return leaf;
        }
        return undefined;
    }

    isLeaf() { return false; }
    isBlockFor(_: Node) { return false; }

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

    getFirstPlaceholder(): Node | undefined {
        for(const child of this.getChildren()) {
            const placeholder = child.getFirstPlaceholder();
            if(placeholder)
                return placeholder;
        }
        return undefined;
    }

    abstract getDescriptions(context: Context): Translations;

    /** Provide localized labels for any child that can be a placeholder. */
    getChildPlaceholderLabel(child: Node, context: Context): Translations | undefined { child; context; return undefined; }

}