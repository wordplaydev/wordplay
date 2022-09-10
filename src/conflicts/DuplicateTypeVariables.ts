import type StructureDefinition from "../nodes/StructureDefinition";
import type { default as Func } from "../nodes/FunctionDefinition";
import Conflict, { type ConflictExplanations } from "./Conflict";
import type TypeVariable from "../nodes/TypeVariable";


export class DuplicateTypeVariables extends Conflict {

    readonly func: StructureDefinition | Func;
    readonly duplicates: Map<string, TypeVariable[]>;

    constructor(func: StructureDefinition | Func, duplicates: Map<string, TypeVariable[]>) {

        super(false);

        this.func = func;
        this.duplicates = duplicates;

    }

    getConflictingNodes() {
        return Array.from(this.duplicates.values()).flat();
    }

    getExplanations() { 
        return {
            eng: `Duplicate type variables ${Array.from(this.duplicates.values()).flat().map(lang => lang.toWordplay())}.`
        }
    }
}
