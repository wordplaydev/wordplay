import type Node from "../nodes/Node";
import Token from "../nodes/Token";

export default function withPrecedingSpace<NodeType extends Node>(node: NodeType, space: string=" ", exact: boolean=false): NodeType {

    // Find the first token in the node
    const tokens = node.nodes(n => n instanceof Token) as Token[];
    if(tokens.length === 0) return node;

    const firstToken = tokens[0];

    return (exact ? firstToken.space !== space : firstToken.space.length === 0)  ?
        node.clone(firstToken, firstToken.withSpace(space)) :
        node;

}