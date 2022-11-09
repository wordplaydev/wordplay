import type Node from "../nodes/Node";

export type HighlightType = "selected" | "executing" | "exception" | "hovered" | "dragged" | "target" | "match" | "primary" | "secondary"
export type Highlights = Map<Node, Set<HighlightType>>;