import type Conflict from '@conflicts/Conflict';
import type Definition from './Definition';
import type Context from './Context';
import type Spaces from '@parser/Spaces';
import type Type from './Type';
import type Token from './Token';
import type Locale from '@locale/Locale';
import type { Template, DocText } from '@locale/Locale';
import type { NodeText } from '@locale/NodeText';
import type Glyph from '../lore/Glyph';
import type Purpose from '../concepts/Purpose';
import type { NativeTypeName } from '../native/NativeConstants';
import type Root from './Root';
import type Description from '../locale/Description';
import concretize, { type TemplateInput } from '../locale/concretize';

/* A global ID for nodes, for helping index them */
let NODE_ID_COUNTER = 0;

export type FieldValue = Node | Node[] | undefined;
export type FieldType = undefined | Function | Function[];
export type Field = {
    /** The name of the field, corresponding to a name on the Node class. Redundant with the class, but no reflection in JavaScript. */
    name: string;
    /** A list of possible Node class types that the field may be. Redundant with the class, but no reflection in JavaScript. */
    types: FieldType[];
    /** A description of the field for the UI */
    label?: (
        translation: Locale,
        child: Node,
        context: Context,
        root: Root
    ) => Template;
    /** True if a preceding space is preferred the node */
    space?: boolean | ((node: Node) => boolean);
    /** True if the field should be indented if on a new line */
    indent?: boolean | ((parent: Node, child: Node) => boolean);
    /** True if the field should have newlines */
    newline?: boolean;
    /** Generates a Token of the expected type, if a token is permitted on the field */
    getToken?: (text?: string, op?: string) => Token;
    /** Given a context and an optional index in a list, return a type required for this field. Used to filter autocomplete menus. */
    getType?: (context: Context, index: number | undefined) => Type;
    /** Given a context and an optional prefix, determine definitions are available for this field. Used to populate autocomplete menus. */
    getDefinitions?: (context: Context) => Definition[];
    /** Given position in a field that corresponds to a list, true if something can be inserted at that position.  */
    canInsertAt?: (context: Context, index: number) => boolean;
};

