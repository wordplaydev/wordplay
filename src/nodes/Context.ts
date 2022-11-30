import type Node from "./Node";
import type NativeInterface from "../native/NativeInterface";
import type Type from "./Type";
import type Shares from "../runtime/Shares"
import type Source from "../models/Source";
import Tree from "./Tree";
import { DefaultTrees } from "../runtime/Shares";
import Native from "../native/NativeBindings";
import type Project from "../models/Project";

/** Passed around during type inference and conflict detection to facilitate program analysis and cycle-detection. */
export default class Context {

    readonly project: Project;
    readonly source: Source;
    readonly native: NativeInterface;
    readonly shares: Shares;

    readonly stack: Node[] = [];
    readonly types: Record<string,Type>[] = [];
    readonly trees: Tree[];
    
    readonly _index: Map<Node,Tree | undefined> = new Map();

    constructor(project: Project, source: Source, shares: Shares) {

        this.project = project;
        this.source = source;
        this.native = Native;
        this.shares = shares;

        // Build all of the trees we might need for analysis.
        this.trees = [
            new Tree(source.program),
            ...Native.getStructureDefinitionTrees(),
            ...DefaultTrees
        ]
        
    }

    /** Check the cache for a Tree representing the given node, and set the cache if we haven't checked yet. */
    get(node: Node, checkProject: boolean = true): Tree | undefined {

        if(!this._index.has(node)) 
            this._index.set(node, this.resolve(node, checkProject));
        return this._index.get(node);
    }

    /** Get a tree that that represents the node. It could be in a program, one of the native types, or a share. */
    resolve(node: Node, checkProject: boolean): Tree | undefined {

        // Search the trees in the context for a matching node.
        for(const tree of this.trees) {
            const match = tree.get(node);
            if(match) return match;
        }

        // See if there are any matching trees in the other source files in the project.
        if(checkProject) {
            for(const source of this.project.getSources()) {
                if(source !== this.source) {
                    const match = this.project.getSourceContext(source)?.get(node, false);
                    if(match) return match;
                }
            }
        }

        return undefined;

    }

    /** Track cycles during conflict analysis. */
    visit(node: Node) { this.stack.push(node); }
    unvisit() { this.stack.pop();}
    visited(node: Node) { return  this.stack.includes(node); }

}