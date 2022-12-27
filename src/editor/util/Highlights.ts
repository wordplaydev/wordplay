import type Node from "../../nodes/Node";

export const highlightTypes = { 
    "selected": true, 
    "evaluating": true,
    "exception": true,
    "hovered": true,
    "dragged": true,
    "target": true,
    "match": true,
    "primary": true,
    "secondary": true
};
export type HighlightType = keyof typeof highlightTypes;
export type Highlights = Map<Node, Set<HighlightType>>;