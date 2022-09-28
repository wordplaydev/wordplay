import type Node from "./Node";
import type NativeInterface from "../native/NativeInterface";
import type Program from "./Program"
import type Type from "./Type";
import type Shares from "../runtime/Shares"
import type Source from "../models/Source";

/** Passed around during type inference and conflict detection to facilitate program analysis and cycle-detection. */
export default class Context {

    readonly source: Source;
    readonly program: Program;
    readonly shares?: Shares;
    readonly native?: NativeInterface;
    readonly stack: Node[] = [];
    readonly types: Record<string,Type>[] = [];
    
    constructor(source: Source, program: Program, shares?: Shares, native?: NativeInterface) {

        this.source = source;
        this.program = program;
        this.shares = shares;
        this.native = native;
        
    }

    visit(node: Node) { this.stack.push(node); }
    unvisit() { this.stack.pop();}
    visited(node: Node) { return  this.stack.includes(node); }

}