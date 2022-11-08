import type { Writable } from "svelte/store";
import type Caret from "../models/Caret";
import type Project from "../models/Project";
import type LanguageCode from "../nodes/LanguageCode";
import type Node from "../nodes/Node";

export type CaretContext = Writable<Caret> | undefined;
export const CaretSymbol = Symbol("caret");

export type HoveredContext = Writable<Node | undefined> | undefined;
export const HoveredSymbol = Symbol("hovered");

export type DraggedContext = Writable<Node | undefined>;
export const DraggedSymbol = Symbol("dragged");

export type LanguageContext = Writable<LanguageCode[]>;
export const LanguageSymbol = Symbol("language");

export type ProjectContext = Writable<Project>;
export const ProjectSymbol = Symbol("project");

export type HighlightType = "selection" | "step" | "exception"
export type Highlights = Map<Node, HighlightType>;
export type HighlightContext = Writable<Highlights> | undefined;
export const HighlightSymbol = Symbol("highlight");