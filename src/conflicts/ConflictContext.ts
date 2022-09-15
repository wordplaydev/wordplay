import type NativeInterface from "../native/NativeInterface";
import type Program from "../nodes/Program"
import type Type from "../nodes/Type";
import type Shares from "../runtime/Shares"

export default class ConflictContext {

    program: Program;
    shares?: Shares;
    native?: NativeInterface;
    stack: Node[] = [];
    types: Record<string,Type>[] = [];
    
    constructor(program: Program, shares?: Shares, native?: NativeInterface) {

        this.program = program;
        this.shares = shares;
        this.native = native;
        
    }
    
}