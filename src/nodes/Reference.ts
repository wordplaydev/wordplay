import type Definition from "./Definition";
import type LanguageCode from "./LanguageCode";
import type Node from "./Node";

/** 
 * Represents a reference to definition that could be converted into a node that refers to the name.
 * This is useful in autocompletion for preserving a reference to the structure that might be referred to
 * while also preserving a way to generate the kind of node needed to refer to it.
 **/
export default class Reference<NodeType extends Node> {

    readonly definition: Definition;
    readonly creator: (name: string) => NodeType;

    constructor(definition: Definition, creator: (name: string) => NodeType) {

        this.definition = definition;
        this.creator = creator;

    }

    getNode(language: LanguageCode): NodeType { 
    
        const names = this.definition.getNames();
        return this.creator(this.definition.getNames().find(name => name === language) ?? names[0] ?? "anonymous");
        
    }

}