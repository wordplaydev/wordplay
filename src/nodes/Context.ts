import type Node from "./Node";
import type NativeInterface from "../native/NativeInterface";
import type Tree from "./Tree";
import type Project from "../models/Project";
import type Source from "../models/Source";
import type Type from "./Type";
import Expression, { CycleType } from "./Expression";

/** Passed around during type inference and conflict detection to facilitate program analysis and cycle-detection. */
export default class Context {

    readonly project: Project;
    readonly source: Source;
    readonly native: NativeInterface;

    readonly stack: Node[] = [];
    readonly types: Map<Node, Type> = new Map();
    
    constructor(project: Project, source: Source) {

        this.project = project;
        this.source = source;
        this.native = project.getNative();
        
    }

    /** Check the cache for a Tree representing the given node, and set the cache if we haven't checked yet. */
    get(node: Node): Tree | undefined {

        return this.project.get(node);
        
    }

    /** Track cycles during conflict analysis. */
    visit(node: Node) { this.stack.push(node); }
    unvisit() { this.stack.pop();}
    visited(node: Node) { return  this.stack.includes(node); }

    getType(node: Expression) { 
        let cache = this.types.get(node);
        if(cache === undefined) {
            if(this.visited(node))
                cache = new CycleType(node, this.stack.slice(this.stack.indexOf(node)));
            else {
                this.visit(node);
                cache = node.computeType(this);
                this.unvisit();
            }
        }
        return cache;
    }

}