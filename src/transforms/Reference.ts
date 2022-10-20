import type Definition from "../nodes/Definition";

type Reference<NodeType>  = [ ((name: string) => NodeType), Definition ];

export default Reference;