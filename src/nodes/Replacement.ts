import type Reference from "./Reference";
import type Node from "./Node";

type Transform = Node | Node[] | Reference<Node>;

export default Transform;