import { getContext } from 'svelte';
import type { Writable } from 'svelte/store';
import type Concept from '@concepts/Concept';
import type ConceptIndex from '@concepts/ConceptIndex';
import type { InsertionPoint } from '../editor/Drag';
import type Caret from '../editor/util/Caret';
import type Project from '../../models/Project';
import type Node from '@nodes/Node';
import type Token from '@nodes/Token';
import type Tree from '@nodes/Tree';
import type { Highlights } from '../editor/util/Highlights';

export type CaretContext = Writable<Caret> | undefined;
export const CaretSymbol = Symbol('caret');
export function getCaret() {
    return getContext<CaretContext>(CaretSymbol);
}

export type HoveredContext = Writable<Node | undefined> | undefined;
export const HoveredSymbol = Symbol('hovered');
export function getHovered() {
    return getContext<HoveredContext>(HoveredSymbol);
}

export type InsertionPointContext =
    | Writable<InsertionPoint | undefined>
    | undefined;
export const InsertionPointsSymbol = Symbol('insertions');
export function getInsertionPoint() {
    return getContext<InsertionPointContext>(InsertionPointsSymbol);
}

export type DraggedContext = Writable<Tree | undefined>;
export const DraggedSymbol = Symbol('dragged');
export function getDragged() {
    return getContext<DraggedContext>(DraggedSymbol);
}

export type ProjectContext = Writable<Project | undefined>;
export const ProjectSymbol = Symbol('project');
export function getProject() {
    return getContext<ProjectContext>(ProjectSymbol);
}

export type HighlightContext = Writable<Highlights> | undefined;
export const HighlightSymbol = Symbol('highlight');
export function getHighlights() {
    return getContext<HighlightContext>(HighlightSymbol);
}

export type RootContext = Writable<Tree> | undefined;
export const RootSymbol = Symbol('root');
export function getRoot() {
    return getContext<RootContext>(RootSymbol);
}

export const SpaceSymbol = Symbol('space');
export type SpaceContext = Writable<
    Map<Node, { token: Token; space: string; additional: string }>
>;
export function getSpace() {
    return getContext<SpaceContext>(SpaceSymbol);
}

export const HiddenSymbol = Symbol('hidden');
export type HiddenContext = Writable<Set<Node>>;
export function getHidden() {
    return getContext<HiddenContext>(HiddenSymbol);
}

export const PalettePathSymbol = Symbol('palette-path');
export type PalettePathContext = Writable<Concept[]>;
export function getPalettePath() {
    return getContext<PalettePathContext>(PalettePathSymbol);
}

export const PaletteIndexSymbol = Symbol('palette-index');
export type PaletteIndexContext = Writable<ConceptIndex | undefined>;
export function getPaletteIndex() {
    return getContext<PaletteIndexContext>(PaletteIndexSymbol);
}
