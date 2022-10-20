import type Node from "../nodes/Node";
import Token from "../nodes/Token";

export default function withPrecedingSpace(node: Node, space: string): Node {

    // Find the first token in the node
    const tokens = node.nodes(n => n instanceof Token) as Token[];
    if(tokens.length === 0) return node;

    const firstToken = tokens[0];
    const newToken = firstToken.withSpace(space);

    return node.clone(firstToken, newToken);

}