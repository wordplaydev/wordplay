/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type Conflict from '@conflicts/Conflict';
import type Definition from './Definition';
import type Context from './Context';
import type Spaces from '@parser/Spaces';
import type Type from './Type';
import type Token from './Token';
import type { Template, DocText } from '@locale/Locale';
import type { DescriptiveNodeText, NodeText } from '@locale/NodeTexts';
import type Glyph from '../lore/Glyph';
import type Purpose from '../concepts/Purpose';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Root from './Root';
import type { TemplateInput } from '../locale/concretize';
import type Markup from './Markup';
import type Sym from './Sym';
import type Concretizer from './Concretizer';
import type Locales from '../locale/Locales';

/* A global ID for nodes, for helping index them */
let NODE_ID_COUNTER = 0;

export default abstract class Node {
    /* A unique ID to represent this node in memory. */
    readonly id: number;

    /* A cache of the children of this node, in parse order. */
    _children: undefined | Node[] = undefined;

    /** A cache of leaves in this node */
    _leaves: Token[] | undefined = undefined;

    constructor() {
        this.id = NODE_ID_COUNTER++;
    }

    // PREDICTATES

    isLeaf(): this is Token {
        return false;
    }
    isPlaceholder() {
        return false;
    }

    // CHILDREN

    /**
     * A list of fields that represent this node's sequence of nodes and the types of nodes allowed on each field.
     */
    abstract getGrammar(): Grammar;

    /** A stable name by which this kind of node can be referred to (since constructor.name is minified) */
    abstract getDescriptor(): string;

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

    getFirstLeaf(): Token | undefined {
        if (this.isLeaf()) return this;
        for (const child of this.getChildren()) {
            const leaf = child.getFirstLeaf();
            if (leaf) return leaf;
        }
        return undefined;
    }

