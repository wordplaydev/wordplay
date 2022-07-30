import type Bind from "../nodes/Bind";

export default interface StructureDefinitionInterface {
    
    getInputs(): Bind[];
    isInterface(): boolean;

}