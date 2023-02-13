import type Node from '@nodes/Node';
import type { Outline } from './outline';

/** Highlight types and whether they are rendered above or below the code. True for above. */
export const HighlightTypes = {
    selected: false,
    evaluating: false,
    exception: true,
    hovered: false,
    dragged: false,
    dragging: false,
    target: true,
    match: true,
    primary: true,
    secondary: true,
    minor: true,
    animating: false,
    output: true,
};
export type HighlightType = keyof typeof HighlightTypes;
export type Highlights = Map<Node, Set<HighlightType>>;
export type HighlightSpec = {
    types: HighlightType[];
    outline: Outline;
    underline: Outline;
};