    getLastLeaf(): Node | undefined {
        const leaves = this.leaves();
        return leaves[leaves.length - 1];
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

    traverseTopDownWithEnterAndExit(sequence: Node[] = []): Node[] {
        sequence.push(this);
        for (const child of this.getChildren())
            child.traverseTopDownWithEnterAndExit(sequence);
        if (!this.isLeaf()) sequence.push(this);
        return sequence;
    }

    leaves(): Token[] {
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

    //filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];

    /** Returns all this and all descendants in depth first order. Optionally uses the given function to decide whether to include a node. */
    nodes<Kind extends Node>(include?: (node: Node) => node is Kind): Kind[] {
        const nodes: Node[] = [];
        this.traverse((node) => {
            if (include === undefined || include(node) === true)
                nodes.push(node);
            return true;
        });
        return nodes as Kind[];
    }

    find<NodeType extends Node>(type: new (...params: any[]) => Node, nth = 0) {
        return this.nodes((node): node is NodeType => node instanceof type)[
            nth
        ] as NodeType;
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

    containsChild(child: Node) {
        return this.getChildren().includes(child);
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

    getFieldNamed(name: string): Field | undefined {
        return this.getGrammar().find((field) => field.name === name);
    }

    getFieldKind(name: string): FieldKind | undefined {
        return this.getFieldNamed(name)?.kind;
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

    /**
     * Get the nearest binding scopes of this node. By default, there is only one,
     * but some nodes can generate multiple scopes (e.g., UnionType).
     */
    getScope(context: Context): Node | undefined {
        return this.getParent(context)?.getScopeOfChild(this, context);
    }

    /**
     * Get any additional basis scope that should be included in definition searches
     * that can't be included because this node already has a scope it returns.
     * This really only applies to StructureType.
     */
    getAdditionalBasisScope(context: Context): Node | undefined {
        return undefined;
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
        // See if this node has any additional basis functions to include.
        let additional = this.getAdditionalBasisScope(context);
        while (scope !== undefined || additional) {
            // Order matters here: defintions close in the tree have precedent, so they should go first.
            if (additional)
                definitions = definitions.concat(
                    additional.getDefinitions(this, context),
                );
            if (scope)
                definitions = definitions.concat(
                    scope.getDefinitions(this, context),
                );
            // Before changing the scope, see if it has any additional basis scope to add.
            additional = scope?.getAdditionalBasisScope(context);
            // After getting definitions from the scope, get the scope's scope.
            scope = scope?.getScope(context);
        }

        // Finally, implicitly include standard libraries and definitions.
        definitions = definitions.concat(
            context.project.getDefaultShares().all,
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
        context: Context,
    ): Definition | undefined {
        return this.getDefinitionsInScope(context).find((def) =>
            def.hasName(name),
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
        replace?: Replacement,
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
        const kind = this.getGrammar().find((f) => f.name === field)?.kind;

        // Bail if the field couldn't be found. This means there's a fatal problem with one of the Node's clone() implementations.
        if (typeof field !== 'string' || kind === undefined)
            throw Error(
                `Could not find field ${String(
                    field,
                )} on ${this.getDescriptor()}`,
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
                valid = kind.allows(replacement);
                if (!valid) {
                    console.error(
                        Node.invalidReplacementToString(
                            field,
                            kind,
                            replacement,
                        ),
                    );
                    return child as Child;
                }
            }
            // Otherwise, delegate the search to the child below.
        }
        // Replace an array with a new array:
        else if (Array.isArray(original)) {
            // Does this node have the list provided?
            if (child === original) {
                // Verify that the replacement list is valid.
                valid = kind.allows(replacement);
                if (!valid) {
                    console.error(
                        Node.invalidReplacementToString(
                            field,
                            kind,
                            replacement,
                        ),
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
                kind instanceof ListOf
            ) {
                // Verify that the replacement node is valid. It can be undefined (which indicates removal) or one of the allowed types.
                valid =
                    replacement === undefined || kind.allowsItem(replacement);
                if (!valid) {
                    console.error(
                        Node.invalidReplacementToString(
                            field,
                            kind,
                            replacement,
                        ),
                    );
                    return child as Child;
                }
            }
            // Is this child the node provided?
            else if (child === original) {
                // Verify that the replacement node is valid.
                valid = kind.allows(replacement);
                if (!valid) {
                    console.error(
                        Node.invalidReplacementToString(
                            field,
                            kind,
                            replacement,
                        ),
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
                    c === original ? replacement : c,
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
                    (Array.isArray(original) && c.hasList(original)),
            );
            if (match)
                return child.map((c) =>
                    c === match ? c.clone(replace) : c,
                ) as Child;
            else return child;
        }
    }

    /** A helper function that generates an error message about allowed types on a node. */
    static invalidReplacementToString(
        field: string,
        kind: FieldKind,
        replacement: FieldValue,
    ) {
        return `Attempt to replace list field ${String(
            field,
        )} failed because replacement list is not a list or contains invalid items; expected ${kind.toString()}, but received ${(Array.isArray(
            replacement,
        )
            ? replacement
            : [replacement]
        )
            .map((n) => n?.constructor.name)
            .join(', ')}`;
    }

    /** Always true, except in Token, which overrids. This helps us aovid importing Token here, creating an import cycle. */
    isSymbol(_: Sym) {
        return false;
    }

    replace(original: Node | Node[] | string, replacement: FieldValue) {
        return this.clone({ original, replacement });
    }

    /** Adjust this node in the requested direction, if that makes sense. By default, do nothing. */
    adjust(direction: -1 | 1): this | undefined {
        return undefined;
    }

    // WHITESPACE

    isBlockFor(child: Node) {
        return this.getFieldOfChild(child)?.indent === true;
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
     * Given a locale, get the node's static label
     * */
    getLabel(locales: Locales): string {
        return this.getNodeLocale(locales).name;
    }

    /**
     * Given a locale and a context, generate a description of the node.
     * */
    getDescription(
        concretizer: Concretizer,
        locales: Locales,
        context: Context,
    ): Markup {
        const text = this.getNodeLocale(locales);
        return concretizer(
            locales,
            // Is there a description? Use that. Otherwise just use the name.
            'description' in text
                ? (text as DescriptiveNodeText).description
                : text.name,
            ...this.getDescriptionInputs(locales, context),
        );
    }

    /**
     * Get the list of inputs to give to concretize the description.
     */
    getDescriptionInputs(_: Locales, __: Context): TemplateInput[] {
        return [];
    }

    getDoc(locales: Locales): DocText {
        return this.getNodeLocale(locales).doc;
    }

    /**
     * Provide a category for documentation and any related type that it should be organized within.
     */
    abstract getPurpose(): Purpose;

    getAffiliatedType(): BasisTypeName | undefined {
        return undefined;
    }

    abstract getNodeLocale(locales: Locales): NodeText | DescriptiveNodeText;

    /** Provide localized labels for any child that can be a placeholder. */
    getChildPlaceholderLabel(
        child: Node,
        locales: Locales,
        context: Context,
        root: Root,
    ): Template | undefined {
        const label = this.getFieldOfChild(child)?.label;
        return label ? label(locales, child, context, root) : undefined;
    }

    /** Translates the node back into Wordplay text, using spaces if provided and . */
    toWordplay(spaces?: Spaces): string {
        return this.getChildren()
            .map((child) => child.toWordplay(spaces))
            .join('');
    }

    /** A representation for debugging */
    toString(depth = 0): string {
        const tabs = '\t'.repeat(depth);
        return `${tabs}${this.getDescriptor()}\n${this.getChildren()
            .map((n) => n.toString(depth + 1))
            .join('\n')}`;
    }
}

export type Field = {
    /** The name of the field, corresponding to a name on the Node class. Redundant with the class, but no reflection in JavaScript. */
    name: string;
    /** A list of possible Node class types that the field may be. Redundant with the class, but no reflection in JavaScript. */
    kind: Any | Empty | ListOf | IsA;
    /** A description of the field for the UI */
    label?: (
        locales: Locales,
        child: Node,
        context: Context,
        root: Root,
    ) => Template;
    /** True if a preceding space is preferred the node */
    space?: boolean | ((node: Node) => boolean);
    /** True if the field should be indented if on a new line */
    indent?: boolean;
    /** True if the field prefers newlines */
    newline?: boolean;
    /** True if the field should have double newlines */
    double?: boolean;
    /** True if the first item in the list should get a newline too */
    initial?: boolean;
    /** True if the token should not be autocompleted */
    uncompletable?: boolean;
    /** Generates a Token of the expected type, if a token is permitted on the field */
    getToken?: (text?: string, op?: string) => Token;
    /** Given a context and an optional index in a list, return a type required for this field. Used to filter autocomplete menus. */
    getType?: (context: Context, index: number | undefined) => Type;
    /** Given a context and an optional prefix, determine definitions are available for this field. Used to populate autocomplete menus. */
    getDefinitions?: (context: Context) => Definition[];
};

/** These types help define a node's grammar at runtime, allowing for a range of rules to be specified about their structure.
 * This helps with edits, autocomplete, spacing rules, and more.
 */
export type FieldValue = Node | Node[] | undefined;

export type NodeKind = Function | Sym | undefined;

/** These classes help encapsulate field definitions for node grammars, centralizing reasoning about validity. */
export abstract class FieldKind {
    abstract allows(value: FieldValue): boolean;
    abstract allowsKind(kind: Function): boolean;
    abstract enumerate(): NodeKind[];
    abstract enumerateFieldKinds(): FieldKind[];
    abstract isOptional(): boolean;
    abstract toString(): string;
}

// A field can be of this type of node or token type.
export class IsA extends FieldKind {
    readonly kind: Function | Sym;
    constructor(kind: Function | Sym) {
        super();
        this.kind = kind;
    }

    /** If this is a function, true if the given value is an instance of this function; if a token type, true if the value is a token of this type. */
    allows(value: FieldValue) {
        return this.kind instanceof Function
            ? value instanceof this.kind
            : value !== undefined &&
                  !Array.isArray(value) &&
                  value.isSymbol(this.kind);
    }

    allowsKind(kind: Function) {
        return (
            this.kind instanceof Function &&
            (kind.prototype instanceof this.kind || kind === this.kind)
        );
    }

    isOptional(): boolean {
        return false;
    }

    enumerate(): NodeKind[] {
        return [this.kind];
    }

    enumerateFieldKinds(): FieldKind[] {
        return [this];
    }

    toString() {
        return this.kind instanceof Function ? this.kind.name : this.kind;
    }
}

// A field can be a list of these node types or token types
export class ListOf extends FieldKind {
    readonly kinds: IsA[];
    readonly allowsEmpty: boolean;
    constructor(allowsEmpty: boolean, ...kinds: IsA[]) {
        super();
        this.allowsEmpty = allowsEmpty;
        this.kinds = kinds;
    }

    /** True if the value is a list and it's contents are valid */
    allows(value: FieldValue): boolean {
        return (
            Array.isArray(value) && value.every((item) => this.allowsItem(item))
        );
    }

    allowsItem(item: FieldValue): boolean {
        return this.kinds.some((kind) => kind.allows(item));
    }

    allowsKind(kind: Function) {
        return this.kinds.some((k) => k.allowsKind(kind));
    }

    allowsUnconditionalNone() {
        return this.kinds.some(
            (kind) => kind instanceof Empty && kind.dependency === undefined,
        );
    }

    isOptional(): boolean {
        return this.kinds.some((kind) => kind.isOptional());
    }

    enumerate(): NodeKind[] {
        return this.kinds.reduce(
            (list, kind) => [...list, ...kind.enumerate()],
            [] as NodeKind[],
        );
    }

    enumerateFieldKinds(): FieldKind[] {
        return [...this.kinds];
    }

    toString() {
        return `a list of ${this.kinds
            .map((kind) => kind.toString())
            .join(', ')}`;
    }
}

// A field can be undefined, and if a dependency field name is specified, only if that field is also undefined.
export class Empty extends FieldKind {
    readonly dependency: string | undefined;
    constructor(dependency?: string) {
        super();
        this.dependency = dependency;
    }

    /** True if the value is undefined */
    allows(value: FieldValue): boolean {
        return value === undefined;
    }

    allowsKind(kind: Function): boolean {
        return false;
    }

    isOptional(): boolean {
        return true;
    }

    enumerate(): NodeKind[] {
        return [undefined];
    }

    enumerateFieldKinds(): FieldKind[] {
        return [this];
    }

    getDependencies(parent: Node, context: Context): Node[] {
        if (this.dependency === undefined) return [];
        const grammar = parent.getGrammar();
        const field = grammar.find((field) => field.name === this.dependency);
        if (field === undefined) return [];
        const dependencies = parent.getField(field.name);
        return dependencies === undefined
            ? []
            : Array.isArray(dependencies)
              ? dependencies
              : [dependencies];
    }

    toString() {
        return `nothing`;
    }
}
export class Any extends FieldKind {
    readonly kinds: (IsA | Empty)[];
    constructor(...kinds: (IsA | Empty)[]) {
        super();
        this.kinds = kinds;
    }

    /** True if any of the kinds allow this value */
    allows(value: FieldValue): boolean {
        return this.kinds.some((kind) => kind.allows(value));
    }

    allowsKind(kind: Function) {
        return this.kinds.some((k) => k.allowsKind(kind));
    }

    isOptional(): boolean {
        return this.kinds.some((kind) => kind.isOptional());
    }

    enumerate(): NodeKind[] {
        return this.kinds.reduce(
            (list, kind) => [...list, ...kind.enumerate()],
            [] as NodeKind[],
        );
    }

    enumerateFieldKinds(): FieldKind[] {
        return [...this.kinds];
    }

    toString() {
        return `one of ${this.kinds.map((kind) => kind.toString()).join(', ')}`;
    }
}

/** These are shorthand functions for making grammars a bit less verbose. */
export function node(kind: Function | Sym) {
    return new IsA(kind);
}
export function none(dependency?: string) {
    return new Empty(dependency);
}
export function list(allowsEmpty: boolean, ...kinds: IsA[]) {
    return new ListOf(allowsEmpty, ...kinds);
}
export function any(...kinds: (IsA | Empty)[]) {
    return new Any(...kinds);
}

export function optional(kind: IsA) {
    return new Any(kind, none());
}

export type Grammar = Field[];

export type Replacement = {
    original: Node | Node[] | string;
    replacement: FieldValue;
};
