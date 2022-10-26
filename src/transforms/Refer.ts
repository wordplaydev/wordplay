import type Definition from "../nodes/Definition";

type Refer<NodeType>  = [ ((name: string) => NodeType), Definition ];

export default Refer;