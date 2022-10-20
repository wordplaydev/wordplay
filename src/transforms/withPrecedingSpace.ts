import type Node from "../nodes/Node";
import Token from "../nodes/Token";

export default function withPrecedingSpace<NodeType extends Node>(node: NodeType, space: string=" ", exact: boolean=false): NodeType {

    // Find the first token in the node
    const tokens = node.nodes(n => n instanceof Token) as Token[];
    if(tokens.length === 0) return node;

    const firstToken = tokens[0];

    return (exact ? firstToken.space !== space : firstToken.space.length === 0)  ?
        node.clone(false, firstToken, firstToken.withSpace(space)) :
        node;

}

/** Just a simple passthrough utility function to help parameterize calls to this in Node.clone(). */
export function withPrecedingSpaceIfDesired<NodeType extends Node>(desired: boolean, node: NodeType, space: string=" ", exact: boolean=false) {
    return desired ? withPrecedingSpace(node, space, exact) : node;
}