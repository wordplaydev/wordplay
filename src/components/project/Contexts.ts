import { getContext } from 'svelte';
import type { Readable, Writable } from 'svelte/store';
import type Concept from '@concepts/Concept';
import type ConceptIndex from '@concepts/ConceptIndex';
import type { InsertionPoint } from '../../edit/Drag';
import type Caret from '../../edit/Caret';
import type Project from '@models/Project';
import type Node from '@nodes/Node';
import type Token from '@nodes/Token';
import type { Highlights } from '../editor/util/Highlights';
import type Evaluate from '@nodes/Evaluate';
import type Step from '@runtime/Step';
import type { StreamChange } from '@runtime/Evaluator';
import type Conflict from '@conflicts/Conflict';
import type { Path } from '@nodes/Root';
import type Source from '@nodes/Source';
import type { User } from 'firebase/auth';
import type Evaluator from '@runtime/Evaluator';
import type Locale from '@locale/Locale';
import type Root from '@nodes/Root';
import type {
    CommandContext,
    Edit,
    ProjectRevision,
} from '../editor/util/Commands';
import type { CaretPosition } from '../../edit/Caret';
import type LanguageCode from '../../locale/LanguageCode';

// App related contexts

export const UserSymbol = Symbol('user');
export type UserContext = Writable<User | null>;
export function getUser(): UserContext {
    return getContext(UserSymbol);
}

export const LocalesSymbol = Symbol('locales');
export function getLocales(): Locale[] {
    return getContext(LocalesSymbol);
}

// Project related contexts

export type ProjectContext = Readable<Project | undefined>;
export const ProjectSymbol = Symbol('project');
export function getProject() {
    return getContext<ProjectContext>(ProjectSymbol);
}

export enum IdleKind {
    /** Indicates no keyboard activity. */
    Idle = 'idle',
    /** Indicates active typing (generally a flurry of insertion or deletion) */
    Typing = 'typing',
    /** Indicates a single command that will not come in a flurry  */
    Typed = 'typed',
}

export type KeyboardEditIdleContext = Writable<IdleKind>;
export const KeyboardEditIdleSymbol = Symbol('idle');
export function getKeyboardEditIdle() {
    return getContext<KeyboardEditIdleContext>(KeyboardEditIdleSymbol);
}

export type KeyModifierState = {
    control: boolean;
    alt: boolean;
    shift: boolean;
};
export const KeyModfifierSymbol = Symbol('modifiers');
export function getKeyboardModifiers() {
    return getContext<Writable<KeyModifierState> | undefined>(
        KeyModfifierSymbol
    );
}

export type ProjectCommandContext = Writable<CommandContext>;
export const ProjectCommandContextSymbol = Symbol('projectcommand');
export function getProjectCommandContext() {
    return getContext<ProjectCommandContext>(ProjectCommandContextSymbol);
}

// Evaluation related contexts

export type EvaluatorContext = Readable<Evaluator>;
export const EvaluatorSymbol = Symbol('evaluator');
export function getEvaluator() {
    return getContext<EvaluatorContext>(EvaluatorSymbol);
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
export function getEvaluation(): Writable<EvaluationContext> {
    return getContext(EvaluationSymbol);
}

export const AnimatingNodesSymbol = Symbol('animatingNodes');
export type AnimatingNodesContext = Writable<Set<Node>>;
export function getAnimatingNodes(): AnimatingNodesContext | undefined {
    return getContext(AnimatingNodesSymbol);
}

// Editor related contexts

export type CaretContext = Writable<Caret> | undefined;
export const CaretSymbol = Symbol('caret');
export function getCaret() {
    return getContext<CaretContext>(CaretSymbol);
}

export type EditHandler = (
    edit: Edit | ProjectRevision | undefined,
    idle: IdleKind,
    focus: boolean
) => void;

/** Various components outside the editor use this to apply edits */
export const EditorsSymbol = Symbol('editors');
export type EditorState = {
    caret: Caret;
    edit: EditHandler;
    focused: boolean;
    toggleMenu: () => void;
};
export type EditorsContext = Writable<Map<string, EditorState>>;
export function getEditors() {
    return getContext<EditorsContext>(EditorsSymbol);
}

export type EditorContext = Writable<EditorState>;
export const EditorSymbol = Symbol('editor');
export function getEditor(): EditorContext | undefined {
    return getContext<EditorContext>(EditorSymbol);
}

export const ConflictsSymbol = Symbol('conflicts');
export type ConflictsContext = Writable<Conflict[]>;
export function getConflicts(): ConflictsContext | undefined {
    return getContext(ConflictsSymbol);
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
    return getContext<HiddenContext | undefined>(HiddenSymbol);
}

export const LocalizeSymbol = Symbol('localize');
export function getLocalize() {
    return getContext<Writable<boolean> | undefined>(LocalizeSymbol);
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

export const RootSymbol = Symbol('root');
export type RootContext = Writable<Root | undefined>;
export function getRoot() {
    return getContext<RootContext>(RootSymbol);
}

export const MenuNodeSymbol = Symbol('menu');
export type MenuNodeContext = Writable<CaretPosition | undefined>;
export function getMenuNode() {
    return getContext<MenuNodeContext | undefined>(MenuNodeSymbol);
}

// Output related contexts

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

// Accessibility contexts

// These are lists of announcements rendered invisiblily in the project view
// for screen readers. Children can override by ID to change what's announced.
// This minimizes the number of live regions on the page, increasing the likelihood
// that they're read.
export const AnnouncerSymbol = Symbol('announcer');
export type Announce = (
    id: string,
    language: LanguageCode | undefined,
    message: string
) => void;
export function getAnnounce(): Readable<Announce | undefined> {
    return getContext(AnnouncerSymbol);
}
