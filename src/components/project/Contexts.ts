import { getContext } from 'svelte';
import type { Readable, Writable } from 'svelte/store';
import type Concept from '@concepts/Concept';
import type ConceptIndex from '@concepts/ConceptIndex';
import type { InsertionPoint } from '../editor/Drag';
import type Caret from '../editor/util/Caret';
import type Project from '@models/Project';
import type Node from '@nodes/Node';
import type Token from '@nodes/Token';
import type { Highlights } from '../editor/util/Highlights';
import type Evaluate from '@nodes/Evaluate';
import type Step from '@runtime/Step';
import type { StreamChange } from '@runtime/Evaluator';
import type Conflict from '@conflicts/Conflict';
import type Projects from '../../db/Projects';
import type { Path } from '@nodes/Root';
import type Source from '@nodes/Source';
import type { User } from 'firebase/auth';
import type Evaluator from '@runtime/Evaluator';
import type Translation from '@translation/Translation';

export type ProjectsContext = Writable<Projects>;
export const ProjectsSymbol = Symbol('projects');
export function getProjects() {
    return getContext<ProjectsContext>(ProjectsSymbol);
}

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

export type DraggedContext = Writable<Node | undefined>;
export const DraggedSymbol = Symbol('dragged');
export function getDragged() {
    return getContext<DraggedContext>(DraggedSymbol);
}

export type ProjectContext = Readable<Project | undefined>;
export const ProjectSymbol = Symbol('project');
export function getProject() {
    return getContext<ProjectContext>(ProjectSymbol);
}

export type EvaluatorContext = Readable<Evaluator>;
export const EvaluatorSymbol = Symbol('evaluator');
export function getEvaluator() {
    return getContext<EvaluatorContext>(EvaluatorSymbol);
}

export type HighlightContext = Writable<Highlights> | undefined;
export const HighlightSymbol = Symbol('highlight');
export function getHighlights() {
    return getContext<HighlightContext>(HighlightSymbol);
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

export const ConceptPathSymbol = Symbol('palette-path');
export type ConceptPathContext = Writable<Concept[]>;
export function getConceptPath() {
    return getContext<ConceptPathContext>(ConceptPathSymbol);
}

export const ConceptIndexSymbol = Symbol('palette-index');
export type ConceptIndexContext = Writable<ConceptIndex | undefined>;
export function getConceptIndex() {
    return getContext<ConceptIndexContext>(ConceptIndexSymbol);
}

export const SelectedOutputPathsSymbol = Symbol('selected-output-paths');
export type SelectedOutputPathsContext = Writable<
    { source: Source | undefined; path: Path | undefined }[]
>;
export function getSelectedOutputPaths():
    | SelectedOutputPathsContext
    | undefined {
    return getContext(SelectedOutputPathsSymbol);
}

export function setSelectedOutput(
    paths: SelectedOutputPathsContext,
    project: Project,
    evaluates: Evaluate[]
) {
    // Map each selected output to its replacement, then set the selected output to the replacements.
    paths.set(
        evaluates.map((output) => {
            return {
                source: project.getSourceOf(output),
                path: project.getRoot(output)?.getPath(output),
            };
        })
    );
}

export const SelectedOutputSymbol = Symbol('selected-output');
export type SelectedOutputContext = Readable<Evaluate[]>;
export function getSelectedOutput(): SelectedOutputContext | undefined {
    return getContext(SelectedOutputSymbol);
}

export const SelectedPhraseSymbol = Symbol('selected-phrase');
export type SelectedPhraseContext = Writable<{
    name: string;
    index: number | null;
} | null>;
export function getSelectedPhrase(): SelectedPhraseContext | undefined {
    return getContext(SelectedPhraseSymbol);
}

/** A collection of state that changes each time the evaluator updates. */
export type EvaluationContext = {
    evaluator: Evaluator;
    playing: boolean;
    step: Step | undefined;
    stepIndex: number;
    streams: StreamChange[];
};
export const EvaluationSymbol = Symbol('evaluation');
export function getEvaluation(): Writable<EvaluationContext> | undefined {
    return getContext(EvaluationSymbol);
}

export const AnimatingNodesSymbol = Symbol('animatingNodes');
export type AnimatingNodesContext = Writable<Set<Node>>;
export function getAnimatingNodes(): AnimatingNodesContext | undefined {
    return getContext(AnimatingNodesSymbol);
}

export const ConflictsSymbol = Symbol('conflicts');
export type ConflictsContext = Writable<Conflict[]>;
export function getConflicts(): ConflictsContext | undefined {
    return getContext(ConflictsSymbol);
}

export const UserSymbol = Symbol('user');
export type UserContext = Writable<User | null>;
export function getUser(): UserContext {
    return getContext(UserSymbol);
}

export const TranslationsSymbol = Symbol('translations');
export function getTranslations(): Translation[] {
    return getContext(TranslationsSymbol);
}

export const DarkSymbol = Symbol('dark');
export function isDark(): Writable<boolean | undefined> {
    return getContext(DarkSymbol);
}
