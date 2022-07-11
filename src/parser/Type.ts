import Node from "./Node";

export default abstract class Type extends Node {

    constructor() {
        super();
    }

    abstract isCompatible(type: Type): boolean;

}