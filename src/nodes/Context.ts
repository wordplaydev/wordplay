import type Node from './Node';
import type Project from '../models/Project';
import type Source from './Source';
import type Type from './Type';
import type Expression from './Expression';
import CycleType from './CycleType';
import type Reference from './Reference';
import type PropertyReference from './PropertyReference';
import type Definition from './Definition';
import type StreamDefinition from './StreamDefinition';

/** Passed around during type inference and conflict detection to facilitate program analysis and cycle-detection. */
export default class Context {
    readonly project: Project;
    readonly source: Source;

    readonly stack: Node[] = [];
    readonly types: Map<Node, Type> = new Map();

    /**
     * This is a record of the guarded types of references and property references during evaluation,
     * used by Reference, PropertyReference, ListAccess, and SetOrMapAccess to remember
     * the narrowed types of their referenced bindings. We organize these by string keys representing
     * some expression on which the reference is guarded. For regular References or PropertyReferences,
     * there is only one key, but for List, Set, and Map references, there is a list index or key.
     */
    readonly referenceUnions: Map<
        PropertyReference | Reference,
        Map<string, Type>
    > = new Map();

    readonly definitions: Map<Node, Definition[]> = new Map();

    readonly streamTypes: Map<Type, StreamDefinition> = new Map();

    constructor(project: Project, source: Source) {
        this.project = project;
        this.source = source;
    }

    getRoot(node: Node) {
        return this.project.getRoot(node);
    }

    getBasis() {
        return this.project.basis;
    }

    /** Track cycles during conflict analysis. */
    visit(node: Node) {
        this.stack.push(node);
    }
    unvisit() {
        this.stack.pop();
    }
    visited(node: Node) {
        return this.stack.includes(node);
    }

    getType(node: Expression) {
        let cache = this.types.get(node);
        if (cache === undefined) {
            if (this.visited(node)) {
                cache = new CycleType(
                    node,
                    this.stack.slice(this.stack.indexOf(node)),
                );
            } else {
                this.visit(node);
                cache = node.computeType(this);
                this.unvisit();
            }
        }
        return cache;
    }

    getDefinitions(node: Node) {
        return this.definitions.get(node);
    }

    getReferenceType(
        ref: Reference | PropertyReference,
        key: string,
    ): Type | undefined {
        const keys = this.referenceUnions.get(ref);
        return keys ? keys.get(key) : undefined;
    }

    setReferenceType(
        ref: Reference | PropertyReference,
        key: string,
        type: Type,
    ) {
        const keys = this.referenceUnions.get(ref) ?? new Map<string, Type>();
        keys.set(key, type);
        return this.referenceUnions.set(ref, keys);
    }

    setStreamType(type: Type, stream: StreamDefinition) {
        this.streamTypes.set(type, stream);
    }

    getStreamType(type: Type): StreamDefinition | undefined {
        return this.streamTypes.get(type);
    }
}