export type Replacement = {
    original: Node | Node[] | string;
    replacement: FieldValue;
};

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

    // PREDICTATES

    isLeaf() {
        return false;
    }
    isPlaceholder() {
        return false;
    }

    // CHILDREN

    /**
     * A list of fields that represent this node's sequence of nodes and the types of nodes allowed on each field.
     */
    abstract getGrammar(): Field[];

    /**
     * A list of names that determine this node's children. Can't extract these through reflection, so they must be manually supplied
     * This is used to get lists of child nodes and to reflect on the role of a child in a parent's structure.
     * */
    getChildNames(): string[] {
        return this.getGrammar().map((field) => field.name);
    }

    /** Returns the children in the node, in order. Needed for batch operations on trees. Cache children to avoid recomputation. */
    getChildren(): Node[] {
        if (this._children === undefined)
            this._children = this.computeChildren();
        return this._children;
    }

    /** Use the subclass's child name list to construct a flat list of nodes. We use this list for tree traversal. */
    computeChildren(): Node[] {
        const children: Node[] = [];
        for (const name of this.getChildNames()) {
            const field = (this as any)[name] as Node | Node[] | undefined;
            if (Array.isArray(field)) {
                for (const item of field) {
                    if (item instanceof Node) children.push(item);
                }
            } else if (field instanceof Node) children.push(field);
        }

        // Assign the children.
        this._children = children;

        return children;
    }

    getFirstLeaf(): Node | undefined {
        if (this.isLeaf()) return this;
        for (const child of this.getChildren()) {
            const leaf = child.getFirstLeaf();
            if (leaf) return leaf;
        }
        return undefined;
    }

    getFirstPlaceholder(): Node | undefined {
        if (this.isPlaceholder()) return this;
        for (const child of this.getChildren()) {
            const placeholder = child.getFirstPlaceholder();
            if (placeholder) return placeholder;
        }
        return undefined;
    }

    /** A depth first traversal of this node and its descendants. Keeps traversing until the inspector returns false. */
    traverse(inspector: (node: Node) => boolean): boolean {
        const every = this.getChildren().every((c) => c.traverse(inspector));
        if (every) inspector.call(undefined, this);
        return every;
    }

    traverseTopDown(sequence: Node[] = []): Node[] {
        sequence.push(this);
        for (const child of this.getChildren()) child.traverseTopDown(sequence);
        return sequence;
    }

    leaves(): Node[] {
        if (this._leaves === undefined) {
            this._leaves = [];
            if (this.isLeaf()) this._leaves.push(this);
            for (const child of this.getChildren())
                for (const leaf of child.leaves()) this._leaves.push(leaf);
        }
        return this._leaves;
    }

    getLeafAfter(node: Node): Node | undefined {
        let found = false;
        for (const n of this.nodes()) {
            if (n === node) found = true;
            else if (found && n.isLeaf()) return n;
        }
        return undefined;
    }

    hash(): string {
        return this.isLeaf()
            ? '' + this.id
            : `•${this.getChildren()
                  .map((n) => n.hash())
                  .join(' ')}•`;
    }

    /** Returns all this and all decedants in depth first order. Optionally uses the given function to decide whether to include a node. */
    nodes(include?: (node: Node) => boolean): Node[] {
        const nodes: Node[] = [];
        this.traverse((node) => {
            if (include === undefined || include.call(undefined, node) === true)
                nodes.push(node);
            return true;
        });
        return nodes;
    }

    find<NodeType extends Node>(type: Function, nth: number = 0) {
        return this.nodes((node) => node instanceof type)[nth] as NodeType;
    }

    /** Finds the descendant of this node (or this node) that has the given ID. */
    getNodeByID(id: number): Node | undefined {
        if (this.id === id) return this;
        const children = this.getChildren();
        for (let i = 0; i < children.length; i++) {
            const match = children[i].getNodeByID(id);
            if (match) return match;
        }
        return undefined;
    }

    /** True if the given nodes appears in this tree. */
    contains(node: Node): boolean {
        // Search for this node.
        return (
            this === node ||
            this.getChildren().some((child) => child.contains(node))
        );
    }

    /** Use the subclass's child name list to construct a flat list of nodes. We use this list for tree traversal. */
    getChildrenAsGrammar(): Record<string, Node | Node[] | undefined> {
        const children: Record<string, Node | Node[] | undefined> = {};
        for (const name of this.getChildNames())
            children[name] = (this as any)[name] as Node | Node[] | undefined;
        return children;
    }

    getFieldOfChild(child: Node): Field | undefined {
        return this.getGrammar().find((field) => {
            const value = (this as any)[field.name];
            return Array.isArray(value)
                ? value.includes(child)
                : value === child;
        });
    }

    hasField(field: string): boolean {
        return this.getChildNames().includes(field);
    }

    getField(field: string): Node | Node[] | undefined {
        if (!this.hasField(field)) return undefined;
        return (this as any)[field] as Node | Node[] | undefined;
    }

    getNodeAfterField(name: string): Node | undefined {
        const grammar = this.getGrammar();
        let found = false;
        for (const f of grammar) {
            if (f.name === name) found = true;
            else if (found) {
                const node = this.getField(f.name);
                if (Array.isArray(node)) {
                    if (node.length > 0) return node[0];
                } else return node;
            }
        }
        return undefined;
    }

    hasList(list: Node[]): boolean {
        return (
            Object.values(this.getChildrenAsGrammar()).includes(list) ||
            this.getChildren().some((c) => c.hasList(list))
        );
    }

    getAllowedFieldNodeTypes(name: string): FieldType[] | undefined {
        let field = this.getGrammar().find((field) => field.name === name);
        if (field === undefined) return undefined;
        else return field.types;
    }

    // CONFLICTS

    /** Given the program in which the node is situated, returns any conflicts on this node that would prevent execution. */
    abstract computeConflicts(context: Context): Conflict[] | void;

    /** Compute and store the conflicts. */
    getConflicts(context: Context): Conflict[] {
        return this.computeConflicts(context) ?? [];
    }

    /** Returns all the conflicts in this tree. */
    getAllConflicts(context: Context): Conflict[] {
        let conflicts: Conflict[] = [];
        this.traverse((node) => {
            const nodeConflicts = node.getConflicts(context);
            if (nodeConflicts !== undefined)
                conflicts = conflicts.concat(nodeConflicts);
            return true;
        });
        return conflicts;
    }

    getParent(context: Context) {
        return context.project.getRoot(this)?.getParent(this);
    }

    // BINDINGS

    /** Get the nearest binding scope of this. */
    getScope(context: Context): Node | undefined {
        return this.getParent(context)?.getScopeOfChild(this, context);
    }

    /** By default, the scope of a child is it's parent's parent. */
    getScopeOfChild(_: Node, context: Context): Node | undefined {
        return this.getParent(context);
    }

    /**
     * Get the Definitions defined specifically by this node.
     */
    getDefinitions(_: Node, __: Context): Definition[] {
        return [];
    }

    /**
     * Get all bindings defined by this node and all binding enclosures.
     * The general sequence should be:
     * 1) All binding enclosures in the Program
     * 2) All borrowed definitions in the Program
     * */
    getDefinitionsInScope(context: Context): Definition[] {
        const cache = context.getDefinitions(this);
        if (cache) return cache;

        let definitions: Definition[] = [];
        // Start with this node and see if it exposes any definitions to itself.
        let scope: Node | undefined = this.getScope(context);
        while (scope !== undefined) {
            // Order matters here: defintions close in the tree have precedent, so they should go first.
            definitions = definitions.concat(
                scope.getDefinitions(this, context)
            );
            // After getting definitions from the scope, get the scope's scope.
            scope = scope.getScope(context);
        }

        // Finally, add project and native level definitions.
        definitions = definitions.concat(
            context.project.getDefaultShares().all
        );

        // Cache the definitions for later.
        context.definitions.set(this, definitions);

        // Return the definitions we found, in order.
        return definitions;
    }

    /**
     * Each node has the option of exposing bindings. By default, nodes expose no bindings.
     **/
    getDefinitionOfNameInScope(
        name: string,
        context: Context
    ): Definition | undefined {
        return this.getDefinitionsInScope(context).find((def) =>
            def.hasName(name)
        );
    }

    /**
     * Return the Definition that this node corresponds to. By default, nothing,
     * but subclasses can override to resolve the definition they correspond to.
     */
    getCorrespondingDefinition(_: Context): Definition | undefined {
        return undefined;
    }

    // MODIFICATION

    /**
     * Creates a clone of this node one one of two modes:
     * 1) which creates a shallow copy that replaces a given node with a replacement, only creating new nodes
     *    that contain the original and preserving all others.
     * 2) deep, which creates a deep copy of the node, with no replacement
     **/
    abstract clone(replace?: Replacement): this;

    replaceChild<Child extends FieldValue>(
        field: keyof this,
        child: Child,
        replace?: Replacement
    ): Child {
        // If there is no replacement, deep clone the child.
        if (replace === undefined)
            return (
                child === undefined
                    ? undefined
                    : Array.isArray(child)
                    ? child.map((c) => c.clone())
                    : child.clone()
            ) as Child;

        // Otherwise, begin the search for the replacement by first destructuring the requested change.
        const { original, replacement } = replace;

        // Let's get the allowed types of the field we're trying to update.
        const allowedTypes = this.getGrammar().find(
            (f) => f.name === field
        )?.types;

        // Bail if the field couldn't be found. This means there's a fatal problem with one of the Node's clone() implementations.
        if (typeof field !== 'string' || allowedTypes === undefined)
            throw Error(
                `Could not find field ${String(field)} on ${
                    this.constructor.name
                }`
            );

        // There are four types of originals to handle. Let's check each for validity.
        // The default of undefined here means that we have not confirmed that the specified field
        // is to be replaced.
        let valid = undefined;

        // Replacement by field name:
        if (typeof original === 'string') {
            // Is this the field we're trying to update?
            if (field === original) {
                // See if the replacement is valid.
                valid = Array.isArray(replacement)
                    ? replacement.every((n) =>
                          Node.nodeIsAllowed(n, allowedTypes)
                      )
                    : Node.nodeIsAllowed(replacement, allowedTypes);
                if (!valid) {
                    console.error(
                        Node.invalidReplacementToString(
                            field,
                            allowedTypes,
                            replacement
                        )
                    );
                    return child as Child;
                }
            }
            // Otherwise, delegate the search to the child below.
        }
        // Replacement by array:
        else if (Array.isArray(original)) {
            // Does this node have the list provided?
            if (child === original) {
                // Verify that the replacement list is valid.
                valid =
                    Array.isArray(replacement) &&
                    replacement.every((r) =>
                        Node.nodeIsAllowed(r, allowedTypes)
                    );
                if (!valid) {
                    console.error(
                        Node.invalidReplacementToString(
                            field,
                            allowedTypes,
                            replacement
                        )
                    );
                    return child as Child;
                }
            }
            // Otherwise, delegate the search to the child below.
        }
        // Replacement by node
        else if (original instanceof Node) {
            // If this is a list, is the child in it?
            if (
                Array.isArray(child) &&
                child.includes(original) &&
                Array.isArray(allowedTypes[0])
            ) {
                // Verify that the replacement node is valid. It can be undefined (which indicates removal) or one of the allowed types.
                valid =
                    replacement === undefined ||
                    Node.nodeIsAllowed(replacement, allowedTypes[0]);
                if (!valid) {
                    console.error(
                        Node.invalidReplacementToString(
                            field,
                            allowedTypes,
                            replacement
                        )
                    );
                    return child as Child;
                }
            }
            // Is this child the node provided?
            else if (child === original) {
                // Verify that the replacement node is valid.
                valid = Node.nodeIsAllowed(replacement, allowedTypes);
                if (!valid) {
                    console.error(
                        Node.invalidReplacementToString(
                            field,
                            allowedTypes,
                            replacement
                        )
                    );
                    return child as Child;
                }
            }
            // Otherwise, delegate the search to the child below.
        }

        // If this child turns out to be the one to replace, and the replacement is valid, return it.
        // If not, see if the existing child contains the original, and if so, delegate replacement to it.
        // Otherwise, leave this child alone.
        if (valid === true) {
            // Is this an array?
            if (Array.isArray(child)) {
                // Are we removing an item?
                if (replacement === undefined)
                    // Create a new list without the item
                    return child
                        .map((c) => (c === original ? undefined : c))
                        .filter((c): c is Node => c !== undefined) as Child;
                // Is the replacement a list? Return the new list.
                else if (Array.isArray(replacement))
                    return replacement as Child;
                // Otherwise, create a new list with the replacement inside it.
                return child.map((c) =>
                    c === original ? replacement : c
                ) as Child;
            }
            // Otherwise, just return the replacement, whatever it is.
            else return replacement as Child;
        }
        // If the child is undefined, no need to search, just return undefined.
        else if (child === undefined) return undefined as Child;
        // If the child is a node and it contains the original node or list
        else if (child instanceof Node) {
            if (
                (original instanceof Node && child.contains(original)) ||
                (Array.isArray(original) && child.hasList(original))
            )
                return child.clone(replace) as Child;
            else return child;
        }
        // If the child is a list and it contains the original node or list
        else {
            const match = child.find(
                (c) =>
                    (original instanceof Node && c.contains(original)) ||
                    (Array.isArray(original) && c.hasList(original))
            );
            if (match)
                return child.map((c) =>
                    c === match ? c.clone(replace) : c
                ) as Child;
            else return child;
        }
    }

    /** A helper function that generates an error message about allowed types on a node. */
    static invalidReplacementToString(
        field: string,
        allowedTypes: FieldType[],
        replacement: FieldValue
    ) {
        return `Attempt to replace list field ${String(
            field
        )} failed because replacement list is not a list or contains invalid items; expected [${allowedTypes
            .map((type) =>
                type instanceof Function
                    ? type.name
                    : Array.isArray(type)
                    ? type.map((type) => type.name)
                    : 'undefined'
            )
            .join(', ')}], but received ${(Array.isArray(replacement)
            ? replacement
            : [replacement]
        )
            .map((n) => n?.constructor.name)
            .join(', ')}`;
    }

    /** A helper functino that checks whether the given node or undefined value is allowed on the specified types */
    static nodeIsAllowed(node: FieldValue, allowedTypes: FieldType[]) {
        return allowedTypes.some(
            (type) =>
                (type instanceof Function && node instanceof type) ||
                (type === undefined && node === undefined) ||
                (Array.isArray(type) &&
                    type.some((listType) => node instanceof listType))
        );
    }

    replace(original: Node | Node[] | string, replacement: FieldValue) {
        return this.clone({ original, replacement });
    }

    // WHITESPACE

    isBlockFor(child: Node) {
        return this.getFieldOfChild(child)?.indent;
    }

    getPreferredPrecedingSpace(
        child: Node,
        space: string,
        depth: number
    ): string {
        const field = this.getFieldOfChild(child);

        if (field === undefined) return '';

        if (field.newline === true) {
            const value = this.getField(field.name);
            if (Array.isArray(value) && child !== value[0]) return '\n';
        }

        if (
            space.indexOf('\n') < 0 &&
            (field.space === true ||
                (typeof field.space === 'function' && field.space(this)))
        ) {
            const value = this.getField(field.name);
            return !Array.isArray(value) || value[0] !== child ? ' ' : '';
        }
        return '';
    }

    // EQUALITY

    /** A node equals another node if its of the same type and its children are equal */
    isEqualTo(node: Node) {
        if (this.constructor !== node.constructor) return false;
        const thisChildren = this.getChildren();
        const thatChildren = node.getChildren();
        if (thisChildren.length !== thatChildren.length) return false;
        for (const [index, child] of thisChildren.entries())
            if (!child.isEqualTo(thatChildren[index])) return false;
        return true;
    }

    // DESCRIPTIONS

    /** Returns a sequence of symbols that represents the personified form of the node */
    abstract getGlyphs(): Glyph;

    /**
     * Given a translation, get the node's static label
     * */
    getLabel(locale: Locale): string {
        return this.getNodeLocale(locale).name;
    }

    /**
     * Given a translation and a context, generate a description of the node.
     * */
    getDescription(locale: Locale, context: Context): Description {
        const trans = this.getNodeLocale(locale);
        return concretize(
            locale,
            trans.description,
            ...this.getDescriptionInputs(locale, context)
        );
    }

    /**
     * Get the list of inputs to give to concretize the description.
     */
    getDescriptionInputs(_: Locale, __: Context): TemplateInput[] {
        return [] as TemplateInput[];
    }

    getDoc(locale: Locale): DocText {
        return this.getNodeLocale(locale).doc;
    }

    /**
     * Provide a category for documentation and any related type that it should be organized within.
     */
    abstract getPurpose(): Purpose;

    getAffiliatedType(): NativeTypeName | undefined {
        return undefined;
    }

    abstract getNodeLocale(translation: Locale): NodeText;

    /** Provide localized labels for any child that can be a placeholder. */
    getChildPlaceholderLabel(
        child: Node,
        translation: Locale,
        context: Context,
        root: Root
    ): Template | undefined {
        const label = this.getFieldOfChild(child)?.label;
        return label ? label(translation, child, context, root) : undefined;
    }

    /** Translates the node back into Wordplay text, using spaces if provided and . */
    toWordplay(spaces?: Spaces, depth?: number): string {
        return this.getChildren()
            .map((child) => {
                // If spaces were provided, just use those.
                if (spaces) return child.toWordplay(spaces);
                // Otherwise, get the preferred space.
                const childInBlock = this.isBlockFor(child);
                const childDepth = (depth ?? 0) + (childInBlock ? 1 : 0);
                const preferred = this.getPreferredPrecedingSpace(
                    child,
                    '',
                    childDepth
                );
                return preferred + child.toWordplay(undefined, childDepth);
            })
            .join('');
    }

    /** A representation for debugging */
    toString(depth: number = 0): string {
        const tabs = '\t'.repeat(depth);
        return `${tabs}${this.constructor.name}\n${this.getChildren()
            .map((n) => n.toString(depth + 1))
            .join('\n')}`;
    }
}
