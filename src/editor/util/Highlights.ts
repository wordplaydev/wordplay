import type Node from "../../nodes/Node";
import type { Outline } from "./outline";

export const highlightTypes = { 
    "selected": true, 
    "evaluating": true,
    "exception": true,
    "hovered": true,
    "dragged": true,
    "dragging": true,
    "target": true,
    "match": true,
    "primary": true,
    "secondary": true,
    "minor": true,
};
export type HighlightType = keyof typeof highlightTypes;
export type Highlights = Map<Node, Set<HighlightType>>;
export type HighlightSpec = { types: HighlightType[], outline: Outline, underline: Outline };